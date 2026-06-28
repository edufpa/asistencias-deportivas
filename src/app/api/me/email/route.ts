import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { requireSessionRole } from "@/lib/auth-session";
import { normalizeEmail, validateEmail } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const authResult = await requireSessionRole();
  if ("error" in authResult) return authResult.error;

  const body = await req.json().catch(() => ({}));
  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newEmailRaw = typeof body.newEmail === "string" ? body.newEmail : "";

  if (!currentPassword) {
    return NextResponse.json({ error: "Ingresá tu contraseña actual" }, { status: 400 });
  }

  const emailError = validateEmail(newEmailRaw);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  const newEmail = normalizeEmail(newEmailRaw);

  try {
    const user = await prisma.user.findUnique({
      where: { id: authResult.ctx.userId },
      select: { email: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (user.email === newEmail) {
      return NextResponse.json({ error: "El correo nuevo es igual al actual" }, { status: 400 });
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: authResult.ctx.userId },
      data: { email: newEmail },
      select: { email: true, name: true },
    });

    return NextResponse.json({
      ok: true,
      message: "Correo actualizado correctamente",
      email: updated.email,
      name: updated.name,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Ese correo ya está registrado en otra cuenta" },
        { status: 409 }
      );
    }
    console.error("[me/email] error:", error);
    return NextResponse.json({ error: "No se pudo actualizar el correo" }, { status: 500 });
  }
}
