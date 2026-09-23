import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasActiveSubscription } from "@/lib/subscription";
import SubscribeClient from "@/components/SubscribeClient";

export const dynamic = "force-dynamic";

export default async function SubscribePage() {
  const user = await getCurrentUser();
  const [plans, active] = await Promise.all([
    prisma.plan.findMany({ where: { active: true }, orderBy: { priceInPaise: "asc" } }),
    hasActiveSubscription(user?.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="masthead text-3xl font-bold">Subscribe to News Trail</h1>
        <p className="mt-2 text-neutral-500">
          Unlock every edition, every page, every day. Cancel anytime.
        </p>
      </div>

      {active && (
        <div className="mx-auto mb-8 max-w-xl rounded-md border border-green-300 bg-green-50 p-4 text-center text-green-800">
          You already have an active subscription. Enjoy reading!
        </div>
      )}

      <SubscribeClient
        isLoggedIn={!!user}
        plans={plans.map((p) => ({
          id: p.id,
          name: p.name,
          priceInPaise: p.priceInPaise,
          durationDays: p.durationDays,
          features: p.features,
        }))}
      />
    </div>
  );
}
