import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/session";

export async function POST(req: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { editionId, date } = await req.json();
  if (!editionId || !date) {
    return NextResponse.json({ error: "Edition and date are required" }, { status: 400 });
  }
  const edition = await prisma.edition.findUnique({ where: { id: editionId } });
  if (!edition) return NextResponse.json({ error: "Edition not found" }, { status: 404 });

  // date arrives as yyyy-mm-dd (from <input type=date>) -> store at local midnight
  const [y, m, d] = String(date).split("-").map(Number);
  const publishDate = new Date(y, m - 1, d, 0, 0, 0, 0);

  const existing = await prisma.ePaper.findUnique({
    where: { editionId_publishDate: { editionId, publishDate } },
  });
  if (existing) {
    return NextResponse.json({ epaper: existing, existed: true });
  }

  const epaper = await prisma.ePaper.create({
    data: { editionId, publishDate, status: "DRAFT" },
  });
  return NextResponse.json({ epaper }, { status: 201 });
}
