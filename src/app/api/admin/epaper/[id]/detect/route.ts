import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/session";
import { getBytes } from "@/lib/storage";
import { detectArticles, articleDetectionAvailable } from "@/lib/articleDetect";

export const runtime = "nodejs";
export const maxDuration = 300;

// Auto-detect article regions across an edition's pages using AI vision.
// Body: { replace?: boolean } — replace clears existing articles per page first.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!articleDetectionAvailable()) {
    return NextResponse.json(
      { error: "AI detection is not configured. Set ANTHROPIC_API_KEY." },
      { status: 400 }
    );
  }

  const epaper = await prisma.ePaper.findUnique({
    where: { id: params.id },
    include: { pages: { orderBy: { pageNumber: "asc" }, include: { _count: { select: { articles: true } } } } },
  });
  if (!epaper) return NextResponse.json({ error: "E-paper not found" }, { status: 404 });

  let replace = false;
  try {
    const body = await req.json();
    replace = Boolean(body?.replace);
  } catch {
    /* no body */
  }

  let created = 0;
  let processed = 0;
  const errors: string[] = [];

  for (const page of epaper.pages) {
    if (!replace && page._count.articles > 0) continue; // skip already-mapped pages
    try {
      const bytes = await getBytes(page.fullImage);
      const detected = await detectArticles(bytes);

      if (replace) {
        await prisma.article.deleteMany({ where: { pageId: page.id } });
      }
      for (const a of detected) {
        await prisma.article.create({
          data: {
            pageId: page.id,
            headline: a.headline,
            category: a.category,
            clipX: a.x,
            clipY: a.y,
            clipW: a.w,
            clipH: a.h,
          },
        });
        created++;
      }
      processed++;
    } catch (err) {
      console.error(`detect page ${page.pageNumber} error`, err);
      errors.push(`Page ${page.pageNumber}`);
    }
  }

  return NextResponse.json({ created, processed, pages: epaper.pages.length, errors });
}
