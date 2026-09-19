import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const { name, email, phone } = await req.json();
  if (!name || String(name).trim().length < 2) {
    return NextResponse.json({ error: "Enter a valid name" }, { status: 400 });
  }
  const lowerEmail = String(email || "").toLowerCase().trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lowerEmail)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  // If email changed, ensure it's not taken by someone else
  const clash = await prisma.user.findFirst({
    where: { email: lowerEmail, NOT: { id: user.id } },
  });
  if (clash) return NextResponse.json({ error: "That email is already in use" }, { status: 409 });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name: String(name).trim(), email: lowerEmail, phone: phone ? String(phone).trim() : null },
    select: { name: true, email: true, phone: true },
  });
  return NextResponse.json({ ok: true, user: updated });
}
