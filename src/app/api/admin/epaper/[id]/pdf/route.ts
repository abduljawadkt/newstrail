import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/session";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const maxDuration = 300;

const RENDER_SCALE = 2.2; // higher = sharper pages, larger files

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const epaper = await prisma.ePaper.findUnique({
    where: { id: params.id },
    include: { pages: { orderBy: { pageNumber: "desc" }, take: 1 } },
  });
  if (!epaper) return NextResponse.json({ error: "E-paper not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("pdf");
  const replace = String(form.get("replace") ?? "") === "true";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No PDF uploaded" }, { status: 400 });
  }
  if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }

  const dir = path.join(process.cwd(), "public", "uploads", epaper.id);

  // Replace mode: wipe existing pages (DB rows + image files) first.
  if (replace) {
    await prisma.page.deleteMany({ where: { epaperId: epaper.id } });
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
  await fs.mkdir(dir, { recursive: true });

  let nextPageNumber = replace ? 1 : (epaper.pages[0]?.pageNumber ?? 0) + 1;
  const publicBase = `/uploads/${epaper.id}`;
  let coverThumb: string | null = null;
  let created = 0;

  try {
    const { pdf } = await import("pdf-to-img");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const document = await pdf(bytes, { scale: RENDER_SCALE });

    for await (const pageImage of document) {
      const pageNumber = nextPageNumber++;
      const base = `page-${pageNumber}`;
      const fullName = `${base}.jpg`;
      const thumbName = `${base}-thumb.jpg`;

      const meta = await sharp(pageImage).metadata();
      await sharp(pageImage).jpeg({ quality: 85 }).toFile(path.join(dir, fullName));
      await sharp(pageImage).resize(420).jpeg({ quality: 78 }).toFile(path.join(dir, thumbName));

      const page = await prisma.page.create({
        data: {
          epaperId: epaper.id,
          pageNumber,
          fullImage: `${publicBase}/${fullName}`,
          thumbImage: `${publicBase}/${thumbName}`,
          width: meta.width ?? null,
          height: meta.height ?? null,
        },
      });
      if (page.pageNumber === 1) coverThumb = `${publicBase}/${thumbName}`;
      created++;
    }
  } catch (err) {
    console.error("pdf split error", err);
    return NextResponse.json(
      { error: "Could not read the PDF. Make sure it is a valid, unencrypted PDF." },
      { status: 500 }
    );
  }

  if (created === 0) {
    return NextResponse.json({ error: "The PDF had no pages" }, { status: 400 });
  }

  if (coverThumb) {
    await prisma.ePaper.update({ where: { id: epaper.id }, data: { coverThumb } });
  } else {
    // if pages were appended (not starting at 1), keep existing cover; else set first
    const first = await prisma.page.findFirst({
      where: { epaperId: epaper.id },
      orderBy: { pageNumber: "asc" },
    });
    if (first && !epaper.coverThumb) {
      await prisma.ePaper.update({ where: { id: epaper.id }, data: { coverThumb: first.thumbImage } });
    }
  }

  return NextResponse.json({ created });
}
