import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function inr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function AdminDashboard() {
  const [users, epapers, activeSubs, revenue, recent] = await Promise.all([
    prisma.user.count(),
    prisma.ePaper.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amountInPaise: true } }),
    prisma.ePaper.findMany({
      orderBy: { publishDate: "desc" },
      take: 5,
      include: { edition: true, _count: { select: { pages: true } } },
    }),
  ]);

  const stats = [
    { label: "Total users", value: users },
    { label: "E-papers", value: epapers },
    { label: "Active subscriptions", value: activeSubs },
    { label: "Revenue (paid)", value: inr(revenue._sum.amountInPaise ?? 0) },
  ];

  return (
    <div>
      <h1 className="masthead mb-6 text-2xl font-bold">Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md border border-neutral-200 bg-white p-4">
            <div className="text-sm text-neutral-500">{s.label}</div>
            <div className="num mt-1 text-2xl font-bold text-ink">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent editions</h2>
        <Link
          href="/admin/editions/new"
          className="rounded bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + Upload edition
        </Link>
      </div>
      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2">Edition</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Pages</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {recent.map((ep) => (
              <tr key={ep.id} className="border-t border-neutral-100">
                <td className="px-4 py-2">{ep.edition.name}</td>
                <td className="px-4 py-2">{ep.publishDate.toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-2">{ep._count.pages}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      ep.status === "PUBLISHED"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {ep.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/epaper/${ep.id}`} className="text-brand hover:underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  No editions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
