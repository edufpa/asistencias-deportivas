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
  result: string | null;
  quarters: number;
  createdBy: { name: string };
  _count: { playerStats: number };
};

export default function PartidosPage() {
  const { id: convocatoriaId } = useParams<{ id: string }>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [convName, setConvName] = useState("");
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);

  // form state
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [matchType, setMatchType] = useState<"OFFICIAL" | "PRACTICE">("OFFICIAL");
  const [opponent, setOpponent] = useState("");
  const [location, setLocation] = useState("");
  const [result, setResult] = useState("");
  const [notes, setNotes] = useState("");
  const [quarters, setQuarters] = useState(4);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const res = await fetch(`/api/convocatorias/${convocatoriaId}/partidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchDate, matchType, opponent: opponent || null, location: location || null, result: result || null, notes: notes || null, quarters }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error"); return; }
    setOpenForm(false);
    setOpponent(""); setLocation(""); setResult(""); setNotes("");
    fetchMatches();
  }

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
        <Button onClick={() => setOpenForm(true)}>+ Nuevo partido</Button>
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
                <CardContent className="space-y-1">
                  <p className="text-sm text-gray-700 font-medium capitalize">
                    {format(new Date(m.matchDate + "T12:00:00"), "EEEE d 'de' MMMM yyyy", { locale: es })}
                  </p>
                  {m.location && <p className="text-xs text-gray-400">📍 {m.location}</p>}
                  {m.result && <p className="text-sm font-bold text-blue-700">Resultado: {m.result}</p>}
                  <p className="text-xs text-gray-400">
                    {m.quarters} cuartos · {m._count.playerStats} estadística{m._count.playerStats !== 1 ? "s" : ""} cargada{m._count.playerStats !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo Partido</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
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
                      className={`flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors ${matchType === t ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-300"}`}>
                      {t === "OFFICIAL" ? "Oficial" : "Preparación"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Rival</Label>
              <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="Nombre del equipo rival" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Sede/Lugar</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Piscina, cancha..." />
              </div>
              <div className="space-y-1">
                <Label>Resultado</Label>
                <Input value={result} onChange={(e) => setResult(e.target.value)} placeholder="Ej: 3-2" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Cantidad de cuartos</Label>
              <div className="flex gap-2">
                {[2, 4, 6].map((q) => (
                  <button key={q} type="button" onClick={() => setQuarters(q)}
                    className={`px-4 py-1.5 rounded-md border text-sm font-medium transition-colors ${quarters === q ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-300"}`}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Observaciones del partido..." />
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
