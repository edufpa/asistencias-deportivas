import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { log } from "@/lib/logger";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import {
  canManageUsers,
  canAssignRole,
  normalizeRole,
  type AppRole,
} from "@/lib/permissions";

const VALID_ROLES = new Set<string>(["SUPER_ADMIN", "COMISION", "COACH", "PARENT"]);

export async function GET() {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageUsers(ctx.role)) return forbidden("Solo administradores");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      accountStatus: true,
      createdAt: true,
      linkedPlayers: { select: { playerId: true } },
    },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      accountStatus: u.accountStatus,
      createdAt: u.createdAt,
      linkedPlayerIds: u.linkedPlayers.map((l) => l.playerId),
    }))
  );
}

export async function POST(req: NextRequest) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageUsers(ctx.role)) return forbidden("Solo administradores");

  const body = await req.json();
  const { name, email, password, role, linkedPlayerIds } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Nombre, email y contraseña son requeridos" }, { status: 400 });
  }

  const targetRole = normalizeRole(role ?? "COACH");
  if (!VALID_ROLES.has(targetRole)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }
  if (!canAssignRole(ctx.role, targetRole)) {
    return forbidden("No podés asignar ese rol");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: targetRole,
      accountStatus: "APPROVED",
      linkedPlayers:
        targetRole === "PARENT" && Array.isArray(linkedPlayerIds)
          ? {
              create: linkedPlayerIds.map((playerId: string) => ({ playerId })),
            }
          : undefined,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  await log({
    userId: ctx.userId,
    action: "USER_CREATED",
    entity: "user",
    entityId: user.id,
    detail: `Usuario "${name}" (${email}) creado con rol ${user.role}`,
  });

  return NextResponse.json(user, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageUsers(ctx.role)) return forbidden("Solo administradores");

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  if (id === ctx.userId) {
    return NextResponse.json({ error: "No podés eliminarte a vos mismo" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, name: true, email: true } });
  if (target && !canAssignRole(ctx.role, normalizeRole(target.role))) {
    return forbidden("No podés eliminar este usuario");
  }

  await prisma.user.delete({ where: { id } });

  await log({
    userId: ctx.userId,
    action: "USER_DELETED",
    entity: "user",
    entityId: id,
    detail: `Usuario "${target?.name}" (${target?.email}) eliminado`,
  });

  return NextResponse.json({ success: true });
}
