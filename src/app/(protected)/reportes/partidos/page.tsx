"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
  convocatoriaId: string; convocatoriaName: string;
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

function EvalSelector({ value, onChange, label }: { value: number | null; onChange: (v: number) => void; label: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-600">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-lg border text-sm font-bold transition-colors ${
              value === n
                ? n === 1 ? "bg-red-500 text-white border-red-500"
                  : n === 2 ? "bg-yellow-500 text-white border-yellow-500"
                  : n === 3 ? "bg-blue-500 text-white border-blue-500"
                  : "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}>{n}</button>
        ))}
      </div>
    </div>
  );
}

export default function ReportePartidosPage() {
  const router = useRouter();
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [selectedConv, setSelectedConv] = useState("");
  const [matchType, setMatchType] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [resultFilter, setResultFilter] = useState("ALL"); // ALL | W | L | E
  const [data, setData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(false);

  // New match dialog
  const [showNewMatch, setShowNewMatch] = useState(false);
  const [newConv, setNewConv] = useState("");
  const [form, setForm] = useState({
    matchDate: new Date().toISOString().split("T")[0],
    matchType: "OFFICIAL" as "OFFICIAL" | "PRACTICE",
    opponent: "", location: "", quarterDuration: "7",
    homeScore: "", awayScore: "",
    evalOverall: null as number | null,
    evalAttack: null as number | null,
    evalDefense: null as number | null,
    evalFinishing: null as number | null,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetch("/api/convocatorias").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setConvocatorias(d);
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

  async function handleSaveMatch() {
    if (!newConv) { setSaveError("Seleccioná una convocatoria"); return; }
    if (!form.matchDate) { setSaveError("Ingresá la fecha del partido"); return; }
    setSaving(true); setSaveError("");
    try {
      const res = await fetch(`/api/convocatorias/${newConv}/partidos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchDate: form.matchDate,
          matchType: form.matchType,
          opponent: form.opponent || null,
          location: form.location || null,
          quarterDuration: form.quarterDuration ? parseInt(form.quarterDuration) : null,
          homeScore: form.homeScore !== "" ? parseInt(form.homeScore) : null,
          awayScore: form.awayScore !== "" ? parseInt(form.awayScore) : null,
          evalOverall: form.evalOverall,
          evalAttack: form.evalAttack,
          evalDefense: form.evalDefense,
          evalFinishing: form.evalFinishing,
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setShowNewMatch(false);
        router.push(`/convocatorias/${newConv}/partidos/${created.id}`);
      } else {
        setSaveError("Error al crear el partido");
      }
    } catch {
      setSaveError("Error de conexión");
    }
    setSaving(false);
  }

  const hasFilters = dateFrom || dateTo || matchType !== "ALL" || selectedConv || resultFilter !== "ALL";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reportes" className="text-gray-400 hover:text-gray-600 text-sm">← Reportes</Link>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporte de Partidos</h1>
          <p className="text-gray-500 mt-1">Resultados, estadísticas y calificaciones de equipo</p>
        </div>
        <Button onClick={() => { setSaveError(""); setShowNewMatch(true); }} className="shrink-0">
          + Nuevo Partido
        </Button>
      </div>

      {/* Filtros */}
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
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 text-center">
                <div className="text-3xl font-bold text-gray-800">{filteredMatches.length}</div>
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

          {/* Promedios */}
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
            {filteredMatches.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-gray-400">Sin partidos para los filtros seleccionados</CardContent></Card>
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
                          <Link href={`/convocatorias/${m.convocatoriaId}/partidos/${m.id}`}>
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

      {/* Dialog: Nuevo Partido */}
      <Dialog open={showNewMatch} onOpenChange={setShowNewMatch}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Partido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Convocatoria *</Label>
              <select value={newConv} onChange={(e) => setNewConv(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccioná una convocatoria</option>
                {convocatorias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fecha *</Label>
                <Input type="date" value={form.matchDate} onChange={(e) => setForm({ ...form, matchDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <select value={form.matchType} onChange={(e) => setForm({ ...form, matchType: e.target.value as "OFFICIAL" | "PRACTICE" })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="OFFICIAL">Oficial</option>
                  <option value="PRACTICE">Preparación</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Rival</Label>
                <Input placeholder="Ej: Bolivia" value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Sede</Label>
                <Input placeholder="Ej: Lima" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Nuestros goles</Label>
                <Input type="number" min="0" placeholder="—" value={form.homeScore} onChange={(e) => setForm({ ...form, homeScore: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Goles rival</Label>
                <Input type="number" min="0" placeholder="—" value={form.awayScore} onChange={(e) => setForm({ ...form, awayScore: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Min/cuarto</Label>
                <Input type="number" min="1" max="20" value={form.quarterDuration} onChange={(e) => setForm({ ...form, quarterDuration: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Calificaciones del equipo</p>
              <div className="grid grid-cols-2 gap-3">
                <EvalSelector label="General" value={form.evalOverall} onChange={(v) => setForm({ ...form, evalOverall: v })} />
                <EvalSelector label="Ataque" value={form.evalAttack} onChange={(v) => setForm({ ...form, evalAttack: v })} />
                <EvalSelector label="Defensa" value={form.evalDefense} onChange={(v) => setForm({ ...form, evalDefense: v })} />
                <EvalSelector label="Definiciones" value={form.evalFinishing} onChange={(v) => setForm({ ...form, evalFinishing: v })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observaciones</Label>
              <Textarea rows={2} placeholder="Notas del partido..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewMatch(false)}>Cancelar</Button>
            <Button onClick={handleSaveMatch} disabled={saving}>
              {saving ? "Guardando..." : "Crear partido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
