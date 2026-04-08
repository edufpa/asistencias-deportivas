import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: playerId } = await params;

  const stats = await prisma.matchPlayerStat.findMany({
    where: { playerId },
    include: {
      match: {
        include: { convocatoria: { select: { name: true } } },
      },
    },
    orderBy: { match: { matchDate: "desc" } },
  });

  // Group by match
  const byMatch = new Map<string, {
    matchId: string; matchDate: string; matchType: string;
    opponent: string | null; homeScore: number | null; awayScore: number | null;
    convocatoriaName: string;
    quarters: { quarter: number; goals: number; assists: number; recoveries: number; expulsions: number; penalties: number }[];
    totals: { goals: number; assists: number; recoveries: number; expulsions: number; penalties: number };
  }>();

  for (const s of stats) {
    const mid = s.matchId;
    if (!byMatch.has(mid)) {
      byMatch.set(mid, {
        matchId: mid,
        matchDate: s.match.matchDate.toISOString(),
        matchType: s.match.matchType,
        opponent: s.match.opponent,
        homeScore: s.match.homeScore,
        awayScore: s.match.awayScore,
        convocatoriaName: s.match.convocatoria.name,
        quarters: [],
        totals: { goals: 0, assists: 0, recoveries: 0, expulsions: 0, penalties: 0 },
      });
    }
    const m = byMatch.get(mid)!;
    m.quarters.push({ quarter: s.quarter, goals: s.goals, assists: s.assists, recoveries: s.recoveries, expulsions: s.expulsions, penalties: s.penalties });
    m.totals.goals += s.goals;
    m.totals.assists += s.assists;
    m.totals.recoveries += s.recoveries;
    m.totals.expulsions += s.expulsions;
    m.totals.penalties += s.penalties;
  }

  const matches = Array.from(byMatch.values()).map((m) => ({
    ...m,
    quarters: m.quarters.sort((a, b) => a.quarter - b.quarter),
  }));

  const overall = matches.reduce(
    (acc, m) => ({
      goals: acc.goals + m.totals.goals,
      assists: acc.assists + m.totals.assists,
      recoveries: acc.recoveries + m.totals.recoveries,
      expulsions: acc.expulsions + m.totals.expulsions,
      penalties: acc.penalties + m.totals.penalties,
      matches: acc.matches + 1,
    }),
    { goals: 0, assists: 0, recoveries: 0, expulsions: 0, penalties: 0, matches: 0 }
  );

  return NextResponse.json({ matches, overall });
}
