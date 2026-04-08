"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EVAL_COLORS: Record<number, string> = {
  1: "text-red-600", 2: "text-yellow-600", 3: "text-blue-600", 4: "text-green-600",
};
const EVAL_BG: Record<number, string> = {
  1: "bg-red-100 text-red-700 border-red-200",
  2: "bg-yellow-100 text-yellow-700 border-yellow-200",
  3: "bg-blue-100 text-blue-700 border-blue-200",
  4: "bg-green-100 text-green-700 border-green-200",
};

type MatchSummary = {
  id: string; matchDate: string; matchType: "OFFICIAL" | "PRACTICE";
  opponent: string | null; location: string | null;
  homeScore: number | null; awayScore: number | null;
  quarterDuration: number | null;
  evalOverall: number | null; evalAttack: number | null;
  evalDefense: number | null; evalFinishing: number | null;
  notes: string | null; convocatoriaName: string;
  totalGoals: number;
  topScorer: { name: string; goals: number } | null;
};

type ReporteData = {
  matches: MatchSummary[];
  summary: {
    total: number; official: number; practice: number;
    wins: number; losses: number; draws: number; totalGoals: number;
    avgEvals: { overall: number; attack: number; defense: number; finishing: number } | null;
  };
};

type Convocatoria = { id: string; name: string };

