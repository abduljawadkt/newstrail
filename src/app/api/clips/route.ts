import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Toggle a saved clip for the current user.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const { articleId } = await req.json();
  if (!articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });

  const existing = await prisma.clip.findUnique({
    where: { userId_articleId: { userId: user.id, articleId } },
  });

  if (existing) {
    await prisma.clip.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }

  await prisma.clip.create({ data: { userId: user.id, articleId } });
  return NextResponse.json({ saved: true });
}
