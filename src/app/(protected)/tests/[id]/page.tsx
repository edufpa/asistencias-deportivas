"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";

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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [playerHistory, setPlayerHistory] = useState<Evaluation[]>([]);

  const fetchTest = useCallback(async () => {
    const res = await fetch(`/api/tests/${testId}`);
    if (res.ok) setTest(await res.json());
  }, [testId]);

  useEffect(() => {
    fetchTest();
    fetch("/api/players").then((r) => r.json()).then(setPlayers);
  }, [fetchTest]);

  async function fetchPlayerHistory(pid: string) {
    const res = await fetch(`/api/tests/${testId}/evaluations?playerId=${pid}`);
    if (res.ok) setPlayerHistory(await res.json());
  }

  async function handleSave() {
    const toSave = Object.entries(entries)
      .filter(([, v]) => v !== "" && !isNaN(Number(v)))
      .map(([playerId, value]) => ({ playerId, value: Number(value), evalDate }));

    if (toSave.length === 0) { setError("Ingresá al menos una marca"); return; }
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
    date: format(new Date(ev.evalDate + "T12:00:00"), "d MMM", { locale: es }),
    value: ev.value,
  }));

  if (!test) return <div className="text-gray-400">Cargando...</div>;

  return (
    <div className="space-y-6">
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
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {players.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.lastName}, {p.firstName}</p>
                    {p.club && <p className="text-xs text-gray-400">{p.club}</p>}
                  </div>
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
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={teamChartData} margin={{ top: 4, right: 8, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v} ${test.unit}`, "Mejor marca"]} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={individualChartData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v} ${test.unit}`, test.name]} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 5 }}
                      activeDot={{ r: 7 }}
                      name={`${test.name} (${test.unit})`}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {playerHistory.length > 0 && (
                <div className="mt-3 border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Fecha</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Marca</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[...playerHistory].reverse().map((ev) => (
                        <tr key={ev.id}>
                          <td className="px-3 py-2 text-gray-700">
                            {format(new Date(ev.evalDate + "T12:00:00"), "d MMM yyyy", { locale: es })}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-700">
                            {ev.value} {test.unit}
                          </td>
                          <td className="px-3 py-2 text-gray-500 italic text-xs">{ev.notes ?? "—"}</td>
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
