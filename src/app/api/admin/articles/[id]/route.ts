import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/session";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  const article = await prisma.article.update({
    where: { id: params.id },
    data: {
      headline: data.headline,
      body: data.body,
      category: data.category ?? null,
    },
  });
  return NextResponse.json({ article });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.article.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
