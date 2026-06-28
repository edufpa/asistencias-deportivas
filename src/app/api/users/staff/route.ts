import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canAccessTorneos } from "@/lib/permissions";

export async function GET() {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canAccessTorneos(ctx.role)) return forbidden();

  const users = await prisma.user.findMany({
    where: { accountStatus: "APPROVED", role: { not: "PARENT" } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
