import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { initiatePayment, isMock } from "@/lib/easebuzz";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const { planId } = await req.json();
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const txnid = `NT${Date.now()}${crypto.randomBytes(3).toString("hex")}`;
  const amount = (plan.priceInPaise / 100).toFixed(2);
  const productinfo = `NewsTrail ${plan.name} Subscription`;

  // Create payment + pending subscription linked together
  const payment = await prisma.payment.create({
    data: {
      userId: dbUser.id,
      amountInPaise: plan.priceInPaise,
      txnid,
      productinfo,
      status: "INITIATED",
      subscription: {
        create: {
          userId: dbUser.id,
          planId: plan.id,
          status: "PENDING",
        },
      },
    },
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const surl = `${appUrl}/api/payment/callback`;
  const furl = `${appUrl}/api/payment/callback`;

  // Mock mode: skip the real gateway, send the user to a local simulator page.
  if (isMock()) {
    return NextResponse.json({ payUrl: `${appUrl}/payment/mock?txnid=${txnid}` });
  }

  try {
    const payUrl = await initiatePayment({
      txnid,
      amount,
      productinfo,
      firstname: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone || "9999999999",
      surl,
      furl,
    });
    return NextResponse.json({ payUrl });
  } catch (err) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    const message =
      err instanceof Error ? err.message : "Could not start payment. Check Easebuzz keys.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
