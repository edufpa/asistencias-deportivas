import { emptyMatchPlayerStats, statsToDbPayload, type MatchPlayerStats } from "@/lib/matchPlayerStats";

type StatRow = { goals?: number } & Partial<MatchPlayerStats>;

/** Suma total de goles a favor registrados en las filas de estadísticas. */
export function sumPlayerGoals(stats: StatRow[]): number {
  let total = 0;
  for (const row of stats) {
    const values = statsToDbPayload({ ...emptyMatchPlayerStats(), ...row });
    total += values.goals;
  }
  return total;
}

/**
 * Los goles individuales no pueden superar el marcador del equipo (homeScore).
 * Retorna mensaje de error o null si es válido.
 */
export function validateMatchGoalsAgainstScore(
  stats: StatRow[],
  homeScore: number | null | undefined
): string | null {
  if (homeScore === null || homeScore === undefined) return null;
  const totalGoals = sumPlayerGoals(stats);
  if (totalGoals > homeScore) {
    return `La suma de goles por jugador (${totalGoals}) no puede superar el marcador del equipo (${homeScore}).`;
  }
  return null;
}
