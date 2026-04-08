"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Match = {
  id: string;
  matchDate: string;
  matchType: "OFFICIAL" | "PRACTICE";
  opponent: string | null;
  location: string | null;
  homeScore: number | null;
  awayScore: number | null;
  quarterDuration: number | null;
  evalOverall: number | null;
  evalAttack: number | null;
  evalDefense: number | null;
  evalFinishing: number | null;
  createdBy: { name: string };
  _count: { playerStats: number };
};

const EVAL_LABELS: Record<number, string> = { 1: "Bajo", 2: "Regular", 3: "Bueno", 4: "Excelente" };
const EVAL_COLORS: Record<number, string> = {
  1: "text-red-600", 2: "text-yellow-600", 3: "text-blue-600", 4: "text-green-600",
};

function EvalSelector({ value, onChange, label }: { value: number | null; onChange: (v: number) => void; label: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-600">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-lg border text-sm font-bold transition-colors ${
              value === n
                ? n === 1 ? "bg-red-500 text-white border-red-500"
                  : n === 2 ? "bg-yellow-500 text-white border-yellow-500"
                  : n === 3 ? "bg-blue-500 text-white border-blue-500"
                  : "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PartidosPage() {
  const { id: convocatoriaId } = useParams<{ id: string }>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [convName, setConvName] = useState("");
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);

  const [matchDate, setMatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [matchType, setMatchType] = useState<"OFFICIAL" | "PRACTICE">("OFFICIAL");
  const [opponent, setOpponent] = useState("");
  const [location, setLocation] = useState("");
  const [homeScore, setHomeScore] = useState<string>("");
  const [awayScore, setAwayScore] = useState<string>("");
  const [quarterDuration, setQuarterDuration] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [evalOverall, setEvalOverall] = useState<number | null>(null);
  const [evalAttack, setEvalAttack] = useState<number | null>(null);
  const [evalDefense, setEvalDefense] = useState<number | null>(null);
  const [evalFinishing, setEvalFinishing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    const [mRes, cRes] = await Promise.all([
      fetch(`/api/convocatorias/${convocatoriaId}/partidos`),
      fetch(`/api/convocatorias/${convocatoriaId}`),
    ]);
    setMatches(await mRes.json());
    const conv = await cRes.json();
    setConvName(conv.name);
    setLoading(false);
  }, [convocatoriaId]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  function resetForm() {
    setOpponent(""); setLocation(""); setHomeScore(""); setAwayScore("");
    setQuarterDuration(null); setNotes("");
    setEvalOverall(null); setEvalAttack(null); setEvalDefense(null); setEvalFinishing(null);
    setMatchType("OFFICIAL");
    setMatchDate(new Date().toISOString().split("T")[0]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const res = await fetch(`/api/convocatorias/${convocatoriaId}/partidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchDate, matchType,
        opponent: opponent || null,
        location: location || null,
        homeScore: homeScore !== "" ? Number(homeScore) : null,
        awayScore: awayScore !== "" ? Number(awayScore) : null,
        quarterDuration: quarterDuration ?? null,
        notes: notes || null,
        evalOverall, evalAttack, evalDefense, evalFinishing,
      }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error"); return; }
    setOpenForm(false);
    resetForm();
    fetchMatches();
  }

  // Get "my team" name from convocatoria name
  const myTeam = convName || "Nosotros";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/convocatorias/${convocatoriaId}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← {convName}
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partidos</h1>
          <p className="text-gray-500 mt-1">Oficiales y de preparación</p>
        </div>
        <Button onClick={() => { resetForm(); setOpenForm(true); }}>+ Nuevo partido</Button>
      </div>

      {loading ? <p className="text-gray-400">Cargando...</p> : matches.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-400">Sin partidos registrados</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {matches.map((m) => (
            <Link key={m.id} href={`/convocatorias/${convocatoriaId}/partidos/${m.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      {m.opponent ? `vs ${m.opponent}` : "Sin rival definido"}
                    </CardTitle>
                    <Badge variant={m.matchType === "OFFICIAL" ? "default" : "secondary"}>
                      {m.matchType === "OFFICIAL" ? "Oficial" : "Preparación"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <p className="text-sm text-gray-600 capitalize">
                    {format(new Date(m.matchDate + "T12:00:00"), "EEEE d 'de' MMMM yyyy", { locale: es })}
                  </p>
                  {m.location && <p className="text-xs text-gray-400">📍 {m.location}</p>}
                  {(m.homeScore !== null && m.awayScore !== null) && (
                    <p className="text-lg font-bold text-blue-700">
                      {myTeam.split(" ")[0]} {m.homeScore} — {m.awayScore} {m.opponent ?? "Rival"}
                    </p>
                  )}
                  {m.quarterDuration && (
                    <p className="text-xs text-gray-400">⏱ {m.quarterDuration} min/cuarto</p>
                  )}
                  {(m.evalOverall || m.evalAttack || m.evalDefense || m.evalFinishing) && (
                    <div className="flex gap-3 pt-0.5">
                      {m.evalOverall && <span className={`text-xs font-semibold ${EVAL_COLORS[m.evalOverall]}`}>Gral: {m.evalOverall}/4</span>}
                      {m.evalAttack && <span className={`text-xs font-semibold ${EVAL_COLORS[m.evalAttack]}`}>Atq: {m.evalAttack}/4</span>}
                      {m.evalDefense && <span className={`text-xs font-semibold ${EVAL_COLORS[m.evalDefense]}`}>Def: {m.evalDefense}/4</span>}
                      {m.evalFinishing && <span className={`text-xs font-semibold ${EVAL_COLORS[m.evalFinishing]}`}>Def: {m.evalFinishing}/4</span>}
                    </div>
                  )}
                  <p className="text-xs text-gray-400">
                    {m._count.playerStats} estadística{m._count.playerStats !== 1 ? "s" : ""} cargada{m._count.playerStats !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo Partido</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            {/* Fecha y tipo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fecha *</Label>
                <Input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <div className="flex gap-2 pt-1">
                  {(["OFFICIAL", "PRACTICE"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setMatchType(t)}
                      className={`flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors ${matchType === t ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-300 hover:border-blue-400"}`}>
                      {t === "OFFICIAL" ? "Oficial" : "Preparación"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Rival y sede */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Rival</Label>
                <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="Ej: Bolivia" />
              </div>
              <div className="space-y-1">
                <Label>Sede/Lugar</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Piscina, cancha..." />
              </div>
            </div>

            {/* Score */}
            <div className="space-y-2">
              <Label>Marcador</Label>
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <p className="text-xs text-gray-500 font-medium truncate">{myTeam.split(" ")[0] || "Mi equipo"}</p>
                  <Input
                    type="number"
                    min="0"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    placeholder="0"
                    className="text-center text-lg font-bold"
                  />
                </div>
                <span className="text-2xl font-bold text-gray-400 mt-4">—</span>
                <div className="flex-1 space-y-1">
                  <p className="text-xs text-gray-500 font-medium truncate">{opponent || "Rival"}</p>
                  <Input
                    type="number"
                    min="0"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    placeholder="0"
                    className="text-center text-lg font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Duración de cuarto */}
            <div className="space-y-2">
              <Label>Duración de cada cuarto (4 cuartos fijos)</Label>
              <div className="flex gap-2 flex-wrap">
                {[6, 7, 8, 9, 10].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setQuarterDuration(quarterDuration === min ? null : min)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      quarterDuration === min
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {min} min
                  </button>
                ))}
              </div>
            </div>

            {/* Evaluaciones del equipo */}
            <div className="space-y-3 rounded-lg border bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700">Calificación del equipo</p>
              <div className="grid grid-cols-2 gap-4">
                <EvalSelector value={evalOverall} onChange={setEvalOverall} label="Rendimiento general" />
                <EvalSelector value={evalAttack} onChange={setEvalAttack} label="Ataque" />
                <EvalSelector value={evalDefense} onChange={setEvalDefense} label="Defensa" />
                <EvalSelector value={evalFinishing} onChange={setEvalFinishing} label="Definiciones" />
              </div>
              <p className="text-xs text-gray-400">1=Bajo · 2=Regular · 3=Bueno · 4=Excelente</p>
            </div>

            {/* Notas */}
            <div className="space-y-1">
              <Label>Observaciones</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notas sobre el partido..." />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Creando..." : "Crear partido"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
