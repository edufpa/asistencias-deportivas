import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Esta ruta solo funciona si no hay ningún usuario creado (primer setup)
export async function POST(req: NextRequest) {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    return NextResponse.json(
      { error: "El sistema ya fue inicializado. Esta ruta está deshabilitada." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { name, email, password } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Nombre, email y contraseña son requeridos" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hash,
      role: "ADMIN",
    },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ success: true, user: admin }, { status: 201 });
}

export async function GET() {
  const count = await prisma.user.count();
  return NextResponse.json({ initialized: count > 0 });
}
