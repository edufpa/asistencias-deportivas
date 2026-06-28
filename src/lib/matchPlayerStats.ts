export const MATCH_PLAYER_STAT_COLS = [
  { key: "goals", label: "Gol a favor", short: "GF", color: "text-green-700" },
  { key: "missedShots", label: "Tiros fallados", short: "TF", color: "text-gray-600" },
  { key: "exclusionsGenerated", label: "Expulsión generada", short: "Exp+", color: "text-emerald-700" },
  { key: "exclusionsAgainst", label: "Expulsión en contra", short: "Exp-", color: "text-red-700" },
  { key: "penaltiesGenerated", label: "Penal generado", short: "Pen+", color: "text-teal-700" },
  { key: "penaltiesAgainst", label: "Penal en contra", short: "Pen-", color: "text-orange-700" },
  { key: "assists", label: "Pase gol", short: "PG", color: "text-blue-700" },
  { key: "badPasses", label: "Pase errado", short: "PE", color: "text-slate-600" },
  { key: "counterattacks", label: "Contragolpe", short: "CG", color: "text-indigo-700" },
  { key: "blocksSteals", label: "Bloqueos/robos", short: "BR", color: "text-purple-700" },
] as const;

export type MatchPlayerStatKey = (typeof MATCH_PLAYER_STAT_COLS)[number]["key"];

export type MatchPlayerStats = Record<MatchPlayerStatKey, number>;

export function emptyMatchPlayerStats(): MatchPlayerStats {
  return {
    goals: 0,
    missedShots: 0,
    exclusionsGenerated: 0,
    exclusionsAgainst: 0,
    penaltiesGenerated: 0,
    penaltiesAgainst: 0,
    assists: 0,
    badPasses: 0,
    counterattacks: 0,
    blocksSteals: 0,
  };
}

export function hasAnyMatchStat(stats: MatchPlayerStats): boolean {
  return MATCH_PLAYER_STAT_COLS.some((col) => stats[col.key] > 0);
}

export function sumMatchStats(a: MatchPlayerStats, b: MatchPlayerStats): MatchPlayerStats {
  const out = emptyMatchPlayerStats();
  for (const col of MATCH_PLAYER_STAT_COLS) {
    out[col.key] = a[col.key] + b[col.key];
  }
  return out;
}

export function statsFromDb(row: Partial<MatchPlayerStats>): MatchPlayerStats {
  const base = emptyMatchPlayerStats();
  for (const col of MATCH_PLAYER_STAT_COLS) {
    base[col.key] = row[col.key] ?? 0;
  }
  return base;
}

export function statsToDbPayload(stats: MatchPlayerStats) {
  return { ...stats };
}
