import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canAccessAdminPanel } from "@/lib/permissions";
import {
  hasAttendanceSeasonOverlap,
  validateAttendanceSeasonPayload,
} from "@/lib/attendanceSeason";
import { parseDateOnlyUtc } from "@/lib/attendanceSeasonShared";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canAccessAdminPanel(ctx.role)) return forbidden("No tenés permiso para administrar la temporada");

  const { id } = await params;
  const validation = validateAttendanceSeasonPayload(await req.json());
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const data = validation.data;
  if (await hasAttendanceSeasonOverlap({ ...data, excludeId: id })) {
    return NextResponse.json(
      { error: "Ya existe un periodo de temporada que cruza esas fechas" },
      { status: 400 }
    );
  }

  const startDate = parseDateOnlyUtc(data.startDate)!;
  const endDate = parseDateOnlyUtc(data.endDate)!;
  const period = await prisma.$transaction(async (tx) => {
    await tx.attendanceSeasonPeriodSession.deleteMany({ where: { periodId: id } });
    return tx.attendanceSeasonPeriod.update({
      where: { id },
      data: {
        name: data.name,
        startDate,
        endDate,
        sessions: {
          create: data.sessions.map((session) => ({
            sessionType: session.sessionType,
            weekdays: session.weekdays,
            sortOrder: session.sortOrder,
          })),
        },
      },
      include: { sessions: true },
    });
  });

  return NextResponse.json(period);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canAccessAdminPanel(ctx.role)) return forbidden("No tenés permiso para administrar la temporada");

  const { id } = await params;
  await prisma.attendanceSeasonPeriod.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
