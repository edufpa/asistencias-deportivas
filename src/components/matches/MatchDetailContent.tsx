"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { formatPlayerName } from "@/lib/player";
import {
  MATCH_PLAYER_STAT_COLS,
  emptyMatchPlayerStats,
  hasAnyMatchStat,
  type MatchPlayerStatKey,
  type MatchPlayerStats,
} from "@/lib/matchPlayerStats";
import {
  PageShell,
  PageHeader,
  FilterChip,
  FilterChipGroup,
  LoadingState,
} from "@/components/layout";

const EVAL_BG: Record<number, string> = {
  1: "bg-red-500 text-white border-red-500",
  2: "bg-yellow-500 text-white border-yellow-500",
  3: "bg-blue-500 text-white border-blue-500",
  4: "bg-green-600 text-white border-green-600",
};

type AllStats = Record<number, Record<string, MatchPlayerStats>>;

type MatchData = {
  id: string;
  matchDate: string;
  matchType: "OFFICIAL" | "PRACTICE";
  opponent: string | null;
  location: string | null;
  homeScore: number | null;
  awayScore: number | null;
  quarterDuration: number | null;
  notes: string | null;
  evalOverall: number | null;
  evalAttack: number | null;
  evalDefense: number | null;
  evalFinishing: number | null;
  isFriendly: boolean;
  convocatoria: {
    id: string | null;
    name: string;
    players: { player: { id: string; firstName: string; paternalLastName: string; maternalLastName: string } }[];
  };
  playerStats: ({ quarter: number; playerId: string } & MatchPlayerStats)[];
};

function StatCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center"
      >
        −
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center"
      >
        +
      </button>
    </div>
  );
}

