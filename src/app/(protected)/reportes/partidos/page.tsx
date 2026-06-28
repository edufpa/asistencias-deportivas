"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  PageHeader,
  PageShell,
  SectionHeading,
  StatCard,
  StatGrid,
  EmptyState,
  LoadingState,
} from "@/components/layout";
import { Swords, Target, Trophy, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

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
  notes: string | null;
  convocatoriaId: string | null; convocatoriaName: string;
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

type Convocatoria = { id: string; name: string; status: "ACTIVE" | "CLOSED" };

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
  const [resultFilter, setResultFilter] = useState("ALL");
  const [data, setData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/convocatorias").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setConvocatorias(d.filter((c: Convocatoria) => c.status === "ACTIVE"));
    });
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

  const filteredMatches = (data?.matches ?? []).filter((m) => {
    if (resultFilter === "ALL") return true;
    return getResult(m) === resultFilter;
  });

  const hasFilters = dateFrom || dateTo || matchType !== "ALL" || selectedConv || resultFilter !== "ALL";

  return (
    <PageShell>
      <Link href="/reportes" className="text-sm text-muted-foreground hover:text-foreground">
        ← Reportes
      </Link>

      <PageHeader
        title="Reporte de Partidos"
        description="Resultados, estadísticas y calificaciones de equipo"
        actions={
          <Link href="/reportes/partidos/nuevo" className={cn(buttonVariants())}>
            + Nuevo Partido
          </Link>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-1">
              <Label>Convocatoria</Label>
              <select value={selectedConv} onChange={(e) => setSelectedConv(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todas</option>
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
              <Label>Resultado</Label>
              <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="ALL">Todos</option>
                <option value="W">Ganados</option>
                <option value="E">Empatados</option>
                <option value="L">Perdidos</option>
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
            <Button onClick={fetchReporte} disabled={loading}>{loading ? "Cargando..." : "Aplicar filtros"}</Button>
            {hasFilters && (
              <Button variant="outline" onClick={() => { setDateFrom(""); setDateTo(""); setMatchType("ALL"); setSelectedConv(""); setResultFilter("ALL"); }}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          <StatGrid>
            <StatCard
              icon={CalendarRange}
              label="Partidos"
              value={String(filteredMatches.length)}
              hint={`${data.summary.official} ofic · ${data.summary.practice} prep`}
              align="center"
            />
            <StatCard
              icon={Trophy}
              label="Resultados"
              value={`${data.summary.wins}G · ${data.summary.draws}E · ${data.summary.losses}P`}
              hint="Ganados · Empatados · Perdidos"
              align="center"
            />
            <StatCard
              icon={Target}
              label="Goles totales"
              value={String(data.summary.totalGoals)}
              tone="primary"
              align="center"
            />
            <StatCard
              icon={Swords}
              label="Prom. general equipo"
              value={data.summary.avgEvals ? String(data.summary.avgEvals.overall) : "—"}
              hint={data.summary.avgEvals ? undefined : "Sin calificaciones"}
              tone={data.summary.avgEvals ? "success" : "muted"}
              align="center"
            />
          </StatGrid>

          {data.summary.avgEvals && (
            <Card>
              <CardContent className="pt-5">
                <SectionHeading title="Promedios de Calificación del Equipo" />
                <div className="mt-4">
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
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {filteredMatches.length === 0 ? (
              <EmptyState message="Sin partidos para los filtros seleccionados" />
            ) : (
              filteredMatches.map((m) => {
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
                            <Badge variant={m.convocatoriaId ? (m.matchType === "OFFICIAL" ? "default" : "secondary") : "outline"} className="text-xs">
                              {m.convocatoriaId ? (m.matchType === "OFFICIAL" ? "Oficial" : "Preparación") : "Amistoso"}
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
                            <p className="text-xs text-gray-500">⚽ Goleador: <span className="font-medium">{m.topScorer.name}</span> ({m.topScorer.goals} gol{m.topScorer.goals !== 1 ? "es" : ""})</p>
                          )}
                          {m.notes && <p className="text-xs text-gray-400 italic mt-0.5">{m.notes}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {m.homeScore !== null && m.awayScore !== null ? (
                            <p className="text-2xl font-black text-gray-800">{m.homeScore} — {m.awayScore}</p>
                          ) : (
                            <p className="text-gray-300 text-sm">Sin resultado</p>
                          )}
                          <p className="text-xs text-gray-400">{m.totalGoals} gol{m.totalGoals !== 1 ? "es" : ""} marcados</p>
                          <Link href={m.convocatoriaId ? `/convocatorias/${m.convocatoriaId}/partidos/${m.id}` : `/reportes/partidos/${m.id}`}>
                            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs">
                              Ver detalle →
                            </Button>
                          </Link>
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

      {loading && !data && <LoadingState message="Cargando reporte..." />}
    </PageShell>
  );
}
