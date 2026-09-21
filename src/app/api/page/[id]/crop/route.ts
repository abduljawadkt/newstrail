import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasFullAccess } from "@/lib/subscription";
import { getBytes } from "@/lib/storage";
import sharp from "sharp";

export const runtime = "nodejs";

function frac(v: string | null) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

/**
 * Crop an arbitrary rectangle out of a page image.
 * Query: x,y,w,h as fractions (0..1). ?download=1 forces a file download.
 * Used by the reader-side "Crop" tool in the viewer.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url);
  const x = frac(url.searchParams.get("x"));
  const y = frac(url.searchParams.get("y"));
  const w = frac(url.searchParams.get("w"));
  const h = frac(url.searchParams.get("h"));
  const download = url.searchParams.get("download") === "1";

  if (w < 0.01 || h < 0.01) {
    return NextResponse.json({ error: "Selection too small" }, { status: 400 });
  }

  // Cropping is a subscriber-only feature.
  const user = await getCurrentUser();
  if (!(await hasFullAccess(user))) {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }

  const page = await prisma.page.findUnique({ where: { id: params.id } });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const source = await getBytes(page.fullImage);
    const meta = await sharp(source).metadata();
    const W = page.width || meta.width || 0;
    const H = page.height || meta.height || 0;
    if (!W || !H) throw new Error("Unknown page dimensions");

    let left = Math.round(x * W);
    let top = Math.round(y * H);
    let width = Math.round(w * W);
    let height = Math.round(h * H);
    left = Math.max(0, Math.min(left, W - 1));
    top = Math.max(0, Math.min(top, H - 1));
    width = Math.max(1, Math.min(width, W - left));
    height = Math.max(1, Math.min(height, H - top));

    const buffer = await sharp(source)
      .extract({ left, top, width, height })
      .jpeg({ quality: 90 })
      .toBuffer();

    const filename = `newstrail-p${page.pageNumber}-crop.jpg`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-store",
        ...(download ? { "Content-Disposition": `attachment; filename="${filename}"` } : {}),
      },
    });
  } catch (err) {
    console.error("page crop error", err);
    return NextResponse.json({ error: "Could not crop" }, { status: 500 });
  }
}
