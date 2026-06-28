import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS } from "@/lib/player";
import { SESSION_TYPE_LABEL, TRAINING_SESSION_OPTIONS } from "@/lib/attendance";
import type { Category, SessionType } from "@prisma/client";
import { getSessionRole, forbidden, parentCanAccessPlayer } from "@/lib/auth-session";
import { getCategoryAttendanceComparison } from "@/lib/categoryComparison";

const PRESET_PERIODS = new Set([7, 15, 30, 90, 180, 365]);

function parseDateOnly(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function resolveDateRange(searchParams: URLSearchParams): { from: Date | null; to: Date | null } {
  const period = searchParams.get("period");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (period === "custom") {
    const from = parseDateOnly(dateFrom);
    const to = parseDateOnly(dateTo);
    if (to) to.setUTCHours(23, 59, 59, 999);
    return { from, to };
  }

  const days = period ? parseInt(period, 10) : 30;
  if (!PRESET_PERIODS.has(days)) {
    return { from: null, to: null };
  }

  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  from.setUTCHours(0, 0, 0, 0);

  return { from, to };
}

function summarizeBySessionType(
  records: {
    status: string;
    performanceScore: number | null;
    session: { sessionType: SessionType };
  }[]
) {
  return TRAINING_SESSION_OPTIONS.map(({ value, short }) => {
    const subset = records.filter((r) => r.session.sessionType === value);
    const attended = subset.filter((r) => r.status === "ATTENDED").length;
    const justif = subset.filter((r) => r.status === "ABSENT_JUSTIFIED").length;
    const unjustif = subset.filter((r) => r.status === "ABSENT_UNJUSTIFIED").length;
    const total = subset.length;
    const scores = subset
      .filter((r) => r.status === "ATTENDED" && r.performanceScore)
      .map((r) => r.performanceScore as number);
    const avgScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : null;

    return {
      sessionType: value,
      label: short,
      total,
      attended,
      justif,
      unjustif,
      attendancePct: total > 0 ? Math.round((attended / total) * 100) : null,
      avgScore,
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

  const { from, to } = resolveDateRange(new URL(req.url).searchParams);

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
      sessionLabel: SESSION_TYPE_LABEL[r.session.sessionType],
      category: r.session.category as Category,
      categoryLabel: r.session.category
        ? CATEGORY_LABELS[r.session.category as keyof typeof CATEGORY_LABELS]
        : "",
      status: r.status,
      performanceScore: r.performanceScore,
      absenceReason: r.absenceReason,
    };
  });

  const attended = records.filter((r) => r.status === "ATTENDED").length;
  const justif = records.filter((r) => r.status === "ABSENT_JUSTIFIED").length;
  const unjustif = records.filter((r) => r.status === "ABSENT_UNJUSTIFIED").length;
  const total = records.length;
  const scores = records
    .filter((r) => r.status === "ATTENDED" && r.performanceScore)
    .map((r) => r.performanceScore as number);
  const avgScore =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

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
    bySessionType: summarizeBySessionType(records),
    rows,
    chartSeries,
    categoryComparison,
    filter: {
      period: new URL(req.url).searchParams.get("period") ?? "30",
      dateFrom: from?.toISOString().split("T")[0] ?? null,
      dateTo: to?.toISOString().split("T")[0] ?? null,
    },
  });
}
