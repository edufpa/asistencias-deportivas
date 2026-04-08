"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EvaluationTimeInputs } from "@/components/tests/EvaluationTimeInputs";
import {
  formatSecondsAsMmSsCc,
  formatTestValue,
  isCompleteTimeParts,
  isTimeLikeUnit,
  secondsToTimePartsStrings,
  timePartsStringsToSeconds,
  type TimePartsStrings,
} from "@/lib/testTimeFormat";

const TeamBarChart = dynamic(
  () => import("./Charts").then((m) => m.TeamBarChart),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded-lg" /> }
);
const IndividualLineChart = dynamic(
  () => import("@/components/charts/TestLineChart").then((m) => m.TestLineChart),
  { ssr: false, loading: () => <div className="h-52 animate-pulse bg-gray-100 rounded-lg" /> }
);

type Evaluation = {
  id: string;
  value: number;
  evalDate: string;
  notes: string | null;
  player: { id: string; firstName: string; lastName: string; club: string | null };
  recordedBy: { name: string };
};

type Test = {
  id: string;
  name: string;
  unit: string;
  description: string | null;
  higherIsBetter: boolean;
  evaluations: Evaluation[];
};

type Player = { id: string; firstName: string; lastName: string; club: string | null };

export default function TestDetailPage() {
  const { id: testId } = useParams<{ id: string }>();
  const [test, setTest] = useState<Test | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [evalDate, setEvalDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [timeEntries, setTimeEntries] = useState<Record<string, TimePartsStrings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [playerHistory, setPlayerHistory] = useState<Evaluation[]>([]);
  const [editEval, setEditEval] = useState<Evaluation | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editTimeParts, setEditTimeParts] = useState<TimePartsStrings>({ min: "", sec: "", cs: "" });
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [evalFormError, setEvalFormError] = useState("");

  const fetchTest = useCallback(async () => {
    const res = await fetch(`/api/tests/${testId}`);
    if (res.ok) setTest(await res.json());
  }, [testId]);

  useEffect(() => {
    fetchTest();
    fetch("/api/players").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setPlayers(d);
    });
  }, [fetchTest]);

  async function fetchPlayerHistory(pid: string) {
    const res = await fetch(`/api/tests/${testId}/evaluations?playerId=${pid}`);
    if (res.ok) setPlayerHistory(await res.json());
  }

  function openEditEval(ev: Evaluation) {
    setEditEval(ev);
    setEvalFormError("");
    if (test && isTimeLikeUnit(test.unit)) {
      setEditTimeParts(secondsToTimePartsStrings(ev.value));
      setEditValue("");
    } else {
      setEditValue(String(ev.value));
      setEditTimeParts({ min: "", sec: "", cs: "" });
    }
    setEditDate(ev.evalDate.split("T")[0]);
    setEditNotes(ev.notes ?? "");
  }

  async function handleSaveEval() {
    if (!editEval || !test) return;
    setEvalFormError("");
    let valueNum: number;
    if (isTimeLikeUnit(test.unit)) {
      if (!isCompleteTimeParts(editTimeParts)) {
        setEvalFormError("Completá minutos, segundos (0–59) y centésimas (0–99).");
        return;
      }
      const s = timePartsStringsToSeconds(editTimeParts);
      if (s === null) {
        setEvalFormError("Valores de tiempo inválidos.");
        return;
      }
      valueNum = s;
    } else {
      valueNum = Number(editValue);
      if (Number.isNaN(valueNum)) {
        setEvalFormError("Ingresá un número válido.");
        return;
      }
    }
    setEditSaving(true);
    await fetch(`/api/tests/${testId}/evaluations/${editEval.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: valueNum, evalDate: editDate, notes: editNotes || null }),
    });
    setEditSaving(false);
    setEditEval(null);
    fetchTest();
    if (selectedPlayer) fetchPlayerHistory(selectedPlayer);
  }

  async function handleDeleteEval(evalId: string) {
    if (!confirm("¿Eliminar esta evaluación?")) return;
    await fetch(`/api/tests/${testId}/evaluations/${evalId}`, { method: "DELETE" });
    fetchTest();
    if (selectedPlayer) fetchPlayerHistory(selectedPlayer);
  }

  async function handleSave() {
    if (!test) return;
    let toSave: { playerId: string; value: number; evalDate: string }[] = [];
    if (isTimeLikeUnit(test.unit)) {
      for (const p of players) {
        const parts = timeEntries[p.id];
        if (!parts || !isCompleteTimeParts(parts)) continue;
        const sec = timePartsStringsToSeconds(parts);
        if (sec === null) continue;
        toSave.push({ playerId: p.id, value: sec, evalDate });
      }
    } else {
      toSave = Object.entries(entries)
        .filter(([, v]) => v !== "" && !isNaN(Number(v)))
        .map(([playerId, value]) => ({ playerId, value: Number(value), evalDate }));
    }

    if (toSave.length === 0) {
      setError(isTimeLikeUnit(test.unit) ? "Ingresá al menos una marca con min : seg . cs completa" : "Ingresá al menos una marca");
      return;
    }
    setError(""); setSaving(true);

    const res = await fetch(`/api/tests/${testId}/evaluations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evaluations: toSave }),
    });

    setSaving(false);
    if (!res.ok) { setError("Error al guardar"); return; }
    setSaved(true);
    setEntries({});
    setTimeEntries({});
    fetchTest();
    if (selectedPlayer) fetchPlayerHistory(selectedPlayer);
  }

  // Build team chart: best value per player (latest)
  const teamChartData = (() => {
    if (!test) return [];
    const best = new Map<string, { name: string; value: number }>();
    for (const ev of test.evaluations) {
      const key = ev.player.id;
      const name = `${ev.player.lastName.substring(0, 8)}`;
      if (!best.has(key) || (test.higherIsBetter ? ev.value > best.get(key)!.value : ev.value < best.get(key)!.value)) {
        best.set(key, { name, value: ev.value });
      }
    }
    return Array.from(best.values()).sort((a, b) =>
      test.higherIsBetter ? b.value - a.value : a.value - b.value
    );
  })();

  // Build individual chart
  const individualChartData = playerHistory.map((ev) => ({
    date: format(new Date(ev.evalDate), "d MMM", { locale: es }),
    value: ev.value,
  }));

  if (!test) return <div className="text-gray-400">Cargando...</div>;

  const timeMode = isTimeLikeUnit(test.unit);
  const chartFormatValue = timeMode ? (n: number) => formatSecondsAsMmSsCc(n) : undefined;

  const editEvalDialog = (
    <Dialog
      open={!!editEval}
      onOpenChange={(o) => {
        if (!o) {
          setEditEval(null);
          setEvalFormError("");
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Editar Evaluación</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Fecha</Label>
            <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
          </div>
          {timeMode ? (
            <div className="space-y-1">
              <Label>Tiempo (min : seg . centésimas)</Label>
              <p className="text-xs text-gray-500">Segundos 0–59, centésimas 0–99</p>
              <EvaluationTimeInputs
                value={editTimeParts}
                onChange={(next) => {
                  setEvalFormError("");
                  setEditTimeParts(next);
                }}
              />
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Marca ({test.unit})</Label>
              <Input type="number" step="any" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
            </div>
          )}
          {evalFormError && (
            <Alert variant="destructive"><AlertDescription>{evalFormError}</AlertDescription></Alert>
          )}
          <div className="space-y-1">
            <Label>Notas</Label>
            <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Observaciones..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditEval(null)}>Cancelar</Button>
          <Button onClick={handleSaveEval} disabled={editSaving}>{editSaving ? "Guardando..." : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {editEvalDialog}
      <div className="flex items-center gap-3">
        <Link href="/tests" className="text-gray-400 hover:text-gray-600 text-sm">← Tests</Link>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{test.name}</h1>
          <Badge variant="outline">{test.unit}</Badge>
          <Badge variant="secondary">{test.higherIsBetter ? "Mayor = mejor" : "Menor = mejor"}</Badge>
        </div>
        {test.description && <p className="text-gray-500 mt-1">{test.description}</p>}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Registro de marcas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Registrar Evaluación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Fecha de evaluación</Label>
              <Input type="date" value={evalDate} onChange={(e) => setEvalDate(e.target.value)} />
            </div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {saved && <Alert><AlertDescription className="text-green-700">✓ Marcas guardadas correctamente</AlertDescription></Alert>}
            {timeMode && (
              <p className="text-xs text-gray-500">
                Tiempo: <span className="font-mono">min : seg . cs</span> (ej. 1:05.37 = 1 min 5 seg 37 centésimas)
              </p>
            )}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {players.map((p) => (
                <div key={p.id} className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.lastName}, {p.firstName}</p>
                    {p.club && <p className="text-xs text-gray-400">{p.club}</p>}
                  </div>
                  {timeMode ? (
                    <EvaluationTimeInputs
                      value={timeEntries[p.id] ?? { min: "", sec: "", cs: "" }}
                      onChange={(next) => {
                        setSaved(false);
                        setTimeEntries((prev) => ({ ...prev, [p.id]: next }));
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="—"
                        value={entries[p.id] ?? ""}
                        onChange={(e) => {
                          setSaved(false);
                          setEntries((prev) => ({ ...prev, [p.id]: e.target.value }));
                        }}
                        className="w-24 text-right"
                      />
                      <span className="text-xs text-gray-500 w-8">{test.unit}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Guardando..." : "Guardar marcas"}
            </Button>
          </CardContent>
        </Card>

        {/* Gráfica equipo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ranking del Equipo (mejor marca)</CardTitle>
          </CardHeader>
          <CardContent>
            {teamChartData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin datos aún</p>
            ) : (
              <TeamBarChart data={teamChartData} unit={test.unit} formatValue={chartFormatValue} />
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Historial individual por jugador */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Historial Individual</h2>
        <div className="flex flex-wrap gap-2">
          {players.map((p) => {
            const hasData = test.evaluations.some((e) => e.player.id === p.id);
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPlayer(p.id);
                  fetchPlayerHistory(p.id);
                }}
                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  selectedPlayer === p.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : hasData
                    ? "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                    : "bg-gray-50 text-gray-400 border-gray-200"
                }`}
              >
                {p.lastName}, {p.firstName}
              </button>
            );
          })}
        </div>

        {selectedPlayer && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {players.find((p) => p.id === selectedPlayer)?.lastName},{" "}
                {players.find((p) => p.id === selectedPlayer)?.firstName}
                {" — "}
                <span className="font-normal text-gray-500">Evolución en {test.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {individualChartData.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Sin evaluaciones para este jugador</p>
              ) : (
                <IndividualLineChart data={individualChartData} unit={test.unit} testName={test.name} formatValue={chartFormatValue} />
              )}
              {playerHistory.length > 0 && (
                <div className="mt-3 border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Fecha</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Marca</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Notas</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[...playerHistory].reverse().map((ev) => (
                        <tr key={ev.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-700">{format(new Date(ev.evalDate), "d MMM yyyy", { locale: es })}</td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-700 font-mono">
                            {formatTestValue(ev.value, test.unit)}
                          </td>
                          <td className="px-3 py-2 text-gray-500 italic text-xs">{ev.notes ?? "—"}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button onClick={() => openEditEval(ev)} className="text-xs text-blue-500 hover:text-blue-700 font-medium">Editar</button>
                              <button onClick={() => handleDeleteEval(ev.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Borrar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
