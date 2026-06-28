import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  if (user.accountStatus === "PENDING") {
    return NextResponse.json({
      error: "pending",
      message: "Tu cuenta está pendiente de aprobación por la comisión del club.",
    });
  }

  if (user.accountStatus === "REJECTED") {
    return NextResponse.json({
      error: "rejected",
      message: "Tu solicitud de acceso fue rechazada. Contactá a la comisión del club.",
    });
  }

  return NextResponse.json({ ok: true, role: user.role });
}
