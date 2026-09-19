import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function inr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const statusColor: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  EXPIRED: "bg-neutral-100 text-neutral-600",
  CANCELLED: "bg-red-100 text-red-700",
  PENDING: "bg-amber-100 text-amber-700",
};

export default async function SubscriptionHistoryPage() {
  const user = await getCurrentUser();
  const subs = await prisma.subscription.findMany({
    where: { userId: user!.id },
    include: { plan: true, payment: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Subscription History</h1>
      {subs.length === 0 ? (
        <p className="text-neutral-500">No subscriptions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 text-left text-neutral-500">
              <tr>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Start</th>
                <th className="px-3 py-2">End</th>
                <th className="px-3 py-2">Ref</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} className="border-b border-neutral-100">
                  <td className="px-3 py-2 font-medium">{s.plan.name}</td>
                  <td className="px-3 py-2">{inr(s.plan.priceInPaise)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${statusColor[s.status] ?? ""}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{s.startDate?.toLocaleDateString("en-IN") ?? "—"}</td>
                  <td className="px-3 py-2">{s.endDate?.toLocaleDateString("en-IN") ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-neutral-500">
                    {s.payment?.txnid ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
