import { prisma } from "@/lib/prisma";

/** Full access = admins always, or any user with an active subscription. */
export async function hasFullAccess(
  user: { id?: string | null; role?: string | null } | null | undefined
) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return hasActiveSubscription(user.id);
}

export async function hasActiveSubscription(userId: string | undefined | null) {
  if (!userId) return false;
  const now = new Date();
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
  });
  return !!sub;
}

/** Activate (or extend) a subscription for a successful payment. */
export async function activateSubscription(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { subscription: { include: { plan: true } } },
  });
  if (!payment) throw new Error("Payment not found");
  if (!payment.subscription) throw new Error("Payment has no subscription");

  const plan = payment.subscription.plan;
  const start = new Date();
  const end = new Date(start.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  await prisma.subscription.update({
    where: { id: payment.subscription.id },
    data: { status: "ACTIVE", startDate: start, endDate: end },
  });
}
