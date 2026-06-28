"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  PageShell,
  PageHeader,
  FilterChip,
  FilterChipGroup,
  LoadingState,
  EmptyState,
} from "@/components/layout";

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
  const router = useRouter();
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
  const [editTarget, setEditTarget] = useState<Match | null>(null);
  const [openEditForm, setOpenEditForm] = useState(false);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([
        fetch(`/api/convocatorias/${convocatoriaId}/partidos`),
        fetch(`/api/convocatorias/${convocatoriaId}`),
      ]);
      const mData = await mRes.json();
      setMatches(Array.isArray(mData) ? mData : []);
      const conv = await cRes.json();
      if (conv?.name) setConvName(conv.name);
    } catch (e) {
      console.error("Error cargando partidos:", e);
      setMatches([]);
    }
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
      }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error"); return; }
    const created = await res.json();
    setOpenForm(false);
    resetForm();
    router.push(`/convocatorias/${convocatoriaId}/partidos/${created.id}`);
  }

  function openEditMatch(m: Match) {
    setEditTarget(m);
    setMatchDate(m.matchDate.split("T")[0]);
    setMatchType(m.matchType);
    setOpponent(m.opponent ?? "");
    setLocation(m.location ?? "");
    setHomeScore(m.homeScore !== null ? String(m.homeScore) : "");
    setAwayScore(m.awayScore !== null ? String(m.awayScore) : "");
    setQuarterDuration(m.quarterDuration);
    setNotes("");
    setEvalOverall(m.evalOverall);
    setEvalAttack(m.evalAttack);
    setEvalDefense(m.evalDefense);
    setEvalFinishing(m.evalFinishing);
    setOpenEditForm(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setError(""); setSaving(true);
    const res = await fetch(`/api/convocatorias/${convocatoriaId}/partidos/${editTarget.id}`, {
      method: "PUT",
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
    setOpenEditForm(false);
    setEditTarget(null);
    resetForm();
    fetchMatches();
  }

  async function handleDeleteMatch(matchId: string, opponent: string | null) {
    if (!confirm(`¿Eliminar el partido${opponent ? ` vs ${opponent}` : ""}? Se borrarán todas las estadísticas.`)) return;
    await fetch(`/api/convocatorias/${convocatoriaId}/partidos/${matchId}`, { method: "DELETE" });
    fetchMatches();
  }

  // Get "my team" name from convocatoria name
  const myTeam = convName || "Nosotros";

  return (
    <PageShell>
      <Link href={`/convocatorias/${convocatoriaId}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← {convName}
      </Link>

      <PageHeader
        title="Partidos"
        description="Oficiales y de preparación"
        actions={
          <Button onClick={() => { resetForm(); setOpenForm(true); }}>+ Nuevo partido</Button>
        }
      />

      {loading ? (
        <LoadingState />
      ) : matches.length === 0 ? (
        <EmptyState message="Sin partidos registrados" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {matches.map((m) => (
            <Card key={m.id} className="hover:shadow-md transition-shadow">
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
                  {format(new Date(m.matchDate), "EEEE d 'de' MMMM yyyy", { locale: es })}
                </p>
                {m.location && <p className="text-xs text-gray-400">📍 {m.location}</p>}
                {(m.homeScore !== null && m.awayScore !== null) && (
                  <p className="text-lg font-bold text-blue-700">
                    {myTeam.split(" ")[0]} {m.homeScore} — {m.awayScore} {m.opponent ?? "Rival"}
                  </p>
                )}
                {m.quarterDuration && <p className="text-xs text-gray-400">⏱ {m.quarterDuration} min/cuarto</p>}
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
                <div className="flex gap-2 pt-2">
                  <Link href={`/convocatorias/${convocatoriaId}/partidos/${m.id}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full">Ver detalle</Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => openEditMatch(m)}>Editar</Button>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteMatch(m.id, m.opponent)}>
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
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
              <FilterChipGroup label="Tipo *">
                {(["OFFICIAL", "PRACTICE"] as const).map((t) => (
                  <FilterChip key={t} active={matchType === t} onClick={() => setMatchType(t)} className="flex-1">
                    {t === "OFFICIAL" ? "Oficial" : "Preparación"}
                  </FilterChip>
                ))}
              </FilterChipGroup>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Creando..." : "Crear partido"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog editar partido */}
      <Dialog open={openEditForm} onOpenChange={(o) => { setOpenEditForm(o); if (!o) { setEditTarget(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Partido</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-5">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fecha *</Label>
                <Input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} required />
              </div>
              <FilterChipGroup label="Tipo *">
                {(["OFFICIAL", "PRACTICE"] as const).map((t) => (
                  <FilterChip key={t} active={matchType === t} onClick={() => setMatchType(t)} className="flex-1">
                    {t === "OFFICIAL" ? "Oficial" : "Preparación"}
                  </FilterChip>
                ))}
              </FilterChipGroup>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Rival</Label><Input value={opponent} onChange={(e) => setOpponent(e.target.value)} /></div>
              <div className="space-y-1"><Label>Sede</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>Marcador</Label>
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <p className="text-xs text-gray-500 font-medium">{myTeam.split(" ")[0] || "Mi equipo"}</p>
                  <Input type="number" min="0" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} placeholder="0" className="text-center text-lg font-bold" />
                </div>
                <span className="text-2xl font-bold text-gray-400 mt-4">—</span>
                <div className="flex-1 space-y-1">
                  <p className="text-xs text-gray-500 font-medium">{opponent || "Rival"}</p>
                  <Input type="number" min="0" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} placeholder="0" className="text-center text-lg font-bold" />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Duración por cuarto (min)</Label>
              <Input type="number" min="1" value={quarterDuration ?? ""} onChange={(e) => setQuarterDuration(e.target.value ? Number(e.target.value) : null)} placeholder="6, 7, 9..." />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Calificaciones del equipo</Label>
              <div className="grid grid-cols-2 gap-3">
                <EvalSelector value={evalOverall} onChange={setEvalOverall} label="General" />
                <EvalSelector value={evalAttack} onChange={setEvalAttack} label="Ataque" />
                <EvalSelector value={evalDefense} onChange={setEvalDefense} label="Defensa" />
                <EvalSelector value={evalFinishing} onChange={setEvalFinishing} label="Definiciones" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observaciones</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpenEditForm(false); setEditTarget(null); resetForm(); }}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
