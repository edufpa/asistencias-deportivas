import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS } from "@/lib/player";
import type { Category, SessionType } from "@prisma/client";
import { getSessionRole, forbidden, parentCanAccessPlayer } from "@/lib/auth-session";
import { getCategoryAttendanceComparison } from "@/lib/categoryComparison";
import { getAttendanceSeasonOptionsForReportRange } from "@/lib/attendanceSeason";
import { resolveReportDateRange } from "@/lib/reportesAsistencia";
import type { SeasonSessionOption } from "@/lib/attendanceSeasonShared";

function summarizeBySessionType(
  records: {
    status: string;
    session: { sessionType: SessionType };
  }[],
  sessionOptions: SeasonSessionOption[]
) {
  return sessionOptions.map(({ value, short }) => {
    const subset = records.filter((r) => r.session.sessionType === value);
    const attended = subset.filter((r) => r.status === "ATTENDED").length;
    const justif = subset.filter((r) => r.status === "ABSENT_JUSTIFIED").length;
    const unjustif = subset.filter((r) => r.status === "ABSENT_UNJUSTIFIED").length;
    const total = subset.length;

    return {
      sessionType: value,
      label: short,
      total,
      attended,
      justif,
      unjustif,
      attendancePct: total > 0 ? Math.round((attended / total) * 100) : null,
      avgScore: null,
    };
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: playerId } = await params;

  if (!(await parentCanAccessPlayer(ctx.userId, ctx.role, playerId))) {
    return forbidden("No tenés acceso a este jugador");
  }

  const { searchParams } = new URL(req.url);
  const { from, to } = await resolveReportDateRange(searchParams);
  const reportSessionOptions = await getAttendanceSeasonOptionsForReportRange(from, to);
  const reportSessionTypes = reportSessionOptions.map((opt) => opt.value);
  const sessionLabelByType = new Map(
    reportSessionOptions.map((opt) => [opt.value, opt.short])
  );

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      firstName: true,
      paternalLastName: true,
      maternalLastName: true,
      documentId: true,
      documentType: true,
    },
  });
  if (!player) return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });

  const records = await prisma.attendanceRecord.findMany({
    where: {
      playerId,
      session: {
        convocatoriaId: null,
        category: { not: null },
        sessionType: { in: reportSessionTypes },
        ...(from || to
          ? {
              sessionDate: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
    },
    include: {
      session: { select: { sessionDate: true, sessionType: true, category: true } },
    },
    orderBy: [{ session: { sessionDate: "desc" } }, { session: { sessionType: "asc" } }],
  });

  const rows = records.map((r) => {
    const dateKey = r.session.sessionDate.toISOString().split("T")[0];
    return {
      id: r.id,
      sessionId: r.sessionId,
      date: dateKey,
      sessionType: r.session.sessionType,
      sessionLabel: sessionLabelByType.get(r.session.sessionType) ?? r.session.sessionType,
      category: r.session.category as Category,
      categoryLabel: r.session.category
        ? CATEGORY_LABELS[r.session.category as keyof typeof CATEGORY_LABELS]
        : "",
      status: r.status,
      performanceScore: null,
      absenceReason: r.absenceReason,
    };
  });

  const attended = records.filter((r) => r.status === "ATTENDED").length;
  const justif = records.filter((r) => r.status === "ABSENT_JUSTIFIED").length;
  const unjustif = records.filter((r) => r.status === "ABSENT_UNJUSTIFIED").length;
  const total = records.length;
  const avgScore = null;

  const chronological = [...rows].reverse();
  let cumAttended = 0;
  const chartSeries = chronological.map((row, i) => {
    const totalSoFar = i + 1;
    if (row.status === "ATTENDED") cumAttended++;
    return {
      date: row.date,
      label: row.sessionLabel,
      attendancePct: Math.round((cumAttended / totalSoFar) * 100),
      attended: row.status === "ATTENDED" ? 1 : 0,
    };
  });

  const categoryComparison = await getCategoryAttendanceComparison(playerId, from, to);

  return NextResponse.json({
    player,
    summary: { attended, justif, unjustif, total, avgScore },
    bySessionType: summarizeBySessionType(records, reportSessionOptions),
    rows,
    chartSeries,
    categoryComparison,
    filter: {
      period: searchParams.get("period") ?? "30",
      dateFrom: from?.toISOString().split("T")[0] ?? null,
      dateTo: to?.toISOString().split("T")[0] ?? null,
    },
  });
}
