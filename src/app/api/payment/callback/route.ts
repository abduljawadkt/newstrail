import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyResponseHash } from "@/lib/easebuzz";
import { activateSubscription } from "@/lib/subscription";

export const runtime = "nodejs";

/**
 * Easebuzz redirects the browser here with a POST (form-encoded) after payment.
 * We verify the response hash before trusting anything, then redirect the user
 * to a status page.
 */
export async function POST(req: Request) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const form = await req.formData();
  const body: Record<string, string> = {};
  form.forEach((v, k) => (body[k] = typeof v === "string" ? v : ""));

  const txnid = body.txnid;
  const statusPage = (ok: boolean, tx?: string) =>
    NextResponse.redirect(`${appUrl}/payment/status?txnid=${tx ?? ""}&ok=${ok ? 1 : 0}`, 303);

  if (!txnid) return statusPage(false);

  const payment = await prisma.payment.findUnique({
    where: { txnid },
    include: { subscription: true },
  });
  if (!payment) return statusPage(false, txnid);

  // Verify authenticity
  const valid = verifyResponseHash(body);
  if (!valid) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", rawResponse: body },
    });
    return statusPage(false, txnid);
  }

  const success = (body.status || "").toLowerCase() === "success";

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: success ? "SUCCESS" : "FAILED",
      easebuzzId: body.easepayid || body.bank_ref_num || null,
      rawResponse: body,
    },
  });

  if (success) {
    await activateSubscription(payment.id);
  } else if (payment.subscription) {
    await prisma.subscription.update({
      where: { id: payment.subscription.id },
      data: { status: "CANCELLED" },
    });
  }

  return statusPage(success, txnid);
}

// Some setups issue a GET redirect; handle gracefully.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const txnid = url.searchParams.get("txnid") || "";
  return NextResponse.redirect(`${appUrl}/payment/status?txnid=${txnid}`, 303);
}
