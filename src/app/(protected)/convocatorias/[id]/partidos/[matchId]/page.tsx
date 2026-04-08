"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

type StatKey = "goals" | "assists" | "recoveries" | "expulsions" | "penalties";

const STAT_COLS: { key: StatKey; label: string; short: string; color: string }[] = [
  { key: "goals", label: "Goles", short: "G", color: "text-green-700" },
  { key: "assists", label: "Pases Gol", short: "A", color: "text-blue-700" },
  { key: "recoveries", label: "Recuperaciones", short: "R", color: "text-purple-700" },
  { key: "expulsions", label: "Expulsiones", short: "E", color: "text-red-700" },
  { key: "penalties", label: "Penales", short: "P", color: "text-orange-700" },
];

const EVAL_LABELS: Record<number, string> = { 1: "Bajo", 2: "Regular", 3: "Bueno", 4: "Excelente" };
const EVAL_BG: Record<number, string> = {
  1: "bg-red-500 text-white border-red-500",
  2: "bg-yellow-500 text-white border-yellow-500",
  3: "bg-blue-500 text-white border-blue-500",
  4: "bg-green-600 text-white border-green-600",
};

type PlayerStat = Record<StatKey, number>;
type AllStats = Record<number, Record<string, PlayerStat>>;

type MatchData = {
  id: string; matchDate: string; matchType: "OFFICIAL" | "PRACTICE";
  opponent: string | null; location: string | null;
  homeScore: number | null; awayScore: number | null;
  quarterDuration: number | null; notes: string | null;
  evalOverall: number | null; evalAttack: number | null;
  evalDefense: number | null; evalFinishing: number | null;
  convocatoria: { id: string; name: string; players: { player: { id: string; firstName: string; lastName: string; club: string | null } }[] };
  createdBy: { name: string };
  playerStats: { quarter: number; playerId: string; goals: number; assists: number; recoveries: number; expulsions: number; penalties: number; player: { id: string; firstName: string; lastName: string } }[];
};

function StatCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))}
        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center">−</button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)}
        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center">+</button>
    </div>
  );
}

