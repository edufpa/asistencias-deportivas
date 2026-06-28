import { NextResponse } from "next/server";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canViewAdminLogs } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canViewAdminLogs(ctx.role)) return forbidden("Solo administradores");

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 500);

  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json(logs);
}
