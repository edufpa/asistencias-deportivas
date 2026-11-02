import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * One-shot helper. Remove after use.
 */
const ALLOWED_EMAIL = "elkinbuitrago01@hotmail.com";
const EXPECTED_SECRET = "97b012cb16d8eb7f64152daaed7343f63900b586e183d3ed";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-force-reset-secret") ?? "";
  if (!secret || secret !== EXPECTED_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = typeof body.role === "string" ? body.role : "SUPER_ADMIN";
  const name = typeof body.name === "string" ? body.name : "Elkin Buitrago";

  if (!email || email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: "Email no permitido" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Password requerido" }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accountStatus: true,
      },
    });

    if (!existing) {
      const created = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: role as "SUPER_ADMIN",
          accountStatus: "APPROVED",
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          accountStatus: true,
        },
      });
      return NextResponse.json({ ok: true, action: "created", user: created });
    }

    const updated = await prisma.user.update({
      where: { email },
      data: {
        name,
        passwordHash,
        role: role as "SUPER_ADMIN",
        accountStatus: "APPROVED",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accountStatus: true,
      },
    });

    return NextResponse.json({
      ok: true,
      action: "updated",
      previous: existing,
      user: updated,
    });
  } catch (error) {
    console.error("[force-user] error:", error);
    return NextResponse.json(
      { error: "Error de servidor", detail: String(error) },
      { status: 500 }
    );
  }
}
