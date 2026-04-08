import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "ADMIN")
    return NextResponse.json({ error: "Solo admins" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const entity = searchParams.get("entity");
  const userId = searchParams.get("userId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const take = parseInt(searchParams.get("take") ?? "100");

  const where: Record<string, unknown> = {};
  if (entity) where.entity = entity;
  if (userId) where.userId = userId;
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
    };
  }

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(take, 500),
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json(logs);
}
