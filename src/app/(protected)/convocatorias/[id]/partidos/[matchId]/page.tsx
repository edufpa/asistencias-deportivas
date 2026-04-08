"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type StatKey = "goals" | "assists" | "recoveries" | "expulsions" | "penalties";

const STAT_COLS: { key: StatKey; label: string; short: string; color: string }[] = [
  { key: "goals", label: "Goles", short: "G", color: "text-green-700" },
  { key: "assists", label: "Pases Gol", short: "A", color: "text-blue-700" },
  { key: "recoveries", label: "Recuperaciones", short: "R", color: "text-purple-700" },
  { key: "expulsions", label: "Expulsiones", short: "E", color: "text-red-700" },
  { key: "penalties", label: "Penales Comet.", short: "P", color: "text-orange-700" },
];

type PlayerStat = Record<StatKey, number> & { minutesPlayed?: number | null };
type QuarterStats = Record<string, PlayerStat>; // playerId -> stats
type AllStats = Record<number, QuarterStats>; // quarter -> players

type MatchData = {
  id: string;
  matchDate: string;
  matchType: "OFFICIAL" | "PRACTICE";
  opponent: string | null;
  location: string | null;
  result: string | null;
  quarters: number;
  notes: string | null;
  convocatoria: { id: string; name: string; players: { player: { id: string; firstName: string; lastName: string; club: string | null } }[] };
  createdBy: { name: string };
  playerStats: { quarter: number; playerId: string; goals: number; assists: number; recoveries: number; expulsions: number; penalties: number; minutesPlayed: number | null; player: { id: string; firstName: string; lastName: string } }[];
};

function StatCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm leading-none flex items-center justify-center"
      >−</button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm leading-none flex items-center justify-center"
      >+</button>
    </div>
  );
}

