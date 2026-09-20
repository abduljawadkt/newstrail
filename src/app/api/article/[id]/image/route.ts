import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasFullAccess } from "@/lib/subscription";
import { fsPathFromPublic, ensureUploadDir } from "@/lib/storage";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

/**
 * Crops a single article out of its full page image and returns it as a JPEG.
 * ?download=1 forces a file download. The crop is cached to disk on first use.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const article = await prisma.article.findUnique({
    where: { id: params.id },
    include: { page: { include: { epaper: true } } },
  });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";
  const filename = `newstrail-${article.code}.jpg`;

  // Inline preview is open; downloading a clipping is subscriber-only.
  if (download) {
    const user = await getCurrentUser();
    if (!(await hasFullAccess(user))) {
      return NextResponse.json({ error: "Subscription required" }, { status: 403 });
    }
  }

  try {
    const fullPath = fsPathFromPublic(article.page.fullImage);
    const input = sharp(fullPath);
    const meta = await input.metadata();
    const W = article.page.width || meta.width || 0;
    const H = article.page.height || meta.height || 0;
    if (!W || !H) throw new Error("Unknown page dimensions");

    // Convert fractional clip rect -> pixels, clamped inside the page.
    let left = Math.round(article.clipX * W);
    let top = Math.round(article.clipY * H);
    let width = Math.round(article.clipW * W);
    let height = Math.round(article.clipH * H);
    // Fallbacks if a region was never drawn: use the whole page.
    if (width < 5 || height < 5) {
      left = 0;
      top = 0;
      width = W;
      height = H;
    }
    left = Math.max(0, Math.min(left, W - 1));
    top = Math.max(0, Math.min(top, H - 1));
    width = Math.max(1, Math.min(width, W - left));
    height = Math.max(1, Math.min(height, H - top));

    const buffer = await sharp(fullPath)
      .extract({ left, top, width, height })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Cache to disk + record clipImage (best-effort)
    try {
      const dir = await ensureUploadDir(article.page.epaperId);
      const cacheName = `clip-${article.code}.jpg`;
      await fs.writeFile(path.join(dir, cacheName), buffer);
      const clipPublic = `/uploads/${article.page.epaperId}/${cacheName}`;
      if (article.clipImage !== clipPublic) {
        await prisma.article.update({ where: { id: article.id }, data: { clipImage: clipPublic } });
      }
    } catch {
      /* caching is optional */
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600",
        ...(download ? { "Content-Disposition": `attachment; filename="${filename}"` } : {}),
      },
    });
  } catch (err) {
    console.error("clip image error", err);
    return NextResponse.json({ error: "Could not generate clip" }, { status: 500 });
  }
}
