import { notFound } from "next/navigation";
import { getEpaperByEditionAndDate, formatDateParam } from "@/lib/epaper";
import { getCurrentUser } from "@/lib/session";
import { hasFullAccess } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import { assetSrc } from "@/lib/storage";
import EpaperViewer from "@/components/EpaperViewer";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const FREE_PAGE_COUNT = 1; // page 1 is a free preview

export async function generateMetadata({
  params,
}: {
  params: { edition: string; date: string };
}): Promise<Metadata> {
  const epaper = await getEpaperByEditionAndDate(params.edition, params.date);
  if (!epaper) return { title: "Edition not found" };
  const label = epaper.publishDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const title = `${epaper.edition.name} — ${label}`;
  return {
    title,
    description: `Read the ${epaper.edition.name} edition of News Trail for ${label}, page by page.`,
    openGraph: { title, type: "article" },
  };
}

export default async function EpaperPage({
  params,
}: {
  params: { edition: string; date: string };
}) {
  const epaper = await getEpaperByEditionAndDate(params.edition, params.date);
  if (!epaper) notFound();

  const [user, editions] = await Promise.all([
    getCurrentUser(),
    prisma.edition.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
  ]);
  const canReadAll = await hasFullAccess(user);

  const dateLabel = epaper.publishDate.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // Local yyyy-mm-dd (avoid UTC shift that would show the previous day)
  const pd = epaper.publishDate;
  const isoDate = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, "0")}-${String(
    pd.getDate()
  ).padStart(2, "0")}`;

  return (
    <EpaperViewer
      editionName={epaper.edition.name}
      currentSlug={epaper.edition.slug}
      editions={editions}
      dateLabel={dateLabel}
      dateParam={formatDateParam(epaper.publishDate)}
      isoDate={isoDate}
      canReadAll={canReadAll}
      freePageCount={FREE_PAGE_COUNT}
      isLoggedIn={!!user}
      pages={epaper.pages.map((p) => ({
        id: p.id,
        pageNumber: p.pageNumber,
        fullImage: assetSrc(p.fullImage),
        thumbImage: assetSrc(p.thumbImage),
        articles: p.articles.map((a) => ({
          id: a.id,
          code: a.code,
          headline: a.headline,
          clipX: a.clipX,
          clipY: a.clipY,
          clipW: a.clipW,
          clipH: a.clipH,
        })),
      }))}
    />
  );
}
