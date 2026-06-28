import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { validateNewPassword } from "@/lib/password";
import { findValidPasswordResetToken, resetPasswordWithToken } from "@/lib/passwordReset";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { token } = await context.params;

  try {
    const record = await findValidPasswordResetToken(token);
    if (!record) {
      return NextResponse.json({ valid: false, error: "Enlace inválido o expirado" }, { status: 400 });
    }

    return NextResponse.json({ valid: true, email: record.user.email });
  } catch (error) {
    console.error("[reset-password GET] error:", error);
    return NextResponse.json({ error: "Error al validar el enlace" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  const passwordConfirm =
    typeof body.passwordConfirm === "string" ? body.passwordConfirm : "";

  const validationError = validateNewPassword(password, passwordConfirm);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const ok = await resetPasswordWithToken(token, passwordHash);

    if (!ok) {
      return NextResponse.json({ error: "Enlace inválido o expirado" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: "Contraseña actualizada. Ya podés iniciar sesión.",
    });
  } catch (error) {
    console.error("[reset-password POST] error:", error);
    return NextResponse.json({ error: "No se pudo actualizar la contraseña" }, { status: 500 });
  }
}