function EvalBadge({ label, value }: { label: string; value: number | null }) {
  if (!value) return null;
  return (
    <div className="text-center">
      <span className={`inline-block px-2 py-1 rounded-lg border text-xs font-bold ${EVAL_BG[value]}`}>
        {value}/4
      </span>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function MatchDetailPage() {
  const { id: convocatoriaId, matchId } = useParams<{ id: string; matchId: string }>();
  const router = useRouter();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [stats, setStats] = useState<AllStats>({});
  const [activeQuarter, setActiveQuarter] = useState(1);

  // editable fields
  const [editScore, setEditScore] = useState(false);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [evalOverall, setEvalOverall] = useState<number | null>(null);
  const [evalAttack, setEvalAttack] = useState<number | null>(null);
  const [evalDefense, setEvalDefense] = useState<number | null>(null);
  const [evalFinishing, setEvalFinishing] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const QUARTERS = 4;

  const fetchMatch = useCallback(async () => {
    const res = await fetch(`/api/convocatorias/${convocatoriaId}/partidos/${matchId}`);
    if (!res.ok) return;
    const data: MatchData = await res.json();
    setMatch(data);
    setHomeScore(data.homeScore?.toString() ?? "");
    setAwayScore(data.awayScore?.toString() ?? "");
    setEvalOverall(data.evalOverall);
    setEvalAttack(data.evalAttack);
    setEvalDefense(data.evalDefense);
    setEvalFinishing(data.evalFinishing);

    const built: AllStats = {};
    for (let q = 1; q <= QUARTERS; q++) {
      built[q] = {};
      for (const cp of data.convocatoria.players) {
        built[q][cp.player.id] = { goals: 0, assists: 0, recoveries: 0, expulsions: 0, penalties: 0 };
      }
    }
    for (const ps of data.playerStats) {
      if (!built[ps.quarter]) built[ps.quarter] = {};
      built[ps.quarter][ps.playerId] = {
        goals: ps.goals, assists: ps.assists, recoveries: ps.recoveries,
        expulsions: ps.expulsions, penalties: ps.penalties,
      };
    }
    setStats(built);
  }, [convocatoriaId, matchId]);

  useEffect(() => { fetchMatch(); }, [fetchMatch]);

  function updateStat(quarter: number, playerId: string, key: StatKey, value: number) {
    setSaved(false);
    setStats((prev) => ({
      ...prev,
      [quarter]: { ...prev[quarter], [playerId]: { ...prev[quarter]?.[playerId], [key]: value } },
    }));
  }

  async function handleSaveStats() {
    setSaving(true); setError(""); setSaved(false);
    const allStats: { playerId: string; quarter: number; goals: number; assists: number; recoveries: number; expulsions: number; penalties: number }[] = [];
    for (const [q, players] of Object.entries(stats)) {
      for (const [playerId, s] of Object.entries(players)) {
        if (STAT_COLS.some((col) => s[col.key] > 0)) {
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
    if (!res.ok) { setError("Error al guardar estadísticas"); return; }
    setSaved(true);
  }

  async function handleSaveMeta() {
    setSavingMeta(true);
    await fetch(`/api/convocatorias/${convocatoriaId}/partidos/${matchId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeScore: homeScore !== "" ? Number(homeScore) : null,
        awayScore: awayScore !== "" ? Number(awayScore) : null,
        evalOverall, evalAttack, evalDefense, evalFinishing,
      }),
    });
    setSavingMeta(false);
    setEditScore(false);
    fetchMatch();
  }

  const playerTotals = (() => {
    if (!match) return {};
    const totals: Record<string, Record<StatKey, number>> = {};
    for (const cp of match.convocatoria.players) {
      totals[cp.player.id] = { goals: 0, assists: 0, recoveries: 0, expulsions: 0, penalties: 0 };
    }
    for (const qs of Object.values(stats)) {
      for (const [pid, s] of Object.entries(qs)) {
        if (!totals[pid]) totals[pid] = { goals: 0, assists: 0, recoveries: 0, expulsions: 0, penalties: 0 };
        for (const col of STAT_COLS) totals[pid][col.key] += s[col.key];
      }
    }
    return totals;
  })();

  if (!match) return <div className="text-gray-400">Cargando...</div>;

  const players = match.convocatoria.players.map((cp) => cp.player);
  const myTeam = match.convocatoria.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/convocatorias/${convocatoriaId}/partidos`} className="text-gray-400 hover:text-gray-600 text-sm">← Partidos</Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">
              {match.opponent ? `vs ${match.opponent}` : "Partido"}
            </h1>
            <Badge variant={match.matchType === "OFFICIAL" ? "default" : "secondary"}>
              {match.matchType === "OFFICIAL" ? "Oficial" : "Preparación"}
            </Badge>
          </div>
          <p className="text-gray-500 mt-1 capitalize">
            {format(new Date(match.matchDate), "EEEE d 'de' MMMM yyyy", { locale: es })}
            {match.location ? ` · ${match.location}` : ""}
          </p>
          {match.quarterDuration && (
            <p className="text-xs text-gray-400 mt-0.5">⏱ {match.quarterDuration} min por cuarto · 4 cuartos</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {saved && <span className="text-green-600 text-sm font-medium">✓ Guardado</span>}
          <Button onClick={handleSaveStats} disabled={saving}>{saving ? "Guardando..." : "Guardar planilla"}</Button>
          <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={async () => {
            if (!confirm(`¿Eliminar este partido${match?.opponent ? ` vs ${match.opponent}` : ""}? Se borrarán todas las estadísticas.`)) return;
            await fetch(`/api/convocatorias/${convocatoriaId}/partidos/${matchId}`, { method: "DELETE" });
            router.push(`/convocatorias/${convocatoriaId}/partidos`);
          }}>Eliminar partido</Button>
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* Score + Evaluaciones */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Marcador */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Marcador</CardTitle>
              <button onClick={() => setEditScore(!editScore)} className="text-xs text-blue-500 hover:underline">
                {editScore ? "Cancelar" : "Editar"}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {editScore ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-center">
                    <p className="text-xs text-gray-500 mb-1">{myTeam}</p>
                    <Input type="number" min="0" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} className="text-center text-xl font-bold" />
                  </div>
                  <span className="text-xl font-bold text-gray-400">—</span>
                  <div className="flex-1 text-center">
                    <p className="text-xs text-gray-500 mb-1">{match.opponent ?? "Rival"}</p>
                    <Input type="number" min="0" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} className="text-center text-xl font-bold" />
                  </div>
                </div>
                <div className="space-y-3 rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-600">Calificación del equipo</p>
                  {[
                    { key: "evalOverall" as const, label: "Rendimiento general", val: evalOverall, set: setEvalOverall },
                    { key: "evalAttack" as const, label: "Ataque", val: evalAttack, set: setEvalAttack },
                    { key: "evalDefense" as const, label: "Defensa", val: evalDefense, set: setEvalDefense },
                    { key: "evalFinishing" as const, label: "Definiciones", val: evalFinishing, set: setEvalFinishing },
                  ].map((ev) => (
                    <div key={ev.key} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{ev.label}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((n) => (
                          <button key={n} type="button" onClick={() => ev.set(n)}
                            className={`w-8 h-8 rounded border text-xs font-bold transition-colors ${ev.val === n ? EVAL_BG[n] : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <Button size="sm" onClick={handleSaveMeta} disabled={savingMeta} className="w-full">
                  {savingMeta ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            ) : (
              <div>
                {match.homeScore !== null && match.awayScore !== null ? (
                  <div className="flex items-center justify-center gap-4 py-2">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">{myTeam}</p>
                      <p className="text-4xl font-black text-blue-700">{match.homeScore}</p>
                    </div>
                    <span className="text-2xl font-bold text-gray-300">—</span>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">{match.opponent ?? "Rival"}</p>
                      <p className="text-4xl font-black text-gray-700">{match.awayScore}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-3">Sin marcador aún · clic en Editar</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evaluaciones */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Calificación del Equipo</CardTitle>
          </CardHeader>
          <CardContent>
            {!match.evalOverall && !match.evalAttack && !match.evalDefense && !match.evalFinishing ? (
              <p className="text-gray-400 text-sm text-center py-3">Sin calificación · editá el marcador</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 py-1">
                <EvalBadge label="General" value={match.evalOverall} />
                <EvalBadge label="Ataque" value={match.evalAttack} />
                <EvalBadge label="Defensa" value={match.evalDefense} />
                <EvalBadge label="Definiciones" value={match.evalFinishing} />
              </div>
            )}
            {match.notes && (
              <p className="text-xs text-gray-500 italic mt-3 border-t pt-2">{match.notes}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Quarter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4].map((q) => (
          <button key={q} onClick={() => setActiveQuarter(q)}
            className={`px-5 py-2 rounded-lg border font-medium text-sm transition-colors ${activeQuarter === q ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"}`}>
            Cuarto {q}
          </button>
        ))}
        <button onClick={() => setActiveQuarter(0)}
          className={`px-5 py-2 rounded-lg border font-medium text-sm transition-colors ${activeQuarter === 0 ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"}`}>
          Totales
        </button>
      </div>

      {/* Planilla */}
      {activeQuarter > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cuarto {activeQuarter}</CardTitle>
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
                          <StatCell value={s[col.key]} onChange={(v) => updateStat(activeQuarter, p.id, col.key, v)} />
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Totales del Partido</CardTitle>
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
                  .sort((a, b) => (b.t.goals + b.t.assists + b.t.recoveries) - (a.t.goals + a.t.assists + a.t.recoveries))
                  .map(({ p, t }) => {
                    const hasStats = STAT_COLS.some((col) => t[col.key] > 0);
                    return (
                      <tr key={p.id} className={hasStats ? "hover:bg-gray-50" : "opacity-30"}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{p.lastName}, {p.firstName}</p>
                        </td>
                        {STAT_COLS.map((col) => (
                          <td key={col.key} className="px-3 py-2.5 text-center">
                            <span className={`font-bold text-base ${t[col.key] > 0 ? col.color : "text-gray-200"}`}>{t[col.key]}</span>
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
