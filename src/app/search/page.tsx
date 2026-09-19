import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateParam } from "@/lib/epaper";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q || "").trim();

  const results = q
    ? await prisma.article.findMany({
        where: {
          OR: [
            { headline: { contains: q, mode: "insensitive" } },
            { body: { contains: q, mode: "insensitive" } },
          ],
          page: { epaper: { status: "PUBLISHED" } },
        },
        include: { page: { include: { epaper: { include: { edition: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="masthead mb-2 text-2xl font-bold">Search</h1>
      <form action="/search" className="mb-8 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search headlines and articles…"
          className="flex-1 rounded border border-neutral-300 px-3 py-2 focus:border-brand focus:outline-none"
        />
        <button className="rounded bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark">
          Search
        </button>
      </form>

      {q && (
        <p className="mb-4 text-sm text-neutral-500">
          {results.length} result{results.length === 1 ? "" : "s"} for “{q}”
        </p>
      )}

      <ul className="space-y-4">
        {results.map((a) => {
          const ep = a.page.epaper;
          return (
            <li key={a.id} className="rounded-md border border-neutral-200 bg-white p-4">
              <Link href={`/article/${a.id}`} className="masthead text-lg font-semibold text-ink hover:text-brand">
                {a.headline}
              </Link>
              <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{a.body}</p>
              <p className="mt-2 text-xs text-neutral-400">
                {ep.edition.name} · {ep.publishDate.toLocaleDateString("en-IN")} · Page {a.page.pageNumber}
                {"  "}
                <Link
                  href={`/epaper/${ep.edition.slug}/${formatDateParam(ep.publishDate)}`}
                  className="text-brand hover:underline"
                >
                  open edition
                </Link>
              </p>
            </li>
          );
        })}
        {q && results.length === 0 && (
          <li className="text-neutral-500">No articles matched your search.</li>
        )}
      </ul>
    </div>
  );
}
