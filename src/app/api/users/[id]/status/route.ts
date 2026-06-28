import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canManageUsers, canAssignRole, normalizeRole } from "@/lib/permissions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageUsers(ctx.role)) return forbidden("Solo administradores");

  const { id } = await params;
  const body = await req.json();
  const action = body.action as "approve" | "reject";

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, accountStatus: true },
  });

  if (!existing) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (!canAssignRole(ctx.role, normalizeRole(existing.role))) {
    return forbidden("No podés gestionar este usuario");
  }

  if (existing.accountStatus !== "PENDING") {
    return NextResponse.json(
      { error: "Solo se pueden aprobar o rechazar cuentas pendientes" },
      { status: 400 }
    );
  }

  const accountStatus = action === "approve" ? "APPROVED" : "REJECTED";

  const user = await prisma.user.update({
    where: { id },
    data: { accountStatus },
    select: { id: true, name: true, email: true, role: true, accountStatus: true },
  });

  await log({
    userId: ctx.userId,
    action: action === "approve" ? "USER_APPROVED" : "USER_REJECTED",
    entity: "user",
    entityId: id,
    detail: `Usuario "${user.name}" ${action === "approve" ? "aprobado" : "rechazado"}`,
  });

  return NextResponse.json(user);
}
