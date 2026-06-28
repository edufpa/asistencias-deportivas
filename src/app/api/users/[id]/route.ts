import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { log } from "@/lib/logger";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import {
  canManageUsers,
  canAssignRole,
  normalizeRole,
} from "@/lib/permissions";

const VALID_ROLES = new Set<string>(["SUPER_ADMIN", "COMISION", "COACH", "PARENT"]);

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageUsers(ctx.role)) return forbidden("Solo administradores");

  const { id } = await params;
  const body = await req.json();
  const { name, role, newPassword, linkedPlayerIds } = body;

  const existing = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!existing) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (!canAssignRole(ctx.role, normalizeRole(existing.role))) {
    return forbidden("No podés editar este usuario");
  }

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;
  if (newPassword) updateData.passwordHash = await bcrypt.hash(newPassword, 10);

  if (role && VALID_ROLES.has(role)) {
    const targetRole = normalizeRole(role);
    if (!canAssignRole(ctx.role, targetRole)) {
      return forbidden("No podés asignar ese rol");
    }
    updateData.role = targetRole;
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true },
  });

  const finalRole = normalizeRole(user.role);
  if (Array.isArray(linkedPlayerIds) && finalRole === "PARENT") {
    await prisma.userPlayer.deleteMany({ where: { userId: id } });
    if (linkedPlayerIds.length > 0) {
      await prisma.userPlayer.createMany({
        data: linkedPlayerIds.map((playerId: string) => ({ userId: id, playerId })),
      });
    }
  } else if (finalRole !== "PARENT") {
    await prisma.userPlayer.deleteMany({ where: { userId: id } });
  }

  await log({
    userId: ctx.userId,
    action: "USER_UPDATED",
    entity: "user",
    entityId: id,
    detail: `Usuario "${user.name}" actualizado`,
  });

  return NextResponse.json(user);
}