function EvalChip({ value, label }: { value: number | null; label: string }) {
  if (!value) return null;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${EVAL_BG[value]}`}>
      {label}: {value}/4
    </span>
  );
}

export default function ReportePartidosPage() {
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [selectedConv, setSelectedConv] = useState("");
  const [matchType, setMatchType] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/convocatorias").then((r) => r.json()).then(setConvocatorias);
  }, []);

  const fetchReporte = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ matchType });
      if (selectedConv) params.set("convocatoriaId", selectedConv);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/reportes/partidos?${params}`);
      if (res.ok) {
        const d = await res.json();
        if (d.matches && Array.isArray(d.matches)) setData(d);
      }
    } catch (e) {
      console.error("Error cargando reporte:", e);
    }
    setLoading(false);
  }, [selectedConv, matchType, dateFrom, dateTo]);

  useEffect(() => { fetchReporte(); }, [fetchReporte]);

  const getResult = (m: MatchSummary) => {
    if (m.homeScore === null || m.awayScore === null) return null;
    if (m.homeScore > m.awayScore) return "W";
    if (m.homeScore < m.awayScore) return "L";
    return "E";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reportes" className="text-gray-400 hover:text-gray-600 text-sm">← Reportes</Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reporte de Partidos</h1>
        <p className="text-gray-500 mt-1">Resultados, estadísticas y calificaciones de equipo</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <Label>Convocatoria</Label>
              <select value={selectedConv} onChange={(e) => setSelectedConv(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todas las convocatorias</option>
                {convocatorias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <select value={matchType} onChange={(e) => setMatchType(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="ALL">Todos</option>
                <option value="OFFICIAL">Oficiales</option>
                <option value="PRACTICE">Preparación</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Desde</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Hasta</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={fetchReporte} disabled={loading}>{loading ? "Cargando..." : "Generar reporte"}</Button>
            {(dateFrom || dateTo || matchType !== "ALL" || selectedConv) && (
              <Button variant="outline" onClick={() => { setDateFrom(""); setDateTo(""); setMatchType("ALL"); setSelectedConv(""); }}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 text-center">
                <div className="text-3xl font-bold text-gray-800">{data.summary.total}</div>
                <p className="text-xs text-gray-500 mt-1">Partidos</p>
                <p className="text-xs text-gray-400">{data.summary.official} ofic · {data.summary.practice} prep</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <div className="flex justify-center gap-3">
                  <div><span className="text-2xl font-bold text-green-600">{data.summary.wins}</span><p className="text-xs text-gray-400">G</p></div>
                  <div><span className="text-2xl font-bold text-gray-400">{data.summary.draws}</span><p className="text-xs text-gray-400">E</p></div>
                  <div><span className="text-2xl font-bold text-red-500">{data.summary.losses}</span><p className="text-xs text-gray-400">P</p></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Ganados · Empatados · Perdidos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <div className="text-3xl font-bold text-blue-700">{data.summary.totalGoals}</div>
                <p className="text-xs text-gray-500 mt-1">Goles totales</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                {data.summary.avgEvals ? (
                  <>
                    <div className={`text-3xl font-bold ${EVAL_COLORS[Math.round(data.summary.avgEvals.overall)] ?? "text-gray-700"}`}>
                      {data.summary.avgEvals.overall}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Prom. general equipo</p>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-gray-300">—</div>
                    <p className="text-xs text-gray-400 mt-1">Sin calificaciones</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Promedios de evaluación */}
          {data.summary.avgEvals && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Promedios de Calificación del Equipo</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  {[
                    { label: "General", val: data.summary.avgEvals.overall },
                    { label: "Ataque", val: data.summary.avgEvals.attack },
                    { label: "Defensa", val: data.summary.avgEvals.defense },
                    { label: "Definiciones", val: data.summary.avgEvals.finishing },
                  ].map((ev) => (
                    <div key={ev.label}>
                      <div className={`text-2xl font-bold ${EVAL_COLORS[Math.round(ev.val)] ?? "text-gray-600"}`}>{ev.val}</div>
                      <p className="text-xs text-gray-500">{ev.label}</p>
                      <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${(ev.val / 4) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de partidos */}
          <div className="space-y-3">
            {data.matches.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-gray-400">Sin partidos para los filtros seleccionados</CardContent></Card>
            ) : (
              data.matches.map((m) => {
                const result = getResult(m);
                const resultConfig = result === "W"
                  ? { bg: "bg-green-100 text-green-800 border-green-200", label: "Victoria" }
                  : result === "L"
                  ? { bg: "bg-red-100 text-red-800 border-red-200", label: "Derrota" }
                  : result === "E"
                  ? { bg: "bg-gray-100 text-gray-700 border-gray-200", label: "Empate" }
                  : null;

                return (
                  <Card key={m.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900">
                              {m.opponent ? `vs ${m.opponent}` : "Sin rival"}
                            </p>
                            <Badge variant={m.matchType === "OFFICIAL" ? "default" : "secondary"} className="text-xs">
                              {m.matchType === "OFFICIAL" ? "Oficial" : "Preparación"}
                            </Badge>
                            {resultConfig && (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${resultConfig.bg}`}>
                                {resultConfig.label}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 capitalize">
                            {format(new Date(m.matchDate), "EEEE d MMM yyyy", { locale: es })}
                            {m.location ? ` · ${m.location}` : ""}
                            {m.quarterDuration ? ` · ${m.quarterDuration} min/cuarto` : ""}
                          </p>
                          <p className="text-xs text-gray-400">{m.convocatoriaName}</p>
                          {(m.evalOverall || m.evalAttack || m.evalDefense || m.evalFinishing) && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              <EvalChip value={m.evalOverall} label="Gral" />
                              <EvalChip value={m.evalAttack} label="Atq" />
                              <EvalChip value={m.evalDefense} label="Def" />
                              <EvalChip value={m.evalFinishing} label="Defin" />
                            </div>
                          )}
                          {m.topScorer && (
                            <p className="text-xs text-gray-500">⚽ Goleador: <span className="font-medium">{m.topScorer.name}</span> ({m.topScorer.goals})</p>
                          )}
                          {m.notes && <p className="text-xs text-gray-400 italic">{m.notes}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          {m.homeScore !== null && m.awayScore !== null ? (
                            <p className="text-2xl font-black text-gray-800">{m.homeScore} — {m.awayScore}</p>
                          ) : (
                            <p className="text-gray-300 text-sm">Sin resultado</p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">{m.totalGoals} gol{m.totalGoals !== 1 ? "es" : ""} marcados</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
