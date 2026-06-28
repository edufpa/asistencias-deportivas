"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  formatPlayerName,
  CATEGORIES,
  CATEGORY_LABELS,
  PLAYER_GENDER_OPTIONS,
} from "@/lib/player";
import type { Category, PlayerGender } from "@/lib/player";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FilterChip,
  FilterChipGroup,
  PageHeader,
  PageShell,
  PageTabs,
  StatCard,
  StatGrid,
} from "@/components/layout";
import { Activity, CalendarDays, Users } from "lucide-react";

type PeriodPreset = "7" | "15" | "30" | "90" | "180" | "364" | "custom";

const PERIOD_PRESETS = new Set<PeriodPreset>(["7", "15", "30", "90", "180", "364", "custom"]);

function parseReportFilters(searchParams: URLSearchParams) {
  const categoryParam = searchParams.get("category");
  const category =
    categoryParam && CATEGORIES.includes(categoryParam as Category)
      ? (categoryParam as Category)
      : "SUB16";

  const genderParam = searchParams.get("gender");
  const gender: PlayerGender =
    genderParam === "MALE" || genderParam === "FEMALE" ? genderParam : "MALE";

  const periodParam = searchParams.get("period");
  const period: PeriodPreset =
    periodParam && PERIOD_PRESETS.has(periodParam as PeriodPreset)
      ? (periodParam as PeriodPreset)
      : "30";

  return {
    category,
    gender,
    period,
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
  };
}

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "7", label: "7 días" },
  { value: "15", label: "15 días" },
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
  { value: "180", label: "180 días" },
  { value: "364", label: "364 días" },
  { value: "custom", label: "Personalizado" },
];

const SESSION_OPTIONS = [
  { value: "ALL", label: "Todos los turnos (acumulado)" },
  { value: "TURNO_MANANA", label: "Turno Mañana" },
  { value: "TURNO_TARDE", label: "Turno Tarde" },
  { value: "PESAS", label: "Pesas" },
];

type TurnStats = {
  sessionType: string;
  label: string;
  sessions?: number;
  attended: number;
  absentJustified: number;
  absentUnjustified: number;
  totalRegistered: number;
  attendancePct: number | null;
  avgScore: number | null;
};

type PlayerRanking = {
  playerId: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  documentId: string;
  birthYear: number;
  playerStatus: "ACTIVE" | "CUT";
  attended: number;
  absentJustified: number;
  absentUnjustified: number;
  totalRegistered: number;
  attendancePct: number | null;
  avgScore: number | null;
  bySessionType: TurnStats[];
};

type ReportTab = "ranking" | "categorias";

type CategoryGenderRow = {
  category: Category;
  categoryLabel: string;
  gender: PlayerGender;
  genderLabel: string;
  totalPlayers: number;
  totalSessions: number;
  attended: number;
  absentJustified: number;
  absentUnjustified: number;
  totalRegistered: number;
  attendancePct: number | null;
  avgScore: number | null;
  bySessionType: TurnStats[];
};

type CategoriasReporteData = {
  filters: {
    sessionType: string;
    period: string;
    dateFrom: string | null;
    dateTo: string | null;
  };
  summary: {
    totalSessions: number;
    globalAttendancePct: number;
    attended: number;
    absentJustified: number;
    absentUnjustified: number;
    totalRegistered: number;
    attendancePct: number | null;
    avgScore: number | null;
  };
  rows: CategoryGenderRow[];
};

type ReporteData = {
  category: Category | null;
  filters: {
    sessionType: string;
    gender: PlayerGender;
    period: string;
    dateFrom: string | null;
    dateTo: string | null;
  };
  summary: {
    totalSessions: number;
    totalPlayers: number;
    activePlayers: number;
    globalAttendancePct: number;
    sessionsByType: Record<string, number>;
    bySessionType: TurnStats[];
  };
  ranking: PlayerRanking[];
};

function buildPlayerAsistenciaHref(
  playerId: string,
  filters: ReporteData["filters"]
): string {
  const params = new URLSearchParams();
  if (filters.dateFrom && filters.dateTo) {
    params.set("period", "custom");
    params.set("dateFrom", filters.dateFrom);
    params.set("dateTo", filters.dateTo);
  } else if (filters.period) {
    params.set("period", filters.period);
  }
  const qs = params.toString();
  return `/players/${playerId}/asistencia${qs ? `?${qs}` : ""}`;
}

