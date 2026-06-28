import { auth } from "@/lib/auth";
import { normalizeRole, type AppRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function getSessionRole() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, accountStatus: true },
  });

  if (!dbUser || dbUser.accountStatus !== "APPROVED") return null;

  const role = normalizeRole(dbUser.role);
  return { session, role, userId: dbUser.id };
}

export function forbidden(message = "No autorizado") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requireSessionRole() {
  const ctx = await getSessionRole();
  if (!ctx) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  return { ctx };
}

export async function getLinkedPlayerIds(userId: string, role: AppRole): Promise<string[] | null> {
  if (role !== "PARENT") return null;
  const { prisma } = await import("@/lib/prisma");
  const links = await prisma.userPlayer.findMany({
    where: { userId },
    select: { playerId: true },
  });
  return links.map((l) => l.playerId);
}

export async function parentCanAccessPlayer(
  userId: string,
  role: AppRole,
  playerId: string
): Promise<boolean> {
  if (role !== "PARENT") return true;
  const linked = await getLinkedPlayerIds(userId, role);
  return linked?.includes(playerId) ?? false;
}
