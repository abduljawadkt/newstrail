import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasFullAccess } from "@/lib/subscription";
import { getBytes } from "@/lib/storage";
import sharp from "sharp";

export const runtime = "nodejs";

/**
 * Crops a single article out of its full page image and returns it as a JPEG.
 * ?download=1 forces a file download (subscriber-only).
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
    const source = await getBytes(article.page.fullImage);
    const meta = await sharp(source).metadata();
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

    const buffer = await sharp(source)
      .extract({ left, top, width, height })
      .jpeg({ quality: 90 })
      .toBuffer();

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
