import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/session";

export async function GET() {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const plans = await prisma.plan.findMany({ orderBy: { priceInPaise: "asc" } });
  return NextResponse.json({ plans });
}

export async function POST(req: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, priceInRupees, durationDays, features } = await req.json();
  if (!name || !priceInRupees || !durationDays) {
    return NextResponse.json({ error: "name, price and duration are required" }, { status: 400 });
  }
  const plan = await prisma.plan.create({
    data: {
      name,
      priceInPaise: Math.round(Number(priceInRupees) * 100),
      durationDays: Number(durationDays),
      features: features || "",
    },
  });
  return NextResponse.json({ plan }, { status: 201 });
}
