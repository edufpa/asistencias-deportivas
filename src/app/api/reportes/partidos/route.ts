import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const convocatoriaId = searchParams.get("convocatoriaId");
  const matchType = searchParams.get("matchType"); // ALL | OFFICIAL | PRACTICE
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Record<string, unknown> = {};
  if (convocatoriaId) where.convocatoriaId = convocatoriaId;
  if (matchType && matchType !== "ALL") where.matchType = matchType;
  if (dateFrom || dateTo) {
    where.matchDate = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
    };
  }

  const matches = await prisma.match.findMany({
    where,
    orderBy: { matchDate: "desc" },
    include: {
      convocatoria: { select: { name: true } },
      createdBy: { select: { name: true } },
      playerStats: {
        include: { player: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });

  // Build per-match summary
  const matchSummaries = matches.map((m) => {
    const statsByPlayer = new Map<string, { name: string; goals: number; assists: number; recoveries: number; expulsions: number; penalties: number }>();
    for (const ps of m.playerStats) {
      const key = ps.playerId;
      if (!statsByPlayer.has(key)) {
        statsByPlayer.set(key, { name: `${ps.player.lastName}, ${ps.player.firstName}`, goals: 0, assists: 0, recoveries: 0, expulsions: 0, penalties: 0 });
      }
      const s = statsByPlayer.get(key)!;
      s.goals += ps.goals;
      s.assists += ps.assists;
      s.recoveries += ps.recoveries;
      s.expulsions += ps.expulsions;
      s.penalties += ps.penalties;
    }

    const playerList = Array.from(statsByPlayer.entries()).map(([id, s]) => ({ id, ...s }));
    const topScorer = playerList.sort((a, b) => b.goals - a.goals)[0];
    const totalGoals = playerList.reduce((sum, p) => sum + p.goals, 0);

    return {
      id: m.id,
      matchDate: m.matchDate,
      matchType: m.matchType,
      opponent: m.opponent,
      location: m.location,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      quarterDuration: m.quarterDuration,
      evalOverall: m.evalOverall,
      evalAttack: m.evalAttack,
      evalDefense: m.evalDefense,
      evalFinishing: m.evalFinishing,
      notes: m.notes,
      convocatoriaId: m.convocatoriaId,
      convocatoriaName: m.convocatoria.name,
      createdBy: m.createdBy.name,
      totalGoals,
      topScorer: topScorer?.goals > 0 ? { name: topScorer.name, goals: topScorer.goals } : null,
      playerCount: statsByPlayer.size,
    };
  });

  // Aggregated team eval averages
  const withEvals = matches.filter((m) => m.evalOverall);
  const avgEvals =
    withEvals.length > 0
      ? {
          overall: Math.round((withEvals.reduce((s, m) => s + (m.evalOverall ?? 0), 0) / withEvals.length) * 10) / 10,
          attack: Math.round((withEvals.reduce((s, m) => s + (m.evalAttack ?? 0), 0) / withEvals.length) * 10) / 10,
          defense: Math.round((withEvals.reduce((s, m) => s + (m.evalDefense ?? 0), 0) / withEvals.length) * 10) / 10,
          finishing: Math.round((withEvals.reduce((s, m) => s + (m.evalFinishing ?? 0), 0) / withEvals.length) * 10) / 10,
        }
      : null;

  const totalGoals = matchSummaries.reduce((s, m) => s + m.totalGoals, 0);
  const wins = matchSummaries.filter((m) => m.homeScore !== null && m.awayScore !== null && m.homeScore > m.awayScore).length;
  const losses = matchSummaries.filter((m) => m.homeScore !== null && m.awayScore !== null && m.homeScore < m.awayScore).length;
  const draws = matchSummaries.filter((m) => m.homeScore !== null && m.awayScore !== null && m.homeScore === m.awayScore).length;

  return NextResponse.json({
    matches: matchSummaries,
    summary: {
      total: matches.length,
      official: matches.filter((m) => m.matchType === "OFFICIAL").length,
      practice: matches.filter((m) => m.matchType === "PRACTICE").length,
      wins, losses, draws, totalGoals, avgEvals,
    },
  });
}
