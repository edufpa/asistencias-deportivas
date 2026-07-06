import { prisma } from "@/lib/prisma";
import {
  emptyMatchPlayerStats,
  hasAnyMatchStat,
  statsToDbPayload,
  type MatchPlayerStats,
} from "@/lib/matchPlayerStats";
import { validateMatchGoalsAgainstScore } from "@/lib/matchGoalsValidation";

export type StatSaveRow = {
  playerId: string;
  quarter: number;
  minutesPlayed?: number | null;
} & Partial<MatchPlayerStats>;

export async function saveMatchPlayerStats(matchId: string, stats: StatSaveRow[]) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { homeScore: true },
  });
  if (!match) {
    return { ok: false as const, status: 404, error: "Partido no encontrado" };
  }

  const goalsError = validateMatchGoalsAgainstScore(stats, match.homeScore);
  if (goalsError) {
    return { ok: false as const, status: 400, error: goalsError };
  }

  await prisma.$transaction(async (tx) => {
    for (const s of stats) {
      const values = statsToDbPayload({ ...emptyMatchPlayerStats(), ...s });
      if (!hasAnyMatchStat(values)) continue;
      await tx.matchPlayerStat.upsert({
        where: { matchId_playerId_quarter: { matchId, playerId: s.playerId, quarter: s.quarter } },
        update: { ...values, minutesPlayed: s.minutesPlayed ?? null },
        create: {
          matchId,
          playerId: s.playerId,
          quarter: s.quarter,
          ...values,
          minutesPlayed: s.minutesPlayed ?? null,
        },
      });
    }
  });

  return { ok: true as const };
}
