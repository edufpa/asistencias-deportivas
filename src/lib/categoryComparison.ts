import { prisma } from "@/lib/prisma";
import {
  CATEGORY_LABELS,
  getBirthYear,
  getPlayerCategory,
  matchesPlayerGender,
  type Category,
  type PlayerGender,
} from "@/lib/player";
import { summarizeReportRecords, type RecordRow } from "@/lib/reportesAsistencia";
import type { Category as PrismaCategory } from "@prisma/client";

export async function getPlayersInAgeCategory(
  category: Category,
  gender: PlayerGender,
  referenceYear: number
) {
  const all = await prisma.player.findMany({
    where: { playerStatus: "ACTIVE" },
    select: { id: true, birthDate: true, gender: true },
  });
  return all.filter(
    (p) =>
      getPlayerCategory(getBirthYear(p.birthDate), referenceYear) === category &&
      matchesPlayerGender(p.gender, gender)
  );
}

export async function getCategoryAttendanceComparison(
  playerId: string,
  from: Date | null,
  to: Date | null
) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { birthDate: true, gender: true },
  });
  if (!player) return null;

  const referenceYear = to?.getUTCFullYear() ?? from?.getUTCFullYear() ?? new Date().getFullYear();
  const gender: PlayerGender = player.gender === "FEMALE" ? "FEMALE" : "MALE";
  const category = getPlayerCategory(getBirthYear(player.birthDate), referenceYear);

  const sessionWhere: Record<string, unknown> = {
    category: category as PrismaCategory,
    convocatoriaId: null,
  };
  if (from || to) {
    sessionWhere.sessionDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const sessions = await prisma.attendanceSession.findMany({
    where: sessionWhere,
    select: { id: true },
  });
  const sessionIds = sessions.map((s) => s.id);
  if (sessionIds.length === 0) {
    return {
      category,
      categoryLabel: CATEGORY_LABELS[category],
      playerAttendancePct: null,
      categoryAttendancePct: null,
      diff: null,
      rank: null,
      totalPlayers: 0,
      aboveAverage: null,
    };
  }

  const categoryPlayers = await getPlayersInAgeCategory(category, gender, referenceYear);
  const categoryPlayerIds = new Set(categoryPlayers.map((p) => p.id));

  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId: { in: sessionIds } },
    select: { playerId: true, sessionId: true, status: true, performanceScore: true },
  });

  const scopedRecords = records.filter((r) => categoryPlayerIds.has(r.playerId));

  const recordsByPlayer = new Map<string, RecordRow[]>();
  for (const r of scopedRecords) {
    if (!recordsByPlayer.has(r.playerId)) recordsByPlayer.set(r.playerId, []);
    recordsByPlayer.get(r.playerId)!.push(r);
  }

  const ranking = categoryPlayers.map((p) => {
    const playerRecords = recordsByPlayer.get(p.id) ?? [];
    const stats = summarizeReportRecords(playerRecords);
    return { playerId: p.id, ...stats };
  });

  ranking.sort((a, b) => {
    if (a.totalRegistered === 0 && b.totalRegistered === 0) return 0;
    if (a.totalRegistered === 0) return 1;
    if (b.totalRegistered === 0) return -1;
    return (b.attendancePct ?? 0) - (a.attendancePct ?? 0);
  });

  const categoryStats = summarizeReportRecords(scopedRecords);
  const playerStats = summarizeReportRecords(recordsByPlayer.get(playerId) ?? []);

  const playerPct = playerStats.attendancePct;
  const categoryPct = categoryStats.attendancePct;
  const rankIndex = ranking.findIndex((r) => r.playerId === playerId);
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;

  return {
    category,
    categoryLabel: CATEGORY_LABELS[category],
    playerAttendancePct: playerPct,
    categoryAttendancePct: categoryPct,
    diff:
      playerPct !== null && categoryPct !== null ? playerPct - categoryPct : null,
    rank,
    totalPlayers: categoryPlayers.length,
    aboveAverage:
      playerPct !== null && categoryPct !== null ? playerPct >= categoryPct : null,
  };
}

export async function getCategoryTestAverages(playerId: string) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { birthDate: true, gender: true },
  });
  if (!player) return new Map<string, number>();

  const referenceYear = new Date().getFullYear();
  const gender: PlayerGender = player.gender === "FEMALE" ? "FEMALE" : "MALE";
  const category = getPlayerCategory(getBirthYear(player.birthDate), referenceYear);
  const categoryPlayers = await getPlayersInAgeCategory(category, gender, referenceYear);
  const playerIds = categoryPlayers.map((p) => p.id);

  if (playerIds.length === 0) return new Map<string, number>();

  const evaluations = await prisma.testEvaluation.findMany({
    where: { playerId: { in: playerIds } },
    orderBy: { evalDate: "desc" },
    select: { testId: true, playerId: true, value: true },
  });

  const latestByPlayerTest = new Map<string, number>();
  for (const ev of evaluations) {
    const key = `${ev.playerId}:${ev.testId}`;
    if (!latestByPlayerTest.has(key)) {
      latestByPlayerTest.set(key, ev.value);
    }
  }

  const byTest = new Map<string, number[]>();
  for (const [key, value] of latestByPlayerTest) {
    const testId = key.split(":")[1];
    if (!byTest.has(testId)) byTest.set(testId, []);
    byTest.get(testId)!.push(value);
  }

  const averages = new Map<string, number>();
  for (const [testId, values] of byTest) {
    if (values.length === 0) continue;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    averages.set(testId, Math.round(avg * 100) / 100);
  }

  return averages;
}
