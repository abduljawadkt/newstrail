import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditionsPage() {
  const epapers = await prisma.ePaper.findMany({
    orderBy: { publishDate: "desc" },
    include: { edition: true, _count: { select: { pages: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="masthead text-2xl font-bold">Editions</h1>
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
            {epapers.map((ep) => (
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
            {epapers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  No editions yet. Click “Upload edition” to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
