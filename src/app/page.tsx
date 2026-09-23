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
  const heroDate = latest
    ? latest.publishDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";
  const heroFront = latest ? assetSrc(latest.pages[0]?.fullImage ?? latest.coverThumb ?? "") : "";
  const latestHref = latest
    ? `/epaper/${latest.edition.slug}/${formatCardDate(latest.publishDate)}`
    : "/";

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate flex min-h-[440px] items-center overflow-hidden border-b border-line md:min-h-[560px]">
        {/* Lifestyle background — desktop/tablet only */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero.webp"
          alt=""
          aria-hidden
          className="absolute inset-0 -z-10 hidden h-full w-full object-cover object-right md:block"
        />
        {/* Legibility scrim over the photo (md+) */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-paper via-paper/85 to-transparent md:block"
        />
        {/* Clean branded background — mobile only */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-paper to-brand-50 md:hidden"
        />

        {/* Latest front-page preview (desktop) */}
        {latest && heroFront && (
          <Link
            href={latestHref}
            className="group absolute right-6 top-1/2 z-10 hidden -translate-y-1/2 lg:block lg:right-24 xl:right-32"
            aria-label={`Open ${latest.edition.name} — ${heroDate}`}
          >
            <div className="relative w-64 rotate-[-3deg] overflow-hidden rounded-xl border border-line bg-white shadow-card-hover ring-1 ring-black/5 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:rotate-0 lg:w-80 xl:w-[22rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroFront}
                alt={`${latest.edition.name} front page`}
                className="block aspect-[3/4] w-full object-cover object-top"
              />
              <span className="absolute left-2.5 top-2.5 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold text-white shadow">
                {latest.edition.name} · {latest._count.pages}p
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 text-xs font-semibold text-white">
                Open latest →
              </span>
            </div>
          </Link>
        )}

        <div className="mx-auto w-full max-w-content px-4 py-16 sm:px-6">
          <div className="max-w-xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-brand backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              {latest ? `Latest edition · ${heroDate}` : "Digital newspaper"}
            </p>
            <h1 className="headline text-4xl leading-[1.03] text-ink md:text-6xl">
              Read News Trail,<br />page by page.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">
              The full newspaper, exactly as it appears in print — flip pages, zoom in,
              clip and download any story, and browse the archive by date.
            </p>
            {latest && (
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href={`/epaper/${latest.edition.slug}/${formatCardDate(latest.publishDate)}`}
                  className="btn-primary w-full px-6 py-3 text-base shadow-card sm:w-auto"
                >
                  Read today&apos;s paper →
                </Link>
                <Link
                  href="/subscribe"
                  className="btn-outline w-full bg-white/80 px-6 py-3 text-base backdrop-blur sm:w-auto"
                >
                  View subscription plans
                </Link>
              </div>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-soft">
              <span className="flex items-center gap-2"><span className="text-brand">✓</span> Every edition daily</span>
              <span className="flex items-center gap-2"><span className="text-brand">✓</span> Clip &amp; download</span>
            </div>

            {/* Latest front-page preview (mobile/tablet) */}
            {latest && heroFront && (
              <Link
                href={latestHref}
                className="group mx-auto mt-10 block w-72 max-w-[80%] sm:w-80 lg:hidden"
                aria-label={`Open ${latest.edition.name} — ${heroDate}`}
              >
                <div className="relative rotate-[-2deg] overflow-hidden rounded-xl border border-line bg-white shadow-card-hover ring-1 ring-black/5 transition-transform duration-300 group-active:rotate-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroFront}
                    alt={`${latest.edition.name} front page`}
                    className="block aspect-[3/4] w-full object-cover object-top"
                  />
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold text-white shadow">
                    {latest.edition.name} · {latest._count.pages}p
                  </span>
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 text-xs font-semibold text-white">
                    Open latest →
                  </span>
                </div>
              </Link>
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
