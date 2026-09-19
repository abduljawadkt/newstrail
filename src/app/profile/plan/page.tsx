import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function inr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function CurrentPlanPage() {
  const user = await getCurrentUser();
  const sub = await prisma.subscription.findFirst({
    where: { userId: user!.id, status: "ACTIVE" },
    include: { plan: true },
    orderBy: { endDate: "desc" },
  });

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-xl font-bold">Current Plan</h1>
      {sub ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <p className="text-sm text-green-700">Active subscription</p>
          <p className="mt-1 text-2xl font-bold text-ink">{sub.plan.name}</p>
          <p className="num mt-2 text-neutral-600">
            {inr(sub.plan.priceInPaise)} · {sub.plan.durationDays} days
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-neutral-500">Started</dt>
            <dd>{sub.startDate?.toLocaleDateString("en-IN") ?? "—"}</dd>
            <dt className="text-neutral-500">Valid until</dt>
            <dd className="font-medium">{sub.endDate?.toLocaleDateString("en-IN") ?? "—"}</dd>
          </dl>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6">
          <p className="mb-4 text-neutral-600">You don&apos;t have an active plan.</p>
          <Link href="/subscribe" className="rounded-md bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark">
            View plans
          </Link>
        </div>
      )}
    </div>
  );
}
