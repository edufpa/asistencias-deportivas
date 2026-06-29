import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { requireSessionRole } from "@/lib/auth-session";
import { log } from "@/lib/logger";
import { normalizeEmail, validateNewPassword, validatePersonalEmail } from "@/lib/password";
import { isTemporaryClubEmail } from "@/lib/clubEmail";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const authResult = await requireSessionRole();
  if ("error" in authResult) return authResult.error;

  const body = await req.json().catch(() => ({}));
  const newEmailRaw = typeof body.newEmail === "string" ? body.newEmail : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const newPasswordConfirm =
    typeof body.newPasswordConfirm === "string" ? body.newPasswordConfirm : "";

  const emailError = validatePersonalEmail(newEmailRaw);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  const passwordError = validateNewPassword(newPassword, newPasswordConfirm);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const newEmail = normalizeEmail(newEmailRaw);

  try {
    const user = await prisma.user.findUnique({
      where: { id: authResult.ctx.userId },
      select: { email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!isTemporaryClubEmail(user.email)) {
      return NextResponse.json(
        { error: "Tu cuenta ya tiene un correo personal configurado" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.user.update({
      where: { id: authResult.ctx.userId },
      data: { email: newEmail, passwordHash },
      select: { email: true, name: true, role: true },
    });

    await prisma.passwordResetToken.deleteMany({
      where: { userId: authResult.ctx.userId },
    });

    await log({
      userId: authResult.ctx.userId,
      action: "USER_UPDATED",
      entity: "user",
      entityId: authResult.ctx.userId,
      detail: `Correo temporal completado: ${user.email} → ${updated.email}`,
    });

    return NextResponse.json({
      ok: true,
      message: "Cuenta actualizada correctamente",
      email: updated.email,
      name: updated.name,
      role: updated.role,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Ese correo ya está registrado en otra cuenta" },
        { status: 409 }
      );
    }
    console.error("[me/complete-account] error:", error);
    return NextResponse.json({ error: "No se pudo completar la cuenta" }, { status: 500 });
  }
}
