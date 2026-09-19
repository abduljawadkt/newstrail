import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import EditionFilter from "@/components/EditionFilter";

export const dynamic = "force-dynamic";

function formatCardDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

/** yyyy-mm-dd -> [startOfDay, nextDay) */
function dayRange(iso: string): { gte: Date; lt: Date } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const start = new Date(y, mo - 1, d, 0, 0, 0, 0);
  if (Number.isNaN(start.getTime())) return null;
  return { gte: start, lt: new Date(y, mo - 1, d + 1, 0, 0, 0, 0) };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { date?: string; edition?: string };
}) {
  const dateStr = searchParams.date ?? "";
  const editionSlug = searchParams.edition ?? "all";

  const where: Prisma.EPaperWhereInput = { status: "PUBLISHED" };
  if (editionSlug && editionSlug !== "all") where.edition = { slug: editionSlug };
  const range = dateStr ? dayRange(dateStr) : null;
  if (range) where.publishDate = range;

  let epapers = null;
  let editions: { name: string; slug: string }[] = [];
  let latest: { edition: { slug: string; name: string }; publishDate: Date } | null = null;
  try {
    [epapers, editions, latest] = await Promise.all([
      prisma.ePaper.findMany({
        where,
        orderBy: { publishDate: "desc" },
        take: 48,
        include: { edition: true, pages: { take: 1, orderBy: { pageNumber: "asc" } } },
      }),
      prisma.edition.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
      prisma.ePaper.findFirst({
        where: { status: "PUBLISHED" },
        orderBy: { publishDate: "desc" },
        include: { edition: true },
      }),
    ]);
  } catch {
    epapers = null;
  }

  const hasFilter = Boolean(dateStr) || editionSlug !== "all";

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-content px-4 py-12 sm:px-6 md:py-16">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
              Today&apos;s Newspaper
            </p>
            <h1 className="headline text-4xl leading-[1.05] md:text-5xl">
              Read NewsTrail, page by page.
            </h1>
            <p className="mt-4 text-lg text-ink-soft">
              Every edition, exactly as it appears in print — flip pages, zoom in, clip and
              download any story.
            </p>
            {latest && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href={`/epaper/${latest.edition.slug}/${formatCardDate(latest.publishDate)}`}
                  className="btn-primary px-5 py-2.5"
                >
                  Read latest edition →
                </Link>
                <Link href="/subscribe" className="btn-outline px-5 py-2.5">
                  View plans
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Editions + filter */}
      <section className="mx-auto max-w-content px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="headline text-2xl">
                {hasFilter ? "Filtered Editions" : "Latest Editions"}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">Browse the archive by date or edition</p>
            </div>
          </div>
          {editions.length > 0 && (
            <EditionFilter editions={editions} date={dateStr} edition={editionSlug} />
          )}
        </div>

        {epapers === null && (
          <div className="card p-6 text-ink-soft">
            <p className="font-medium">Database not connected.</p>
            <p className="mt-1 text-sm text-ink-muted">Check DATABASE_URL and run the seed script.</p>
          </div>
        )}

        {epapers && epapers.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-ink-soft">No editions found for this filter.</p>
            {hasFilter && (
              <Link href="/" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
                Clear filters
              </Link>
            )}
          </div>
        )}

        {epapers && epapers.length > 0 && (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {epapers.map((ep) => {
              const cover = ep.coverThumb ?? ep.pages[0]?.thumbImage ?? null;
              return (
                <Link
                  key={ep.id}
                  href={`/epaper/${ep.edition.slug}/${formatCardDate(ep.publishDate)}`}
                  className="edition-card group block"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt={`${ep.edition.name} front page`}
                        className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-ink-muted">
                        No preview
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-3">
                    <span className="text-sm font-semibold text-ink">{ep.edition.name}</span>
                    <span className="num text-xs text-ink-muted">
                      {ep.publishDate.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
