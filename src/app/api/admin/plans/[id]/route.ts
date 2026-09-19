import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/session";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.durationDays !== undefined) data.durationDays = Number(body.durationDays);
  if (body.features !== undefined) data.features = body.features;
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.priceInRupees !== undefined) data.priceInPaise = Math.round(Number(body.priceInRupees) * 100);
  const plan = await prisma.plan.update({ where: { id: params.id }, data });
  return NextResponse.json({ plan });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // Soft-disable if it has subscriptions, else hard delete
  const count = await prisma.subscription.count({ where: { planId: params.id } });
  if (count > 0) {
    await prisma.plan.update({ where: { id: params.id }, data: { active: false } });
    return NextResponse.json({ ok: true, softDisabled: true });
  }
  await prisma.plan.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
