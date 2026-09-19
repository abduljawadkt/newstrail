import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/session";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const editions = await prisma.edition.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ editions });
}

export async function POST(req: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, language } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const slug = slugify(name);
  const existing = await prisma.edition.findUnique({ where: { slug } });
  if (existing) return NextResponse.json({ edition: existing });
  const edition = await prisma.edition.create({
    data: { name, slug, language: language || "English" },
  });
  return NextResponse.json({ edition }, { status: 201 });
}
