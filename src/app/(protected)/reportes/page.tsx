"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Convocatoria = {
  id: string;
  name: string;
  status: "ACTIVE" | "CLOSED";
};

type PlayerRanking = {
  playerId: string;
  firstName: string;
  lastName: string;
  documentId: string;
  club: string | null;
  playerStatus: "ACTIVE" | "CUT";
  attended: number;
  absentJustified: number;
  absentUnjustified: number;
  totalRegistered: number;
  attendancePct: number | null;
  avgScore: number | null;
};

type ReporteData = {
  convocatoria: { id: string; name: string; status: string };
  filters: { sessionType: string; dateFrom: string | null; dateTo: string | null };
  summary: {
    totalSessions: number;
    totalPlayers: number;
    activePlayers: number;
    globalAttendancePct: number;
    sessionsByType: Record<string, number>;
  };
  ranking: PlayerRanking[];
};

const SESSION_OPTIONS = [
  { value: "ALL", label: "Todos los turnos" },
  { value: "TURNO_MANANA", label: "Turno Mañana" },
  { value: "TURNO_TARDE", label: "Turno Tarde" },
  { value: "PESAS", label: "Pesas" },
];

function AttendancePill({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-gray-300 text-sm">—</span>;
  const color =
    pct >= 80
      ? "bg-green-100 text-green-700 border-green-200"
      : pct >= 60
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : "bg-red-100 text-red-700 border-red-200";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-sm font-semibold border ${color}`}>
      {pct}%
    </span>
  );
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-300 text-sm">—</span>;
  const color =
    score >= 3.5
      ? "text-green-700 font-bold"
      : score >= 2.5
      ? "text-blue-700 font-semibold"
      : score >= 1.5
      ? "text-yellow-700 font-semibold"
      : "text-red-700 font-semibold";
  return <span className={`text-sm ${color}`}>{score.toFixed(1)}</span>;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 tabular-nums">{value}</span>
    </div>
  );
}

export default function ReportesPage() {
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [selectedConv, setSelectedConv] = useState("");
  const [sessionType, setSessionType] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReporteData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/convocatorias")
      .then((r) => r.json())
      .then((d) => {
        setConvocatorias(d);
        if (d.length > 0) setSelectedConv(d[0].id);
      });
  }, []);

  const fetchReporte = useCallback(async () => {
    if (!selectedConv) return;
    setLoading(true);
    setError("");

    const params = new URLSearchParams({ convocatoriaId: selectedConv, sessionType });
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    const res = await fetch(`/api/reportes/asistencia?${params}`);
    setLoading(false);

    if (!res.ok) {
      setError("Error al cargar el reporte");
      return;
    }
    setData(await res.json());
  }, [selectedConv, sessionType, dateFrom, dateTo]);

  // Auto-fetch when convocatoria changes
  useEffect(() => {
    if (selectedConv) fetchReporte();
  }, [selectedConv, fetchReporte]);

  const maxRegistered = data ? Math.max(...data.ranking.map((r) => r.totalRegistered), 1) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes de Asistencia</h1>
          <p className="text-gray-500 mt-1">Ranking y estadísticas por convocatoria</p>
        </div>
        <Link href="/reportes/partidos">
          <Button variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50">
            Reporte de Partidos →
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Convocatoria */}
            <div className="space-y-1">
              <Label>Convocatoria</Label>
              <select
                value={selectedConv}
                onChange={(e) => setSelectedConv(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {convocatorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.status === "ACTIVE" ? "🟢" : "⚫"}
                  </option>
                ))}
              </select>
            </div>

            {/* Turno */}
            <div className="space-y-1">
              <Label>Turno</Label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SESSION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Fechas */}
            <div className="space-y-1">
              <Label>Desde</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Button onClick={fetchReporte} disabled={!selectedConv || loading}>
              {loading ? "Cargando..." : "Generar reporte"}
            </Button>
            {(dateFrom || dateTo || sessionType !== "ALL") && (
              <Button
                variant="outline"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setSessionType("ALL");
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {data && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 text-center">
                <div className="text-3xl font-bold text-blue-700">
                  {data.summary.globalAttendancePct}%
                </div>
                <p className="text-xs text-gray-500 mt-1">Asistencia global</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <div className="text-3xl font-bold text-gray-800">
                  {data.summary.totalSessions}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Sesión{data.summary.totalSessions !== 1 ? "es" : ""}
                </p>
                {Object.entries(data.summary.sessionsByType).length > 0 && (
                  <div className="mt-1 flex flex-wrap justify-center gap-1">
                    {Object.entries(data.summary.sessionsByType).map(([type, count]) => (
                      <span key={type} className="text-xs text-gray-400">
                        {type === "TURNO_MANANA"
                          ? `M:${count}`
                          : type === "TURNO_TARDE"
                          ? `T:${count}`
                          : `P:${count}`}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {data.summary.activePlayers}
                </div>
                <p className="text-xs text-gray-500 mt-1">Jugadores activos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <div className="text-3xl font-bold text-gray-600">
                  {data.summary.totalPlayers}
                </div>
                <p className="text-xs text-gray-500 mt-1">Total convocados</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros activos */}
          {(data.filters.dateFrom ||
            data.filters.dateTo ||
            data.filters.sessionType !== "ALL") && (
            <div className="flex flex-wrap gap-2 items-center text-sm text-gray-500">
              <span>Filtros activos:</span>
              {data.filters.sessionType !== "ALL" && (
                <Badge variant="secondary">
                  {SESSION_OPTIONS.find((o) => o.value === data.filters.sessionType)?.label}
                </Badge>
              )}
              {data.filters.dateFrom && (
                <Badge variant="secondary">Desde: {data.filters.dateFrom}</Badge>
              )}
              {data.filters.dateTo && (
                <Badge variant="secondary">Hasta: {data.filters.dateTo}</Badge>
              )}
            </div>
          )}

          {/* Ranking table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Ranking de Asistencia — {data.convocatoria.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.ranking.length === 0 ? (
                <p className="text-center py-10 text-gray-400">Sin datos para los filtros seleccionados</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 text-center">#</TableHead>
                        <TableHead>Jugador</TableHead>
                        <TableHead className="text-center">Asistencia</TableHead>
                        <TableHead className="hidden sm:table-cell">Asistió</TableHead>
                        <TableHead className="hidden sm:table-cell">Just.</TableHead>
                        <TableHead className="hidden sm:table-cell">Injust.</TableHead>
                        <TableHead className="text-center">Prom. Puntaje</TableHead>
                        <TableHead className="hidden md:table-cell text-center">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.ranking.map((player, index) => {
                        const rank = index + 1;
                        const rankColor =
                          rank === 1
                            ? "text-yellow-500 font-bold text-base"
                            : rank === 2
                            ? "text-gray-400 font-bold"
                            : rank === 3
                            ? "text-amber-600 font-bold"
                            : "text-gray-400";

                        return (
                          <TableRow
                            key={player.playerId}
                            className={player.playerStatus === "CUT" ? "opacity-50" : ""}
                          >
                            <TableCell className="text-center">
                              <span className={rankColor}>{rank}</span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {player.lastName}, {player.firstName}
                                </p>
                                <p className="text-xs text-gray-400">{player.documentId}</p>
                                {player.club && (
                                  <p className="text-xs text-gray-400">{player.club}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {player.totalRegistered === 0 ? (
                                <span className="text-xs text-gray-300">Sin datos</span>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <AttendancePill pct={player.attendancePct} />
                                  <span className="text-xs text-gray-400">
                                    {player.attended}/{player.totalRegistered}
                                  </span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <MiniBar
                                value={player.attended}
                                max={maxRegistered}
                                color="bg-green-500"
                              />
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <MiniBar
                                value={player.absentJustified}
                                max={maxRegistered}
                                color="bg-yellow-400"
                              />
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <MiniBar
                                value={player.absentUnjustified}
                                max={maxRegistered}
                                color="bg-red-400"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <ScorePill score={player.avgScore} />
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-center">
                              {player.playerStatus === "CUT" ? (
                                <Badge variant="destructive" className="text-xs">
                                  Cortado
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-green-600 border-green-300"
                                >
                                  Activo
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leyenda */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Asistió
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Inasistencia
              justificada (Just.)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Inasistencia
              injustificada (Injust.)
            </div>
            <div className="flex items-center gap-2 ml-4 pl-4 border-l">
              <span className="text-green-700 font-bold">≥80%</span>
              <span className="text-yellow-700 font-semibold">60–79%</span>
              <span className="text-red-700 font-semibold">&lt;60%</span>
              <span className="text-gray-400">= rangos de asistencia</span>
            </div>
            <div className="ml-4 pl-4 border-l">
              Puntaje: 1=Bajo · 2=Regular · 3=Bueno · 4=Excelente
            </div>
          </div>
        </>
      )}
    </div>
  );
}
