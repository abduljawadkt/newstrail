import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/session";
import { deleteEpaper } from "@/lib/storage";

// Toggle publish status
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { status } = await req.json();
  if (status !== "PUBLISHED" && status !== "DRAFT") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const epaper = await prisma.ePaper.update({
    where: { id: params.id },
    data: { status },
  });
  return NextResponse.json({ epaper });
}

// Delete an e-paper and its uploaded images
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.ePaper.delete({ where: { id: params.id } });
  await deleteEpaper(params.id);
  return NextResponse.json({ ok: true });
}
