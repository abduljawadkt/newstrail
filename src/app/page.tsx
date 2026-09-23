import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import EditionFilter from "@/components/EditionFilter";
import { assetSrc } from "@/lib/storage";

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
  let latest:
    | {
        edition: { slug: string; name: string };
        publishDate: Date;
        coverThumb: string | null;
        pages: { fullImage: string; pageNumber: number }[];
        _count: { pages: number };
      }
    | null = null;
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
        include: {
          edition: true,
          pages: { take: 1, orderBy: { pageNumber: "asc" }, select: { fullImage: true, pageNumber: true } },
          _count: { select: { pages: true } },
        },
      }),
    ]);
  } catch {
    epapers = null;
  }

  const hasFilter = Boolean(dateStr) || editionSlug !== "all";
  const heroImg = latest
    ? assetSrc(latest.pages[0]?.fullImage ?? latest.coverThumb ?? "")
    : "";
  const heroDate = latest
    ? latest.publishDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-white to-paper">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/5 blur-3xl"
        />
        <div className="mx-auto grid max-w-content items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-20">
          {/* Copy */}
          <div className="max-w-xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-brand">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              {latest ? `Today's edition · ${heroDate}` : "Digital newspaper"}
            </p>
            <h1 className="headline text-4xl leading-[1.03] md:text-6xl">
              Read NewsTrail,<br />page by page.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">
              The full newspaper, exactly as it appears in print — flip pages, zoom in,
              clip and download any story, and browse the archive by date.
            </p>
            {latest && (
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={`/epaper/${latest.edition.slug}/${formatCardDate(latest.publishDate)}`}
                  className="btn-primary px-6 py-3 text-base shadow-card"
                >
                  Read today&apos;s paper →
                </Link>
                <Link href="/subscribe" className="btn-outline px-6 py-3 text-base">
                  View subscription plans
                </Link>
              </div>
            )}
            <div className="mt-8 flex items-center gap-6 text-sm text-ink-muted">
              <span className="flex items-center gap-2"><span className="text-brand">✓</span> Every edition daily</span>
              <span className="flex items-center gap-2"><span className="text-brand">✓</span> Clip & download</span>
            </div>
          </div>

          {/* Featured front page */}
          {latest && heroImg && (
            <div className="relative mx-auto w-full max-w-sm md:justify-self-end">
              <div className="absolute -inset-4 -z-10 rounded-2xl bg-brand/5" />
              <Link
                href={`/epaper/${latest.edition.slug}/${formatCardDate(latest.publishDate)}`}
                className="group block"
              >
                <div className="relative rotate-[-2deg] overflow-hidden rounded-lg border border-line bg-white shadow-card-hover transition-transform duration-300 group-hover:rotate-0 group-hover:-translate-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroImg}
                    alt={`${latest.edition.name} front page`}
                    className="block aspect-[3/4] w-full object-cover object-top"
                  />
                  <div className="absolute left-3 top-3 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white shadow">
                    {latest.edition.name} · {latest._count.pages} pages
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10 text-white">
                    <span className="text-sm font-medium">{heroDate}</span>
                    <span className="rounded bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand opacity-0 transition-opacity group-hover:opacity-100">
                      Open →
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          )}
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
              const coverRaw = ep.coverThumb ?? ep.pages[0]?.thumbImage ?? null;
              const cover = coverRaw ? assetSrc(coverRaw) : null;
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
                        className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-ink-muted">
                        No preview
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 via-black/0 to-black/0 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <span className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-brand shadow">
                        Read edition →
                      </span>
                    </div>
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
