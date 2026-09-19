import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const articles = await prisma.article.findMany({
    where: { pageId: params.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ articles });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const page = await prisma.page.findUnique({ where: { id: params.id } });
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const { headline, body, category, clipX, clipY, clipW, clipH } = await req.json();
  if (!headline) return NextResponse.json({ error: "Headline required" }, { status: 400 });

  const clamp = (n: number) => Math.max(0, Math.min(1, Number(n) || 0));
  const article = await prisma.article.create({
    data: {
      pageId: params.id,
      headline,
      body: body || "",
      category: category || null,
      clipX: clamp(clipX),
      clipY: clamp(clipY),
      clipW: clamp(clipW),
      clipH: clamp(clipH),
    },
  });
  return NextResponse.json({ article }, { status: 201 });
}
