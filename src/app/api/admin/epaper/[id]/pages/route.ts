import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/session";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const epaper = await prisma.ePaper.findUnique({
    where: { id: params.id },
    include: { pages: { orderBy: { pageNumber: "desc" }, take: 1 } },
  });
  if (!epaper) return NextResponse.json({ error: "E-paper not found" }, { status: 404 });

  const MAX_FILES = 60;
  const MAX_BYTES = 25 * 1024 * 1024; // 25 MB per image

  const form = await req.formData();
  const files = form.getAll("pages").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Too many files (max ${MAX_FILES})` }, { status: 400 });
  }
  for (const f of files) {
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: `"${f.name}" exceeds the 25 MB limit` }, { status: 400 });
    }
    if (f.type && !f.type.startsWith("image/")) {
      return NextResponse.json({ error: `"${f.name}" is not an image` }, { status: 400 });
    }
  }

  const dir = path.join(process.cwd(), "public", "uploads", epaper.id);
  await fs.mkdir(dir, { recursive: true });

  let nextPageNumber = (epaper.pages[0]?.pageNumber ?? 0) + 1;
  const created = [];
  let coverThumb: string | null = null;

  try {
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const pageNumber = nextPageNumber++;
      const base = `page-${pageNumber}`;
      const fullName = `${base}.jpg`;
      const thumbName = `${base}-thumb.jpg`;

      // Normalize to JPEG, get dimensions (throws if not a real image)
      const img = sharp(buffer).rotate();
      const meta = await img.metadata();
      await img.jpeg({ quality: 88 }).toFile(path.join(dir, fullName));
      await sharp(buffer).rotate().resize(400).jpeg({ quality: 80 }).toFile(path.join(dir, thumbName));

      const publicBase = `/uploads/${epaper.id}`;
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
      if (pageNumber === 1) coverThumb = `${publicBase}/${thumbName}`;
      created.push(page);
    }
  } catch (err) {
    console.error("page image upload error", err);
    return NextResponse.json(
      { error: "One of the files could not be processed as an image." },
      { status: 400 }
    );
  }

  if (coverThumb) {
    await prisma.ePaper.update({ where: { id: epaper.id }, data: { coverThumb } });
  }

  return NextResponse.json({ created: created.length, pages: created }, { status: 201 });
}