function EvalBadge({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="text-center">
      {value ? (
        <span className={`inline-block px-2 py-0.5 rounded-lg border text-xs font-bold ${EVAL_BG[value]}`}>
          {value}/4
        </span>
      ) : (
        <span className="inline-block text-lg font-bold text-gray-300 leading-none">—</span>
      )}
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export function MatchDetailContent({
  matchId,
  backHref,
  backLabel = "← Volver",
  deleteRedirectHref,
}: {
  matchId: string;
  backHref: string;
  backLabel?: string;
  deleteRedirectHref: string;
}) {
  const router = useRouter();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [stats, setStats] = useState<AllStats>({});
  const [activeQuarter, setActiveQuarter] = useState(1);
  const [editScore, setEditScore] = useState(false);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [evalOverall, setEvalOverall] = useState<number | null>(null);
  const [evalAttack, setEvalAttack] = useState<number | null>(null);
  const [evalDefense, setEvalDefense] = useState<number | null>(null);
  const [evalFinishing, setEvalFinishing] = useState<number | null>(null);
  const [quarterDuration, setQuarterDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const QUARTERS = 4;

  const fetchMatch = useCallback(async () => {
    const res = await fetch(`/api/matches/${matchId}`);
    if (!res.ok) return;
    const data: MatchData = await res.json();
    setMatch(data);
    setHomeScore(data.homeScore?.toString() ?? "");
    setAwayScore(data.awayScore?.toString() ?? "");
    setEvalOverall(data.evalOverall);
    setEvalAttack(data.evalAttack);
    setEvalDefense(data.evalDefense);
    setEvalFinishing(data.evalFinishing);
    setQuarterDuration(data.quarterDuration?.toString() ?? "");
    setNotes(data.notes ?? "");

    const built: AllStats = {};
    for (let q = 1; q <= QUARTERS; q++) {
      built[q] = {};
      for (const cp of data.convocatoria.players) {
        built[q][cp.player.id] = emptyMatchPlayerStats();
      }
    }
    for (const ps of data.playerStats) {
      if (!built[ps.quarter]) built[ps.quarter] = {};
      built[ps.quarter][ps.playerId] = emptyMatchPlayerStats();
      for (const col of MATCH_PLAYER_STAT_COLS) {
        built[ps.quarter][ps.playerId][col.key] = ps[col.key];
      }
    }
    setStats(built);
  }, [matchId]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  function updateStat(quarter: number, playerId: string, key: MatchPlayerStatKey, value: number) {
    setSaved(false);
    setStats((prev) => ({
      ...prev,
      [quarter]: {
        ...prev[quarter],
        [playerId]: { ...prev[quarter]?.[playerId] ?? emptyMatchPlayerStats(), [key]: value },
      },
    }));
  }

  async function handleSaveStats() {
    setSaving(true);
    setError("");
    setSaved(false);
    const allStats: ({ playerId: string; quarter: number } & MatchPlayerStats)[] = [];
    for (const [q, players] of Object.entries(stats)) {
      for (const [playerId, s] of Object.entries(players)) {
        if (hasAnyMatchStat(s)) {
          allStats.push({ playerId, quarter: Number(q), ...s });
        }
      }
    }
    const res = await fetch(`/api/matches/${matchId}/stats`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stats: allStats }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Error al guardar estadísticas");
      return;
    }
    setSaved(true);
  }

  async function handleSaveMeta() {
    setSavingMeta(true);
    await fetch(`/api/matches/${matchId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeScore: homeScore !== "" ? Number(homeScore) : null,
        awayScore: awayScore !== "" ? Number(awayScore) : null,
        evalOverall,
        evalAttack,
        evalDefense,
        evalFinishing,
        quarterDuration: quarterDuration !== "" ? Number(quarterDuration) : null,
        notes: notes || null,
      }),
    });
    setSavingMeta(false);
    setEditScore(false);
    fetchMatch();
  }

  function cancelEditMeta() {
    if (!match) return;
    setHomeScore(match.homeScore?.toString() ?? "");
    setAwayScore(match.awayScore?.toString() ?? "");
    setEvalOverall(match.evalOverall);
    setEvalAttack(match.evalAttack);
    setEvalDefense(match.evalDefense);
    setEvalFinishing(match.evalFinishing);
    setQuarterDuration(match.quarterDuration?.toString() ?? "");
    setNotes(match.notes ?? "");
    setEditScore(false);
  }

  const playerTotals = (() => {
    if (!match) return {};
    const totals: Record<string, MatchPlayerStats> = {};
    for (const cp of match.convocatoria.players) {
      totals[cp.player.id] = emptyMatchPlayerStats();
    }
    for (const qs of Object.values(stats)) {
      for (const [pid, s] of Object.entries(qs)) {
        if (!totals[pid]) totals[pid] = emptyMatchPlayerStats();
        for (const col of MATCH_PLAYER_STAT_COLS) {
          totals[pid][col.key] += s[col.key];
        }
      }
    }
    return totals;
  })();

  if (!match) return <LoadingState message="Cargando..." />;

  const players = match.convocatoria.players.map((cp) => cp.player);
  const myTeam = match.isFriendly ? "Regatas" : match.convocatoria.name.split(" ")[0];
  const matchDescription = [
    match.convocatoria.name,
    format(new Date(match.matchDate), "EEEE d 'de' MMMM yyyy", { locale: es }),
    match.location,
    match.quarterDuration ? `⏱ ${match.quarterDuration} min por cuarto · 4 cuartos` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageShell>
      <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
        {backLabel}
      </Link>

      <PageHeader
        title={match.opponent ? `vs ${match.opponent}` : "—"}
        description={matchDescription || "—"}
        actions={
          <>
            <Badge variant={match.isFriendly ? "outline" : match.matchType === "OFFICIAL" ? "default" : "secondary"}>
              {match.isFriendly ? "Amistoso" : match.matchType === "OFFICIAL" ? "Oficial" : "Preparación"}
            </Badge>
            {saved && <span className="text-sm font-medium text-emerald-600">✓ Guardado</span>}
            <Button onClick={handleSaveStats} disabled={saving}>
              {saving ? "Guardando..." : "Guardar planilla"}
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={async () => {
                if (
                  !confirm(
                    `¿Eliminar este partido${match?.opponent ? ` vs ${match.opponent}` : ""}? Se borrarán todas las estadísticas.`
                  )
                )
                  return;
                await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
                router.push(deleteRedirectHref);
              }}
            >
              Eliminar partido
            </Button>
          </>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="py-2 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Resultado del partido</CardTitle>
              <button
                onClick={() => (editScore ? cancelEditMeta() : setEditScore(true))}
                className="text-xs text-blue-500 hover:underline"
              >
                {editScore ? "Cancelar" : "Editar"}
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            {editScore ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nuestros goles</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="—"
                      value={homeScore}
                      onChange={(e) => setHomeScore(e.target.value)}
                      className="text-center font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Goles rival</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="—"
                      value={awayScore}
                      onChange={(e) => setAwayScore(e.target.value)}
                      className="text-center font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Min/cuarto</Label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      placeholder="7"
                      value={quarterDuration}
                      onChange={(e) => setQuarterDuration(e.target.value)}
                      className="text-center"
                    />
                  </div>
                </div>
                <div className="space-y-3 rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Calificaciones del equipo</p>
                  {[
                    { label: "General", val: evalOverall, set: setEvalOverall },
                    { label: "Ataque", val: evalAttack, set: setEvalAttack },
                    { label: "Defensa", val: evalDefense, set: setEvalDefense },
                    { label: "Definiciones", val: evalFinishing, set: setEvalFinishing },
                  ].map((ev) => (
                    <div key={ev.label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{ev.label}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => ev.set(n)}
                            className={`w-8 h-8 rounded border text-xs font-bold transition-colors ${
                              ev.val === n ? EVAL_BG[n] : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Observaciones</Label>
                  <Textarea
                    rows={3}
                    placeholder="Notas del partido..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <Button size="sm" onClick={handleSaveMeta} disabled={savingMeta} className="w-full">
                  {savingMeta ? "Guardando..." : "Guardar resultado"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <div className="text-center min-w-[72px]">
                  <p className="text-xs text-gray-500">{myTeam}</p>
                  <p className="text-2xl font-black text-blue-700 tabular-nums">
                    {match.homeScore ?? "—"}
                  </p>
                </div>
                <span className="text-xl font-bold text-gray-300">—</span>
                <div className="text-center min-w-[72px]">
                  <p className="text-xs text-gray-500">{match.opponent ?? "Rival"}</p>
                  <p className="text-2xl font-black text-gray-700 tabular-nums">
                    {match.awayScore ?? "—"}
                  </p>
                </div>
                <span className="text-gray-200 mx-1">|</span>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Min/cuarto</p>
                  <p className="text-lg font-bold text-gray-600 tabular-nums">{match.quarterDuration ?? "—"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-sm">Calificación del Equipo</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="grid grid-cols-4 gap-2">
              <EvalBadge label="General" value={match.evalOverall} />
              <EvalBadge label="Ataque" value={match.evalAttack} />
              <EvalBadge label="Defensa" value={match.evalDefense} />
              <EvalBadge label="Definiciones" value={match.evalFinishing} />
            </div>
            <p className="text-xs text-gray-500 italic mt-2 border-t pt-2">
              {match.notes?.trim() ? match.notes : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <FilterChipGroup>
        {[1, 2, 3, 4].map((q) => (
          <FilterChip key={q} size="md" active={activeQuarter === q} onClick={() => setActiveQuarter(q)}>
            Cuarto {q}
          </FilterChip>
        ))}
        <FilterChip size="md" active={activeQuarter === 0} onClick={() => setActiveQuarter(0)}>
          Totales
        </FilterChip>
      </FilterChipGroup>

      {activeQuarter > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cuarto {activeQuarter}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 min-w-[160px] sticky left-0 bg-gray-50">
                    Jugador
                  </th>
                  {MATCH_PLAYER_STAT_COLS.map((col) => (
                    <th key={col.key} className={`px-2 py-3 font-medium text-center ${col.color} min-w-[72px]`}>
                      <span className="hidden lg:inline">{col.label}</span>
                      <span className="lg:hidden">{col.short}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {players.map((p) => {
                  const s = stats[activeQuarter]?.[p.id] ?? emptyMatchPlayerStats();
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 sticky left-0 bg-white">
                        <p className="font-medium">{formatPlayerName(p)}</p>
                      </td>
                      {MATCH_PLAYER_STAT_COLS.map((col) => (
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Totales del Partido</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 sticky left-0 bg-gray-50">Jugador</th>
                  {MATCH_PLAYER_STAT_COLS.map((col) => (
                    <th key={col.key} className={`px-2 py-3 font-medium text-center ${col.color}`}>
                      <span className="hidden lg:inline">{col.label}</span>
                      <span className="lg:hidden">{col.short}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {players
                  .map((p) => ({ p, t: playerTotals[p.id] ?? emptyMatchPlayerStats() }))
                  .sort((a, b) => b.t.goals - a.t.goals || b.t.assists - a.t.assists)
                  .map(({ p, t }) => {
                    const hasStats = hasAnyMatchStat(t);
                    return (
                      <tr key={p.id} className={hasStats ? "hover:bg-gray-50" : "opacity-30"}>
                        <td className="px-4 py-2.5 sticky left-0 bg-white">
                          <p className="font-medium">{formatPlayerName(p)}</p>
                        </td>
                        {MATCH_PLAYER_STAT_COLS.map((col) => (
                          <td key={col.key} className="px-2 py-2.5 text-center">
                            <span className={`font-bold text-sm ${t[col.key] > 0 ? col.color : "text-gray-200"}`}>
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
    </PageShell>
  );
}