function AttendancePill({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-gray-300 text-xs">—</span>;
  const color =
    pct >= 80
      ? "bg-green-100 text-green-700 border-green-200"
      : pct >= 60
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : "bg-red-100 text-red-700 border-red-200";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {pct}%
    </span>
  );
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-300 text-xs">—</span>;
  const color =
    score >= 3.5
      ? "text-green-700 font-bold"
      : score >= 2.5
      ? "text-blue-700 font-semibold"
      : score >= 1.5
      ? "text-yellow-700 font-semibold"
      : "text-red-700 font-semibold";
  return <span className={`text-xs ${color}`}>{score.toFixed(1)}</span>;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-600 tabular-nums">{value}</span>
    </div>
  );
}

function TurnCell({ stats }: { stats?: TurnStats }) {
  if (!stats || stats.totalRegistered === 0) {
    return <span className="text-xs text-gray-300">—</span>;
  }
  return (
    <div className="flex flex-col items-center gap-0.5">
      <AttendancePill pct={stats.attendancePct} />
      <ScorePill score={stats.avgScore} />
    </div>
  );
}

export default function ReportesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlFilters = useMemo(
    () => parseReportFilters(searchParams),
    [searchParams]
  );
  const [activeTab, setActiveTab] = useState<ReportTab>("ranking");
  const [selectedCategory, setSelectedCategory] = useState<Category>(urlFilters.category);
  const [selectedGender, setSelectedGender] = useState<PlayerGender>(urlFilters.gender);
  const [sessionType, setSessionType] = useState("ALL");
  const [period, setPeriod] = useState<PeriodPreset>(urlFilters.period);
  const [dateFrom, setDateFrom] = useState(urlFilters.dateFrom);
  const [dateTo, setDateTo] = useState(urlFilters.dateTo);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReporteData | null>(null);
  const [categoriasData, setCategoriasData] = useState<CategoriasReporteData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedCategory(urlFilters.category);
    setSelectedGender(urlFilters.gender);
    setPeriod(urlFilters.period);
    setDateFrom(urlFilters.dateFrom);
    setDateTo(urlFilters.dateTo);
  }, [urlFilters]);

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams({ sessionType, period });
    if (period === "custom") {
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
    }
    return params;
  }, [sessionType, period, dateFrom, dateTo]);

  const fetchReporte = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = buildFilterParams();
    params.set("category", selectedCategory);
    params.set("gender", selectedGender);

    const res = await fetch(`/api/reportes/asistencia?${params}`);
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError((body as { error?: string }).error ?? "Error al cargar el reporte");
      return;
    }
    setData(await res.json());
  }, [buildFilterParams, selectedCategory, selectedGender]);

  const fetchCategorias = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = buildFilterParams();

    const res = await fetch(`/api/reportes/asistencia/categorias?${params}`);
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError((body as { error?: string }).error ?? "Error al cargar el reporte");
      return;
    }
    setCategoriasData(await res.json());
  }, [buildFilterParams]);

  const fetchActiveTab = useCallback(async () => {
    if (activeTab === "ranking") await fetchReporte();
    else await fetchCategorias();
  }, [activeTab, fetchReporte, fetchCategorias]);

  useEffect(() => {
    if (period !== "custom") {
      fetchActiveTab();
    }
  }, [fetchActiveTab, period, activeTab]);

  const applyCustomPeriod = () => {
    if (dateFrom && dateTo) fetchActiveTab();
  };

  const maxRegistered = data ? Math.max(...data.ranking.map((r) => r.totalRegistered), 1) : 1;
  const showTurnColumns = sessionType === "ALL";
  const activeFilters = activeTab === "ranking" ? data?.filters : categoriasData?.filters;

  return (
    <PageShell>
      <PageHeader
        title="Reporte de Asistencia General"
        description="Ranking y estadísticas por categoría de edad"
        actions={
          <Button className="shrink-0" onClick={() => router.push(`/asistencias`)}>
            + Registrar Asistencia
          </Button>
        }
      />

      <PageTabs
        tabs={[
          { id: "ranking", label: "Ranking por jugador" },
          { id: "categorias", label: "Por categoría y género" },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      <Card>
        <CardContent className="pt-5 space-y-4">
          {activeTab === "ranking" && (
            <>
              <FilterChipGroup label="Categoría">
                {CATEGORIES.map((cat) => (
                  <FilterChip
                    key={cat}
                    active={selectedCategory === cat}
                    onClick={() => setSelectedCategory(cat)}
                    size="md"
                  >
                    {CATEGORY_LABELS[cat]}
                  </FilterChip>
                ))}
              </FilterChipGroup>

              <FilterChipGroup label="Género">
                {PLAYER_GENDER_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt.value}
                    active={selectedGender === opt.value}
                    onClick={() => setSelectedGender(opt.value)}
                    size="md"
                  >
                    {opt.label}
                  </FilterChip>
                ))}
              </FilterChipGroup>
            </>
          )}

          {activeTab === "categorias" && (
            <p className="text-sm text-muted-foreground">
              Vista comparativa de todas las categorías y géneros con los filtros de periodo y turno seleccionados.
            </p>
          )}

          <FilterChipGroup label="Periodo">
            {PERIOD_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                active={period === opt.value}
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </FilterChip>
            ))}
          </FilterChipGroup>

          {period === "custom" && (
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="space-y-1 sm:w-40">
                <Label htmlFor="dateFrom">Desde</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:w-40">
                <Label htmlFor="dateTo">Hasta</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <Button onClick={applyCustomPeriod} disabled={!dateFrom || !dateTo || loading}>
                Aplicar
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
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
            <div>
              <Button onClick={fetchActiveTab} disabled={loading}>
                {loading ? "Cargando..." : "Generar reporte"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {activeTab === "ranking" && data && (
        <>
          <StatGrid>
            <StatCard
              label="Asistencia global"
              value={`${data.summary.globalAttendancePct}%`}
              icon={Activity}
              tone="primary"
            />
            <StatCard
              label="Sesiones"
              value={String(data.summary.totalSessions)}
              icon={CalendarDays}
            />
            <StatCard
              label="Jugadores en categoría"
              value={String(data.summary.activePlayers)}
              icon={Users}
              tone="success"
            />
            <StatCard
              label="Género filtrado"
              value={PLAYER_GENDER_OPTIONS.find((g) => g.value === data.filters.gender)?.label ?? "—"}
            />
          </StatGrid>

          <div className="flex flex-wrap gap-2 items-center text-sm text-gray-500">
            <span>Periodo:</span>
            {data.filters.dateFrom && data.filters.dateTo && (
              <Badge variant="secondary">
                {data.filters.dateFrom} → {data.filters.dateTo}
              </Badge>
            )}
            {data.filters.sessionType !== "ALL" && (
              <Badge variant="secondary">
                {SESSION_OPTIONS.find((o) => o.value === data.filters.sessionType)?.label}
              </Badge>
            )}
          </div>

          {data.summary.bySessionType && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Desglose por turno (acumulado)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-semibold">Turno</TableHead>
                        <TableHead className="font-semibold text-center">Sesiones</TableHead>
                        <TableHead className="font-semibold text-center">Asistencia</TableHead>
                        <TableHead className="font-semibold text-center">Asistió</TableHead>
                        <TableHead className="font-semibold text-center">Just.</TableHead>
                        <TableHead className="font-semibold text-center">Injust.</TableHead>
                        <TableHead className="font-semibold text-center">Prom. puntaje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.summary.bySessionType.map((row) => (
                        <TableRow key={row.sessionType}>
                          <TableCell className="font-medium text-sm">{row.label}</TableCell>
                          <TableCell className="text-center tabular-nums text-sm">{row.sessions ?? 0}</TableCell>
                          <TableCell className="text-center">
                            <AttendancePill pct={row.attendancePct} />
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-sm text-green-600">
                            {row.attended}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-sm text-yellow-600">
                            {row.absentJustified}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-sm text-red-600">
                            {row.absentUnjustified}
                          </TableCell>
                          <TableCell className="text-center">
                            <ScorePill score={row.avgScore} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Ranking — {data.category ? CATEGORY_LABELS[data.category] : ""}
                {showTurnColumns && (
                  <span className="text-gray-400 font-normal text-sm ml-2">
                    (columnas por turno: % asistencia / puntaje)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.ranking.length === 0 ? (
                <p className="text-center py-10 text-gray-400">Sin jugadores en esta categoría</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 text-center">#</TableHead>
                        <TableHead>Jugador</TableHead>
                        <TableHead className="text-center hidden sm:table-cell">Año nac.</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        {showTurnColumns && (
                          <>
                            <TableHead className="text-center">Mañana</TableHead>
                            <TableHead className="text-center">Tarde</TableHead>
                            <TableHead className="text-center">Pesas</TableHead>
                          </>
                        )}
                        <TableHead className="hidden sm:table-cell">Asistió</TableHead>
                        <TableHead className="hidden sm:table-cell">Just.</TableHead>
                        <TableHead className="hidden sm:table-cell">Injust.</TableHead>
                        <TableHead className="text-center">Prom. Puntaje</TableHead>
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
                        const turnMap = Object.fromEntries(
                          player.bySessionType.map((t) => [t.sessionType, t])
                        );
                        return (
                          <TableRow key={player.playerId}>
                            <TableCell className="text-center">
                              <span className={rankColor}>{rank}</span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <Link
                                  href={buildPlayerAsistenciaHref(player.playerId, data.filters)}
                                  className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
                                >
                                  {formatPlayerName(player)}
                                </Link>
                                <p className="text-xs text-gray-400">{player.documentId}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center hidden sm:table-cell">
                              <span className="text-sm text-gray-500">{player.birthYear}</span>
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
                            {showTurnColumns && (
                              <>
                                <TableCell className="text-center">
                                  <TurnCell stats={turnMap.TURNO_MANANA} />
                                </TableCell>
                                <TableCell className="text-center">
                                  <TurnCell stats={turnMap.TURNO_TARDE} />
                                </TableCell>
                                <TableCell className="text-center">
                                  <TurnCell stats={turnMap.PESAS} />
                                </TableCell>
                              </>
                            )}
                            <TableCell className="hidden sm:table-cell">
                              <MiniBar value={player.attended} max={maxRegistered} color="bg-green-500" />
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
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Asistió
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Inasistencia justificada
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Inasistencia injustificada
            </div>
            <div className="flex items-center gap-2 ml-4 pl-4 border-l">
              <span className="text-green-700 font-bold">≥80%</span>
              <span className="text-yellow-700 font-semibold">60–79%</span>
              <span className="text-red-700 font-semibold">&lt;60%</span>
            </div>
            <div className="ml-4 pl-4 border-l">
              Puntaje: 1=Bajo · 2=Regular · 3=Bueno · 4=Excelente
            </div>
          </div>
        </>
      )}

      {activeTab === "categorias" && categoriasData && (
        <>
          <StatGrid className="lg:grid-cols-3">
            <StatCard
              label="Asistencia global"
              value={`${categoriasData.summary.globalAttendancePct}%`}
              icon={Activity}
              tone="primary"
            />
            <StatCard
              label="Sesiones totales"
              value={String(categoriasData.summary.totalSessions)}
              icon={CalendarDays}
            />
            <StatCard
              label="Jugadores (todas las cat.)"
              value={String(categoriasData.rows.reduce((n, r) => n + r.totalPlayers, 0))}
              icon={Users}
              tone="success"
            />
          </StatGrid>

          {activeFilters?.dateFrom && activeFilters.dateTo && (
            <div className="flex flex-wrap gap-2 items-center text-sm text-gray-500">
              <span>Periodo:</span>
              <Badge variant="secondary">
                {activeFilters.dateFrom} → {activeFilters.dateTo}
              </Badge>
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumen por categoría y género</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {categoriasData.rows.length === 0 ? (
                <p className="text-center py-10 text-gray-400">
                  No hay categorías con jugadores en el periodo seleccionado
                </p>
              ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold">Categoría</TableHead>
                      <TableHead className="font-semibold">Género</TableHead>
                      <TableHead className="font-semibold text-center">Jugadores</TableHead>
                      <TableHead className="font-semibold text-center">Sesiones</TableHead>
                      <TableHead className="font-semibold text-center">Asistencia</TableHead>
                      <TableHead className="font-semibold text-center">Asistió</TableHead>
                      <TableHead className="font-semibold text-center">Just.</TableHead>
                      <TableHead className="font-semibold text-center">Injust.</TableHead>
                      <TableHead className="font-semibold text-center">Prom. puntaje</TableHead>
                      {showTurnColumns && (
                        <>
                          <TableHead className="font-semibold text-center">Mañana</TableHead>
                          <TableHead className="font-semibold text-center">Tarde</TableHead>
                          <TableHead className="font-semibold text-center">Pesas</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoriasData.rows.map((row) => {
                      const turnMap = Object.fromEntries(
                        row.bySessionType.map((t) => [t.sessionType, t])
                      );
                      return (
                        <TableRow key={`${row.category}-${row.gender}`}>
                          <TableCell className="font-medium text-sm">{row.categoryLabel}</TableCell>
                          <TableCell className="text-sm text-gray-600">{row.genderLabel}</TableCell>
                          <TableCell className="text-center tabular-nums text-sm">{row.totalPlayers}</TableCell>
                          <TableCell className="text-center tabular-nums text-sm">{row.totalSessions}</TableCell>
                          <TableCell className="text-center">
                            {row.totalRegistered === 0 ? (
                              <span className="text-xs text-gray-300">Sin datos</span>
                            ) : (
                              <AttendancePill pct={row.attendancePct} />
                            )}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-sm text-green-600">
                            {row.attended}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-sm text-yellow-600">
                            {row.absentJustified}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-sm text-red-600">
                            {row.absentUnjustified}
                          </TableCell>
                          <TableCell className="text-center">
                            <ScorePill score={row.avgScore} />
                          </TableCell>
                          {showTurnColumns && (
                            <>
                              <TableCell className="text-center">
                                <TurnCell stats={turnMap.TURNO_MANANA} />
                              </TableCell>
                              <TableCell className="text-center">
                                <TurnCell stats={turnMap.TURNO_TARDE} />
                              </TableCell>
                              <TableCell className="text-center">
                                <TurnCell stats={turnMap.PESAS} />
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  );
}