export default function MatchDetailPage() {
  const { id: convocatoriaId, matchId } = useParams<{ id: string; matchId: string }>();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [stats, setStats] = useState<AllStats>({});
  const [activeQuarter, setActiveQuarter] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const fetchMatch = useCallback(async () => {
    const res = await fetch(`/api/convocatorias/${convocatoriaId}/partidos/${matchId}`);
    if (!res.ok) return;
    const data: MatchData = await res.json();
    setMatch(data);

    // Build stats state from existing records
    const built: AllStats = {};
    for (let q = 1; q <= data.quarters; q++) {
      built[q] = {};
      for (const cp of data.convocatoria.players) {
        built[q][cp.player.id] = { goals: 0, assists: 0, recoveries: 0, expulsions: 0, penalties: 0, minutesPlayed: null };
      }
    }
    for (const ps of data.playerStats) {
      if (!built[ps.quarter]) built[ps.quarter] = {};
      built[ps.quarter][ps.playerId] = {
        goals: ps.goals,
        assists: ps.assists,
        recoveries: ps.recoveries,
        expulsions: ps.expulsions,
        penalties: ps.penalties,
        minutesPlayed: ps.minutesPlayed,
      };
    }
    setStats(built);
  }, [convocatoriaId, matchId]);

  useEffect(() => { fetchMatch(); }, [fetchMatch]);

  function updateStat(quarter: number, playerId: string, key: StatKey, value: number) {
    setSaved(false);
    setStats((prev) => ({
      ...prev,
      [quarter]: {
        ...prev[quarter],
        [playerId]: { ...prev[quarter]?.[playerId], [key]: value },
      },
    }));
  }

  async function handleSave() {
    setSaving(true); setError(""); setSaved(false);
    const allStats: { playerId: string; quarter: number; goals: number; assists: number; recoveries: number; expulsions: number; penalties: number }[] = [];
    for (const [q, players] of Object.entries(stats)) {
      for (const [playerId, s] of Object.entries(players)) {
        const hasAny = STAT_COLS.some((col) => s[col.key] > 0);
        if (hasAny) {
          allStats.push({ playerId, quarter: Number(q), goals: s.goals, assists: s.assists, recoveries: s.recoveries, expulsions: s.expulsions, penalties: s.penalties });
        }
      }
    }
    const res = await fetch(`/api/convocatorias/${convocatoriaId}/partidos/${matchId}/stats`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stats: allStats }),
    });
    setSaving(false);
    if (!res.ok) { setError("Error al guardar"); return; }
    setSaved(true);
  }

  // Totals per player across all quarters
  const playerTotals = (() => {
    if (!match) return {};
    const totals: Record<string, Record<StatKey, number>> = {};
    for (const cp of match.convocatoria.players) {
      totals[cp.player.id] = { goals: 0, assists: 0, recoveries: 0, expulsions: 0, penalties: 0 };
    }
    for (const quarterStats of Object.values(stats)) {
      for (const [pid, s] of Object.entries(quarterStats)) {
        if (!totals[pid]) totals[pid] = { goals: 0, assists: 0, recoveries: 0, expulsions: 0, penalties: 0 };
        for (const col of STAT_COLS) {
          totals[pid][col.key] += s[col.key];
        }
      }
    }
    return totals;
  })();

  if (!match) return <div className="text-gray-400">Cargando...</div>;

  const players = match.convocatoria.players.map((cp) => cp.player);
  const quarters = Array.from({ length: match.quarters }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/convocatorias/${convocatoriaId}/partidos`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Partidos
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">
              {match.opponent ? `vs ${match.opponent}` : "Partido sin rival"}
            </h1>
            <Badge variant={match.matchType === "OFFICIAL" ? "default" : "secondary"}>
              {match.matchType === "OFFICIAL" ? "Oficial" : "Preparación"}
            </Badge>
          </div>
          <p className="text-gray-500 mt-1 capitalize">
            {format(new Date(match.matchDate + "T12:00:00"), "EEEE d 'de' MMMM yyyy", { locale: es })}
            {match.location ? ` · ${match.location}` : ""}
          </p>
          {match.result && (
            <p className="text-lg font-bold text-blue-700 mt-1">Resultado: {match.result}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-green-600 text-sm font-medium">✓ Guardado</span>}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar planilla"}
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* Quarter selector */}
      <div className="flex gap-2 flex-wrap">
        {quarters.map((q) => (
          <button
            key={q}
            onClick={() => setActiveQuarter(q)}
            className={`px-5 py-2 rounded-lg border font-medium text-sm transition-colors ${
              activeQuarter === q
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
            }`}
          >
            {match.quarters === 2 ? `Tiempo ${q}` : `Cuarto ${q}`}
          </button>
        ))}
        <button
          onClick={() => setActiveQuarter(0)}
          className={`px-5 py-2 rounded-lg border font-medium text-sm transition-colors ${
            activeQuarter === 0
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
          }`}
        >
          Totales
        </button>
      </div>

      {/* Planilla por cuarto */}
      {activeQuarter > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {match.quarters === 2 ? `Tiempo ${activeQuarter}` : `Cuarto ${activeQuarter}`} — Estadísticas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 min-w-[160px]">Jugador</th>
                  {STAT_COLS.map((col) => (
                    <th key={col.key} className={`px-2 py-3 font-medium text-center ${col.color} min-w-[90px]`}>
                      <span className="hidden sm:inline">{col.label}</span>
                      <span className="sm:hidden">{col.short}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {players.map((p) => {
                  const s = stats[activeQuarter]?.[p.id] ?? { goals: 0, assists: 0, recoveries: 0, expulsions: 0, penalties: 0 };
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{p.lastName}, {p.firstName}</p>
                        {p.club && <p className="text-xs text-gray-400">{p.club}</p>}
                      </td>
                      {STAT_COLS.map((col) => (
                        <td key={col.key} className="px-2 py-2.5">
                          <StatCell
                            value={s[col.key]}
                            onChange={(v) => updateStat(activeQuarter, p.id, col.key, v)}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        /* Totales del partido */
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumen del Partido — Totales</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Jugador</th>
                  {STAT_COLS.map((col) => (
                    <th key={col.key} className={`px-3 py-3 font-medium text-center ${col.color}`}>
                      <span className="hidden sm:inline">{col.label}</span>
                      <span className="sm:hidden">{col.short}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {players
                  .map((p) => ({ p, t: playerTotals[p.id] ?? { goals: 0, assists: 0, recoveries: 0, expulsions: 0, penalties: 0 } }))
                  .sort((a, b) => (b.t.goals + b.t.assists) - (a.t.goals + a.t.assists))
                  .map(({ p, t }) => {
                    const hasStats = STAT_COLS.some((col) => t[col.key] > 0);
                    return (
                      <tr key={p.id} className={hasStats ? "hover:bg-gray-50" : "opacity-40 hover:bg-gray-50"}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{p.lastName}, {p.firstName}</p>
                          {p.club && <p className="text-xs text-gray-400">{p.club}</p>}
                        </td>
                        {STAT_COLS.map((col) => (
                          <td key={col.key} className="px-3 py-2.5 text-center">
                            <span className={`font-semibold ${t[col.key] > 0 ? col.color : "text-gray-300"}`}>
                              {t[col.key]}
                            </span>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
