import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function getAppOrigin(): string {
  const raw = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "";
  return raw.replace(/\r?\n/g, "").trim();
}

export function buildPasswordResetUrl(token: string, origin?: string): string {
  const base = origin ?? getAppOrigin();
  return `${base}/restablecer-contrasena/${token}`;
}

export async function createPasswordResetToken(userId: string) {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  return prisma.passwordResetToken.create({
    data: { userId, token, expiresAt },
  });
}

export async function findValidPasswordResetToken(token: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: {
      user: { select: { id: true, email: true, accountStatus: true, name: true } },
    },
  });

  if (!record) return null;
  if (record.expiresAt < new Date()) return null;
  if (record.user.accountStatus !== "APPROVED") return null;

  return record;
}

export async function resetPasswordWithToken(token: string, passwordHash: string) {
  const record = await findValidPasswordResetToken(token);
  if (!record) return false;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  return true;
}
