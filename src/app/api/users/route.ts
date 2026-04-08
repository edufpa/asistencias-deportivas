import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { log } from "@/lib/logger";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "ADMIN")
    return NextResponse.json({ error: "Solo admins" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "ADMIN")
    return NextResponse.json({ error: "Solo admins" }, { status: 403 });

  const body = await req.json();
  const { name, email, password, role } = body;

  if (!name || !email || !password)
    return NextResponse.json({ error: "Nombre, email y contraseña son requeridos" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: role === "ADMIN" ? "ADMIN" : "COACH" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  await log({ userId: session.user?.id ?? "", action: "USER_CREATED", entity: "user", entityId: user.id, detail: `Usuario "${name}" (${email}) creado con rol ${user.role}` });

  return NextResponse.json(user, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "ADMIN")
    return NextResponse.json({ error: "Solo admins" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  if (id === session.user?.id) return NextResponse.json({ error: "No podés eliminarte a vos mismo" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true } });
  await prisma.user.delete({ where: { id } });

  await log({ userId: session.user?.id ?? "", action: "USER_DELETED", entity: "user", entityId: id, detail: `Usuario "${user?.name}" (${user?.email}) eliminado` });

  return NextResponse.json({ success: true });
}
