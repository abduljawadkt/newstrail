import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { isMock } from "@/lib/easebuzz";
import { activateSubscription } from "@/lib/subscription";

export const runtime = "nodejs";

/** Local-only simulator used when EASEBUZZ_ENV=mock. */
export async function POST(req: Request) {
  if (!isMock()) return NextResponse.json({ error: "Not in mock mode" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const { txnid, outcome } = await req.json();
  const payment = await prisma.payment.findUnique({
    where: { txnid },
    include: { subscription: true },
  });
  if (!payment || payment.userId !== user.id) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const success = outcome === "success";
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: success ? "SUCCESS" : "FAILED", easebuzzId: `MOCK-${Date.now()}` },
  });

  if (success) {
    await activateSubscription(payment.id);
  } else if (payment.subscription) {
    await prisma.subscription.update({
      where: { id: payment.subscription.id },
      data: { status: "CANCELLED" },
    });
  }

  return NextResponse.json({ ok: true, success });
}
