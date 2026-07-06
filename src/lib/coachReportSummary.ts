import { prisma } from "@/lib/prisma";

export type MatchSummary = {
  wins: number;
  losses: number;
  draws: number;
  total: number;
};

export async function getConvocatoriaMatchSummary(convocatoriaId: string): Promise<MatchSummary> {
  const matches = await prisma.match.findMany({
    where: { convocatoriaId },
    select: { homeScore: true, awayScore: true },
  });

  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (const m of matches) {
    if (m.homeScore === null || m.awayScore === null) continue;
    if (m.homeScore > m.awayScore) wins++;
    else if (m.homeScore < m.awayScore) losses++;
    else draws++;
  }

  return { wins, losses, draws, total: matches.length };
}
