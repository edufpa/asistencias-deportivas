"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState, EmptyState } from "@/components/layout";
import { cn } from "@/lib/utils";
import {
  MATCH_PLAYER_STAT_COLS,
  type MatchPlayerStats,
} from "@/lib/matchPlayerStats";

type QuarterRow = { quarter: number } & MatchPlayerStats;

type MatchStats = {
  matchId: string;
  matchDate: string;
  matchType: string;
  opponent: string | null;
  homeScore: number | null;
  awayScore: number | null;
  convocatoriaName: string;
  isFriendly: boolean;
  quarters: QuarterRow[];
  totals: MatchPlayerStats;
};

function statDisplay(value: number) {
  return value > 0 ? value : "—";
}

function MatchStatsTable({ quarters, totals }: { quarters: QuarterRow[]; totals: MatchPlayerStats }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs min-w-[720px]">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-2 py-1 text-left font-medium text-gray-500 sticky left-0 bg-gray-50">Cuarto</th>
            {MATCH_PLAYER_STAT_COLS.map((s) => (
              <th key={s.key} className={`px-1.5 py-1 text-center font-medium ${s.color}`}>
                <span className="hidden md:inline">{s.label}</span>
                <span className="md:hidden">{s.short}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {quarters.map((q) => (
            <tr key={q.quarter}>
              <td className="px-2 py-1 text-gray-500 font-medium sticky left-0 bg-white">C{q.quarter}</td>
              {MATCH_PLAYER_STAT_COLS.map((s) => (
                <td
                  key={s.key}
                  className={`px-1.5 py-1 text-center font-semibold ${q[s.key] > 0 ? s.color : "text-gray-300"}`}
                >
                  {statDisplay(q[s.key])}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-blue-50 font-bold">
            <td className="px-2 py-1 text-blue-700 sticky left-0 bg-blue-50">Total</td>
            {MATCH_PLAYER_STAT_COLS.map((s) => (
              <td key={s.key} className={`px-1.5 py-1 text-center ${totals[s.key] > 0 ? s.color : "text-gray-300"}`}>
                {statDisplay(totals[s.key])}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function formatResult(home: number | null, away: number | null) {
  if (home === null && away === null) return "—";
  return `${home ?? "—"} — ${away ?? "—"}`;
}

function MatchRow({ match, defaultOpen }: { match: MatchStats; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] sm:items-center gap-x-4 gap-y-1">
          <p className="text-sm font-medium whitespace-nowrap">
            {format(new Date(match.matchDate), "d MMM yyyy", { locale: es })}
          </p>
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <Badge variant={match.isFriendly ? "outline" : "secondary"} className="text-[10px] shrink-0">
              {match.isFriendly ? "Amistoso" : match.convocatoriaName}
            </Badge>
            <span className="text-sm text-muted-foreground truncate">
              {match.opponent ? `vs ${match.opponent}` : "—"}
            </span>
          </div>
          <p className="text-sm font-bold tabular-nums sm:text-right">{formatResult(match.homeScore, match.awayScore)}</p>
        </div>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <CardContent className="px-4 pb-3 pt-0 border-t bg-gray-50/50">
          <MatchStatsTable quarters={match.quarters} totals={match.totals} />
        </CardContent>
      )}
    </Card>
  );
}

export function PlayerPartidosPanel({ playerId }: { playerId: string }) {
  const [matches, setMatches] = useState<MatchStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/players/${playerId}/partidos`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.matches)) setMatches(d.matches);
        setLoading(false);
      });
  }, [playerId]);

  if (loading) return <LoadingState message="Cargando partidos..." />;

  if (matches.length === 0) {
    return <EmptyState message="Sin estadísticas de partidos para este jugador" />;
  }

  return (
    <div className="space-y-2">
      {matches.map((m, i) => (
        <MatchRow key={m.matchId} match={m} defaultOpen={matches.length === 1 || i === 0} />
      ))}
    </div>
  );
}
