import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { log } from "@/lib/logger";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "ADMIN")
    return NextResponse.json({ error: "Solo admins" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, role, newPassword } = body;

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;
  if (role === "ADMIN" || role === "COACH") updateData.role = role;
  if (newPassword) updateData.passwordHash = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true },
  });

  await log({ userId: session.user?.id ?? "", action: "USER_UPDATED", entity: "user", entityId: id, detail: `Usuario "${user.name}" actualizado` });

  return NextResponse.json(user);
}
