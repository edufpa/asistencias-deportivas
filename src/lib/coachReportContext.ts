import { prisma } from "@/lib/prisma";
import { formatPlayerName } from "@/lib/player";
import { emptyMatchPlayerStats, statsFromDb, sumMatchStats, type MatchPlayerStats } from "@/lib/matchPlayerStats";

export type ConvocadoRow = {
  playerId: string;
  name: string;
  capNumber: number | null;
};

export type MatchResultRow = {
  id: string;
  date: string;
  opponent: string;
  location: string | null;
  matchType: string;
  homeScore: number | null;
  awayScore: number | null;
  outcome: "G" | "P" | "E" | "—";
  scoreLabel: string;
};

export type PlayerAccumulatedStats = {
  playerId: string;
  name: string;
  goals: number;
  assists: number;
  exclusionsGenerated: number;
  exclusionsAgainst: number;
  penaltiesAgainst: number;
  penaltiesGenerated: number;
};

export type CoachReportContext = {
  convocados: ConvocadoRow[];
  matches: MatchResultRow[];
  playerStats: PlayerAccumulatedStats[];
  teamTotals: Pick<
    PlayerAccumulatedStats,
    "goals" | "assists" | "exclusionsGenerated" | "exclusionsAgainst" | "penaltiesAgainst" | "penaltiesGenerated"
  >;
};

function matchOutcome(home: number | null, away: number | null): MatchResultRow["outcome"] {
  if (home === null || away === null) return "—";
  if (home > away) return "G";
  if (home < away) return "P";
  return "E";
}

function formatMatchDate(d: Date): string {
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

export async function getCoachReportContext(convocatoriaId: string): Promise<CoachReportContext> {
  const [convocadosRaw, matchesRaw] = await Promise.all([
    prisma.convocatoriaPlayer.findMany({
      where: { convocatoriaId, status: "ACTIVE" },
      include: {
        player: {
          select: { id: true, firstName: true, paternalLastName: true, maternalLastName: true },
        },
      },
      orderBy: [{ capNumber: "asc" }, { joinedAt: "asc" }],
    }),
    prisma.match.findMany({
      where: { convocatoriaId },
      orderBy: { matchDate: "asc" },
      include: {
        playerStats: {
          include: {
            player: {
              select: { id: true, firstName: true, paternalLastName: true, maternalLastName: true },
            },
          },
        },
      },
    }),
  ]);

  const convocados: ConvocadoRow[] = convocadosRaw.map((cp) => ({
    playerId: cp.player.id,
    name: formatPlayerName(cp.player),
    capNumber: cp.capNumber,
  }));

  const matches: MatchResultRow[] = matchesRaw.map((m) => {
    const outcome = matchOutcome(m.homeScore, m.awayScore);
    const scoreLabel =
      m.homeScore !== null && m.awayScore !== null
        ? `${m.homeScore} - ${m.awayScore}`
        : "Sin marcador";
    return {
      id: m.id,
      date: formatMatchDate(m.matchDate),
      opponent: m.opponent?.trim() || "Sin rival",
      location: m.location,
      matchType: m.matchType === "OFFICIAL" ? "Oficial" : "Práctica",
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      outcome,
      scoreLabel,
    };
  });

  const byPlayer = new Map<string, PlayerAccumulatedStats>();

  for (const m of matchesRaw) {
    const perMatch = new Map<string, MatchPlayerStats>();
    for (const ps of m.playerStats) {
      const prev = perMatch.get(ps.playerId) ?? emptyMatchPlayerStats();
      perMatch.set(ps.playerId, sumMatchStats(prev, statsFromDb(ps)));
    }
    for (const [playerId, stats] of perMatch) {
      const player = m.playerStats.find((ps) => ps.playerId === playerId)?.player;
      if (!player) continue;
      const existing = byPlayer.get(playerId) ?? {
        playerId,
        name: formatPlayerName(player),
        goals: 0,
        assists: 0,
        exclusionsGenerated: 0,
        exclusionsAgainst: 0,
        penaltiesAgainst: 0,
        penaltiesGenerated: 0,
      };
      existing.goals += stats.goals;
      existing.assists += stats.assists;
      existing.exclusionsGenerated += stats.exclusionsGenerated;
      existing.exclusionsAgainst += stats.exclusionsAgainst;
      existing.penaltiesAgainst += stats.penaltiesAgainst;
      existing.penaltiesGenerated += stats.penaltiesGenerated;
      byPlayer.set(playerId, existing);
    }
  }

  const playerStats = Array.from(byPlayer.values())
    .filter(
      (p) =>
        p.goals > 0 ||
        p.assists > 0 ||
        p.exclusionsGenerated > 0 ||
        p.exclusionsAgainst > 0 ||
        p.penaltiesAgainst > 0 ||
        p.penaltiesGenerated > 0
    )
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));

  const teamTotals = playerStats.reduce(
    (acc, p) => ({
      goals: acc.goals + p.goals,
      assists: acc.assists + p.assists,
      exclusionsGenerated: acc.exclusionsGenerated + p.exclusionsGenerated,
      exclusionsAgainst: acc.exclusionsAgainst + p.exclusionsAgainst,
      penaltiesAgainst: acc.penaltiesAgainst + p.penaltiesAgainst,
      penaltiesGenerated: acc.penaltiesGenerated + p.penaltiesGenerated,
    }),
    { goals: 0, assists: 0, exclusionsGenerated: 0, exclusionsAgainst: 0, penaltiesAgainst: 0, penaltiesGenerated: 0 }
  );

  return { convocados, matches, playerStats, teamTotals };
}
