import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canViewAdminLogs } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canViewAdminLogs(ctx.role)) return forbidden("Solo administradores y comisión");

  const { searchParams } = new URL(req.url);
  const take = Math.min(
    parseInt(searchParams.get("take") ?? searchParams.get("limit") ?? "200", 10),
    500
  );
  const entity = searchParams.get("entity")?.trim();
  const userId = searchParams.get("userId")?.trim();
  const dateFrom = searchParams.get("dateFrom")?.trim();
  const dateTo = searchParams.get("dateTo")?.trim();

  const where: Prisma.ActivityLogWhereInput = {};
  if (entity) where.entity = entity;
  if (userId) where.userId = userId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(`${dateFrom}T00:00:00.000Z`);
    if (dateTo) {
      const end = new Date(`${dateTo}T23:59:59.999Z`);
      where.createdAt.lte = end;
    }
  }

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json(logs);
}
