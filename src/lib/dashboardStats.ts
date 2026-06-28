import { prisma } from "@/lib/prisma";
import { summarizeReportRecords } from "@/lib/reportesAsistencia";

const KPI_DAYS = 30;

export function getDashboardDateRange(days = KPI_DAYS) {
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  from.setUTCHours(0, 0, 0, 0);
  return { from, to, days };
}

export async function getDashboardKpis() {
  const { from, to, days } = getDashboardDateRange();

  const [sessionCount, records, activePlayers, testEvaluations, pendingUsers] =
    await Promise.all([
      prisma.attendanceSession.count({
        where: {
          convocatoriaId: null,
          sessionDate: { gte: from, lte: to },
        },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          session: {
            convocatoriaId: null,
            sessionDate: { gte: from, lte: to },
          },
        },
        select: {
          playerId: true,
          sessionId: true,
          status: true,
          performanceScore: true,
        },
      }),
      prisma.player.count({ where: { playerStatus: "ACTIVE" } }),
      prisma.testEvaluation.count({
        where: { evalDate: { gte: from, lte: to } },
      }),
      prisma.user.count({ where: { accountStatus: "PENDING" } }),
    ]);

  const attendance = summarizeReportRecords(records);
  const playersWithRecords = new Set(records.map((r) => r.playerId)).size;

  return {
    periodDays: days,
    attendancePct: attendance.attendancePct,
    totalRegistered: attendance.totalRegistered,
    sessionCount,
    activePlayers,
    playersWithRecords,
    testEvaluations,
    pendingUsers,
  };
}
