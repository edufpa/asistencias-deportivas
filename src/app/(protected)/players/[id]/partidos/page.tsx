"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Quarter = { quarter: number; goals: number; assists: number; recoveries: number; expulsions: number; penalties: number };
type MatchStats = {
  matchId: string; matchDate: string; matchType: string;
  opponent: string | null; homeScore: number | null; awayScore: number | null;
  convocatoriaName: string;
  quarters: Quarter[];
  totals: { goals: number; assists: number; recoveries: number; expulsions: number; penalties: number };
};
type Overall = { goals: number; assists: number; recoveries: number; expulsions: number; penalties: number; matches: number };
type Player = { id: string; firstName: string; lastName: string };

const STAT_COLS = [
  { key: "goals" as const, label: "Goles", color: "text-green-700" },
  { key: "assists" as const, label: "Asist.", color: "text-blue-700" },
  { key: "recoveries" as const, label: "Recup.", color: "text-purple-700" },
  { key: "expulsions" as const, label: "Expuls.", color: "text-red-700" },
  { key: "penalties" as const, label: "Penales", color: "text-orange-700" },
];

export default function PlayerPartidosPage() {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [matches, setMatches] = useState<MatchStats[]>([]);
  const [overall, setOverall] = useState<Overall | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/players/${id}`).then((r) => r.json()),
      fetch(`/api/players/${id}/partidos`).then((r) => r.json()),
    ]).then(([p, d]) => {
      setPlayer(p);
      if (d.matches) {
        setMatches(d.matches);
        setOverall(d.overall);
      }
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
          ⚽ Partidos — {player?.lastName}, {player?.firstName}
        </h1>
        <p className="text-gray-500 mt-1">Estadísticas en partidos registrados</p>
      </div>

      {/* Totales globales */}
      {overall && overall.matches > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold text-gray-700">{overall.matches}</div>
              <p className="text-xs text-gray-500 mt-1">Partidos</p>
            </CardContent>
          </Card>
          {STAT_COLS.map((s) => (
            <Card key={s.key}>
              <CardContent className="pt-4 text-center">
                <div className={`text-3xl font-bold ${s.color}`}>{overall[s.key]}</div>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {matches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            Sin estadísticas de partidos para este jugador
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map((m) => {
            const result = m.homeScore !== null && m.awayScore !== null
              ? m.homeScore > m.awayScore ? "W" : m.homeScore < m.awayScore ? "L" : "E"
              : null;
            return (
              <Card key={m.matchId}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm">
                          <Link href={`/convocatorias/${m.convocatoriaName}`} className="text-gray-700">
                            {m.opponent ? `vs ${m.opponent}` : "Sin rival"}
                          </Link>
                        </CardTitle>
                        <Badge variant={m.matchType === "OFFICIAL" ? "default" : "secondary"} className="text-xs">
                          {m.matchType === "OFFICIAL" ? "Oficial" : "Prep."}
                        </Badge>
                        {result && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                            result === "W" ? "bg-green-100 text-green-800 border-green-200" :
                            result === "L" ? "bg-red-100 text-red-800 border-red-200" :
                            "bg-gray-100 text-gray-700 border-gray-200"
                          }`}>{result === "W" ? "Victoria" : result === "L" ? "Derrota" : "Empate"}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(new Date(m.matchDate), "d MMM yyyy", { locale: es })} · {m.convocatoriaName}
                      </p>
                    </div>
                    {m.homeScore !== null && m.awayScore !== null && (
                      <p className="text-xl font-black text-gray-700">{m.homeScore} — {m.awayScore}</p>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-1.5 text-left font-medium text-gray-500">Cuarto</th>
                          {STAT_COLS.map((s) => (
                            <th key={s.key} className={`px-3 py-1.5 text-center font-medium ${s.color}`}>{s.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {m.quarters.map((q) => (
                          <tr key={q.quarter}>
                            <td className="px-3 py-1.5 text-gray-500 font-medium">C{q.quarter}</td>
                            {STAT_COLS.map((s) => (
                              <td key={s.key} className={`px-3 py-1.5 text-center font-semibold ${q[s.key] > 0 ? s.color : "text-gray-300"}`}>
                                {q[s.key]}
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr className="bg-blue-50 font-bold">
                          <td className="px-3 py-1.5 text-blue-700">Total</td>
                          {STAT_COLS.map((s) => (
                            <td key={s.key} className={`px-3 py-1.5 text-center ${s.color}`}>{m.totals[s.key]}</td>
                          ))}
                        </tr>
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
