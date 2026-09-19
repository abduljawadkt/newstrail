import { prisma } from "@/lib/prisma";

/** Parse a "dd-mm-yyyy" URL segment into a [startOfDay, endOfDay) range. */
export function parseDateParam(dateStr: string): { start: Date; end: Date } | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateStr);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
  return { start, end };
}

export function formatDateParam(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

export async function getEpaperByEditionAndDate(editionSlug: string, dateStr: string) {
  const range = parseDateParam(dateStr);
  if (!range) return null;

  const edition = await prisma.edition.findUnique({ where: { slug: editionSlug } });
  if (!edition) return null;

  return prisma.ePaper.findFirst({
    where: {
      editionId: edition.id,
      status: "PUBLISHED",
      publishDate: { gte: range.start, lt: range.end },
    },
    include: {
      edition: true,
      pages: {
        orderBy: { pageNumber: "asc" },
        include: { articles: true },
      },
    },
  });
}
