import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/session";
import { deleteByPublicPath } from "@/lib/storage";

export const runtime = "nodejs";

// Delete a single page, remove its image files, and renumber remaining pages 1..N.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const page = await prisma.page.findUnique({ where: { id: params.id } });
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const epaperId = page.epaperId;

  // Remove image files (best-effort)
  for (const p of [page.fullImage, page.thumbImage]) {
    if (p) await deleteByPublicPath(p);
  }

  await prisma.page.delete({ where: { id: page.id } });

  // Renumber remaining pages to stay contiguous
  const remaining = await prisma.page.findMany({
    where: { epaperId },
    orderBy: { pageNumber: "asc" },
  });
  await prisma.$transaction(
    remaining.map((p, i) =>
      prisma.page.update({ where: { id: p.id }, data: { pageNumber: i + 1 } })
    )
  );

  // Update cover thumb to the new first page (or clear)
  const first = remaining[0];
  await prisma.ePaper.update({
    where: { id: epaperId },
    data: { coverThumb: first ? first.thumbImage : null },
  });

  return NextResponse.json({ ok: true, remaining: remaining.length });
}
