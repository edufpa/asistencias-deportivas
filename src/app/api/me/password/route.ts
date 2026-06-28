import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSessionRole } from "@/lib/auth-session";
import { validatePasswordChange } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const authResult = await requireSessionRole();
  if ("error" in authResult) return authResult.error;

  const body = await req.json().catch(() => ({}));
  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const newPasswordConfirm =
    typeof body.newPasswordConfirm === "string" ? body.newPasswordConfirm : "";

  const validationError = validatePasswordChange(
    currentPassword,
    newPassword,
    newPasswordConfirm
  );
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: authResult.ctx.userId },
      select: { passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: authResult.ctx.userId },
      data: { passwordHash },
    });

    await prisma.passwordResetToken.deleteMany({
      where: { userId: authResult.ctx.userId },
    });

    return NextResponse.json({ ok: true, message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("[me/password] error:", error);
    return NextResponse.json({ error: "No se pudo actualizar la contraseña" }, { status: 500 });
  }
}
