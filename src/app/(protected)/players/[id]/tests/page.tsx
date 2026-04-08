"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSecondsAsMmSsCc, formatTestValue, isTimeLikeUnit } from "@/lib/testTimeFormat";

const IndividualLineChart = dynamic(
  () => import("@/components/charts/TestLineChart").then((m) => m.TestLineChart),
  { ssr: false, loading: () => <div className="h-40 animate-pulse bg-gray-100 rounded-lg" /> }
);

type TestGroup = {
  testId: string; testName: string; unit: string; higherIsBetter: boolean;
  evaluations: { id: string; value: number; evalDate: string; notes: string | null }[];
};

type Player = { id: string; firstName: string; lastName: string };

export default function PlayerTestsPage() {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [tests, setTests] = useState<TestGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/players/${id}`).then((r) => r.json()),
      fetch(`/api/players/${id}/tests`).then((r) => r.json()),
    ]).then(([p, t]) => {
      setPlayer(p);
      setTests(Array.isArray(t) ? t : []);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="text-gray-400 py-8 text-center">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/players" className="text-gray-400 hover:text-gray-600 text-sm">← Jugadores</Link>
        <span className="text-gray-300">/</span>
        <Link href={`/players/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          {player?.lastName}, {player?.firstName}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          🏋️ Tests — {player?.lastName}, {player?.firstName}
        </h1>
        <p className="text-gray-500 mt-1">Historial de evaluaciones físicas</p>
      </div>

      {tests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            Sin evaluaciones registradas para este jugador
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {tests.map((t) => {
            const sorted = [...t.evaluations].sort((a, b) => new Date(a.evalDate).getTime() - new Date(b.evalDate).getTime());
            const latest = sorted[sorted.length - 1];
            const best = t.higherIsBetter
              ? sorted.reduce((a, b) => (b.value > a.value ? b : a))
              : sorted.reduce((a, b) => (b.value < a.value ? b : a));
            const timeU = isTimeLikeUnit(t.unit);
            const avgSec = sorted.reduce((s, e) => s + e.value, 0) / sorted.length;
            const chartData = sorted.map((ev) => ({
              date: format(new Date(ev.evalDate), "d MMM", { locale: es }),
              value: ev.value,
            }));
            const chartFmt = timeU ? (n: number) => formatSecondsAsMmSsCc(n) : undefined;

            return (
              <Card key={t.testId}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <CardTitle className="text-base">
                      <Link href={`/tests/${t.testId}`} className="hover:text-blue-600 hover:underline">
                        {t.testName}
                      </Link>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{t.unit}</Badge>
                      <Badge variant="secondary">{t.higherIsBetter ? "Mayor = mejor" : "Menor = mejor"}</Badge>
                      <span className="text-xs text-gray-400">{t.evaluations.length} eval{t.evaluations.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-4 mb-4">
                    <div className="text-center bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-700 font-mono">{formatTestValue(latest.value, t.unit)}</div>
                      <p className="text-xs text-gray-500">{t.unit} — Último</p>
                      <p className="text-xs text-gray-400">{format(new Date(latest.evalDate), "d MMM yyyy", { locale: es })}</p>
                    </div>
                    <div className="text-center bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600 font-mono">{formatTestValue(best.value, t.unit)}</div>
                      <p className="text-xs text-gray-500">{t.unit} — {t.higherIsBetter ? "Máximo" : "Mínimo"}</p>
                      <p className="text-xs text-gray-400">{format(new Date(best.evalDate), "d MMM yyyy", { locale: es })}</p>
                    </div>
                    <div className="text-center bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-700 font-mono">
                        {timeU ? formatSecondsAsMmSsCc(avgSec) : avgSec.toFixed(1)}
                      </div>
                      <p className="text-xs text-gray-500">{t.unit} — Promedio</p>
                    </div>
                  </div>
                  {sorted.length > 1 && (
                    <IndividualLineChart data={chartData} unit={t.unit} testName={t.testName} formatValue={chartFmt} />
                  )}
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-gray-50 text-left">
                        <th className="px-3 py-1.5 font-medium text-gray-600">Fecha</th>
                        <th className="px-3 py-1.5 font-medium text-gray-600 text-right">Marca</th>
                        <th className="px-3 py-1.5 font-medium text-gray-600">Notas</th>
                      </tr></thead>
                      <tbody className="divide-y">
                        {[...sorted].reverse().map((ev) => (
                          <tr key={ev.id}>
                            <td className="px-3 py-1.5 text-gray-600">{format(new Date(ev.evalDate), "d MMM yyyy", { locale: es })}</td>
                            <td className="px-3 py-1.5 text-right font-bold text-blue-700 font-mono">{formatTestValue(ev.value, t.unit)}</td>
                            <td className="px-3 py-1.5 text-gray-400 italic text-xs">{ev.notes ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
