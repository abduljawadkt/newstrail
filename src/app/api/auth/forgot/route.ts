import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail, emailConfigured } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { email } = await req.json();
  const lowerEmail = String(email || "").toLowerCase().trim();

  // Generic response regardless of whether the account exists (no enumeration).
  const generic = { ok: true } as { ok: true; devResetUrl?: string };

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lowerEmail)) {
    return NextResponse.json(generic);
  }

  const user = await prisma.user.findUnique({ where: { email: lowerEmail } });
  if (!user) return NextResponse.json(generic);

  // Invalidate previous unused tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

  await sendPasswordResetEmail(user.email, resetUrl);

  // In dev (no email provider), surface the link so it can be used without SMTP.
  if (!emailConfigured() && process.env.NODE_ENV !== "production") {
    generic.devResetUrl = resetUrl;
  }

  return NextResponse.json(generic);
}
