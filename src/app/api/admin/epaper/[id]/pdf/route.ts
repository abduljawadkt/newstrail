import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/session";
import { putObject, deleteEpaper, publicPathFor } from "@/lib/storage";
import sharp from "sharp";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

// Keep sharp's memory footprint low so many pages fit on small instances.
sharp.cache(false);
sharp.concurrency(1);

export const runtime = "nodejs";
export const maxDuration = 300;

const DPI = 150; // ~1240x1754 for A4 — readable, memory-light

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const epaper = await prisma.ePaper.findUnique({
    where: { id: params.id },
    include: { pages: { orderBy: { pageNumber: "desc" }, take: 1 } },
  });
  if (!epaper) return NextResponse.json({ error: "E-paper not found" }, { status: 404 });

  const MAX_PDF_BYTES = 150 * 1024 * 1024; // 150 MB

  const form = await req.formData();
  const file = form.get("pdf");
  const replace = String(form.get("replace") ?? "") === "true";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No PDF uploaded" }, { status: 400 });
  }
  if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF exceeds the 150 MB limit" }, { status: 400 });
  }

  if (replace) {
    await prisma.page.deleteMany({ where: { epaperId: epaper.id } });
    await deleteEpaper(epaper.id);
  }

  let nextPageNumber = replace ? 1 : (epaper.pages[0]?.pageNumber ?? 0) + 1;
  let coverThumb: string | null = null;
  let created = 0;

  const work = await fs.mkdtemp(path.join(os.tmpdir(), "nt-pdf-"));
  const pdfPath = path.join(work, "input.pdf");

  try {
    await fs.writeFile(pdfPath, Buffer.from(await file.arrayBuffer()));

    // Render every page to JPEGs on disk (poppler: fast, low memory).
    await execFileAsync(
      "pdftoppm",
      ["-jpeg", "-r", String(DPI), "-jpegopt", "quality=85", pdfPath, path.join(work, "page")],
      { maxBuffer: 16 * 1024 * 1024 }
    );

    // Collect generated page-*.jpg in page order.
    const outputs = (await fs.readdir(work))
      .filter((f) => /^page.*\.jpg$/i.test(f))
      .sort((a, b) => {
        const na = Number(a.match(/(\d+)\.jpg$/i)?.[1] ?? 0);
        const nb = Number(b.match(/(\d+)\.jpg$/i)?.[1] ?? 0);
        return na - nb;
      });

    if (outputs.length === 0) {
      throw new Error("pdftoppm produced no pages");
    }

    // Process one page at a time (only one page in memory at once).
    for (const f of outputs) {
      const pageNumber = nextPageNumber++;
      const buf = await fs.readFile(path.join(work, f));
      const meta = await sharp(buf).metadata();
      const thumb = await sharp(buf).resize(420).jpeg({ quality: 78 }).toBuffer();

      const fullPath = publicPathFor(epaper.id, `page-${pageNumber}.jpg`);
      const thumbPath = publicPathFor(epaper.id, `page-${pageNumber}-thumb.jpg`);
      await putObject(fullPath, buf, "image/jpeg");
      await putObject(thumbPath, thumb, "image/jpeg");

      const page = await prisma.page.create({
        data: {
          epaperId: epaper.id,
          pageNumber,
          fullImage: fullPath,
          thumbImage: thumbPath,
          width: meta.width ?? null,
          height: meta.height ?? null,
        },
      });
      if (page.pageNumber === 1) coverThumb = thumbPath;
      created++;
      // free the temp page file as we go
      await fs.rm(path.join(work, f), { force: true }).catch(() => {});
    }
  } catch (err) {
    console.error("pdf split error", err);
    return NextResponse.json(
      { error: "Could not process the PDF. Make sure it is a valid, unencrypted PDF." },
      { status: 500 }
    );
  } finally {
    await fs.rm(work, { recursive: true, force: true }).catch(() => {});
  }

  if (created === 0) {
    return NextResponse.json({ error: "The PDF had no pages" }, { status: 400 });
  }

  if (coverThumb) {
    await prisma.ePaper.update({ where: { id: epaper.id }, data: { coverThumb } });
  } else if (!epaper.coverThumb) {
    const first = await prisma.page.findFirst({
      where: { epaperId: epaper.id },
      orderBy: { pageNumber: "asc" },
    });
    if (first) {
      await prisma.ePaper.update({ where: { id: epaper.id }, data: { coverThumb: first.thumbImage } });
    }
  }

  return NextResponse.json({ created });
}
