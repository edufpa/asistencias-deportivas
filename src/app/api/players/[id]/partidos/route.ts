import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionRole, forbidden, parentCanAccessPlayer } from "@/lib/auth-session";
import { statsFromDb, emptyMatchPlayerStats, sumMatchStats, hasAnyMatchStat } from "@/lib/matchPlayerStats";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: playerId } = await params;

  if (!(await parentCanAccessPlayer(ctx.userId, ctx.role, playerId))) {
    return forbidden("No tenés acceso a este jugador");
  }

  const matchRows = await prisma.match.findMany({
    where: { playerStats: { some: { playerId } } },
    include: {
      convocatoria: { select: { id: true, name: true } },
      playerStats: { where: { playerId }, orderBy: { quarter: "asc" } },
    },
    orderBy: { matchDate: "desc" },
  });

  const matches = matchRows
    .map((m) => {
      const quarters = m.playerStats.map((s) => ({ quarter: s.quarter, ...statsFromDb(s) }));
      const totals = quarters.reduce((acc, q) => sumMatchStats(acc, q), emptyMatchPlayerStats());
      return {
        matchId: m.id,
        matchDate: m.matchDate.toISOString(),
        matchType: m.matchType,
        opponent: m.opponent,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        convocatoriaId: m.convocatoriaId,
        convocatoriaName: m.convocatoria?.name ?? "Amistoso",
        isFriendly: !m.convocatoriaId,
        quarters,
        totals,
      };
    })
    .filter((m) => hasAnyMatchStat(m.totals));

  return NextResponse.json({ matches });
}
