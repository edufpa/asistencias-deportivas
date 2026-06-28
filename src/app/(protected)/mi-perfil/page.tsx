"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/RoleGate";
import { PlayerSelfEditForm, type PlayerSelfData } from "@/components/players/PlayerSelfEditForm";
import { PlayerPartidosPanel } from "@/components/players/PlayerPartidosPanel";
import {
  CATEGORY_LABELS,
  PLAYER_GENDER_LABELS,
  formatPlayerName,
  getBirthYear,
  getPlayerCategory,
} from "@/lib/player";
import { formatSecondsAsMmSsCc, formatTestValue, isTimeLikeUnit } from "@/lib/testTimeFormat";
import { cn } from "@/lib/utils";
import {
  PageShell,
  PageHeader,
  PageTabs,
  LoadingState,
  EmptyState,
  StatCard,
  StatGrid,
  FilterChip,
  FilterChipGroup,
  FilterPanel,
  SectionHeading,
} from "@/components/layout";

const AttendanceLineChart = dynamic(
  () => import("@/components/charts/AttendanceLineChart").then((m) => m.AttendanceLineChart),
  { ssr: false, loading: () => <div className="h-52 animate-pulse bg-muted rounded-lg" /> }
);

const TestLineChart = dynamic(
  () => import("@/components/charts/TestLineChart").then((m) => m.TestLineChart),
  { ssr: false, loading: () => <div className="h-40 animate-pulse bg-muted rounded-lg" /> }
);

type PeriodPreset = "7" | "15" | "30" | "90" | "180" | "365" | "custom";

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "7", label: "7 días" },
  { value: "15", label: "15 días" },
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
  { value: "180", label: "180 días" },
  { value: "365", label: "365 días" },
  { value: "custom", label: "Periodo" },
];

type MainTab = "resumen" | "datos" | "tests" | "partidos";

type PlayerProfile = PlayerSelfData & {
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  birthDate: string;
  gender: "MALE" | "FEMALE";
  documentId: string;
};

type CategoryComparison = {
  categoryLabel: string;
  playerAttendancePct: number | null;
  categoryAttendancePct: number | null;
  diff: number | null;
  rank: number | null;
  totalPlayers: number;
  aboveAverage: boolean | null;
};

type AttendanceData = {
  summary: { attended: number; justif: number; unjustif: number; total: number };
  chartSeries: { date: string; attendancePct: number }[];
  categoryComparison: CategoryComparison;
};

type TestGroup = {
  testId: string;
  testName: string;
  unit: string;
  higherIsBetter: boolean;
  categoryAvg: number | null;
  evaluations: { id: string; value: number; evalDate: string; notes: string | null }[];
};

function MiPerfilContent() {
  const [mainTab, setMainTab] = useState<MainTab>("resumen");
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [attLoading, setAttLoading] = useState(false);
  const [tests, setTests] = useState<TestGroup[]>([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodPreset>("30");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const referenceYear = new Date().getFullYear();

  useEffect(() => {
    fetch("/api/me/linked-players")
      .then((r) => (r.ok ? r.json() : []))
      .then(async (links: { id: string }[]) => {
        if (!Array.isArray(links) || links.length === 0) {
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/players/${links[0].id}`);
        if (res.ok) setPlayer(await res.json());
        setLoading(false);
      });
  }, []);

  const fetchAttendance = useCallback(async () => {
    if (!player) return;
    setAttLoading(true);
    const params = new URLSearchParams({ period });
    if (period === "custom") {
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
    }
    const res = await fetch(`/api/players/${player.id}/asistencia?${params}`);
    if (res.ok) setAttendance(await res.json());
    setAttLoading(false);
  }, [player, period, dateFrom, dateTo]);

  useEffect(() => {
    if (player && (period !== "custom" || (dateFrom && dateTo))) {
      fetchAttendance();
    }
  }, [player, fetchAttendance, period, dateFrom, dateTo]);

  useEffect(() => {
    if (!player) return;
    fetch(`/api/players/${player.id}/tests`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTests(Array.isArray(data) ? data : []))
      .finally(() => setTestsLoading(false));
  }, [player]);

  const category = player
    ? getPlayerCategory(getBirthYear(player.birthDate), referenceYear)
    : null;

  const attendancePct = useMemo(() => {
    const s = attendance?.summary;
    if (!s || s.total === 0) return null;
    return Math.round((s.attended / s.total) * 100);
  }, [attendance]);

  if (loading) {
    return (
      <PageShell width="lg">
        <div className="py-16 text-center">
          <LoadingState />
        </div>
      </PageShell>
    );
  }

  if (!player) {
    return (
      <PageShell width="md">
        <EmptyState message="No hay jugador vinculado a tu cuenta. Contactá a la comisión del club." />
      </PageShell>
    );
  }

  const cmp = attendance?.categoryComparison;
  const mainTabs: { id: MainTab; label: string }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "datos", label: "Mis datos" },
    { id: "tests", label: "Tests" },
    { id: "partidos", label: "Mis partidos" },
  ];

  return (
    <PageShell width="lg">
      <PageHeader title="Mi perfil" description="Tu ficha, asistencia, evaluaciones y partidos" />

      <Card className="overflow-hidden">
        <CardContent className="py-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative w-24 h-24 rounded-full border-2 border-primary/20 bg-muted overflow-hidden shrink-0">
              {player.photoUrl ? (
                <Image src={player.photoUrl} alt="" fill className="object-cover" unoptimized />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                  Sin foto
                </span>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-foreground">{formatPlayerName(player)}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">DNI {player.documentId}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                {category && (
                  <Badge className="text-sm">{CATEGORY_LABELS[category]}</Badge>
                )}
                <Badge variant="secondary">
                  {PLAYER_GENDER_LABELS[player.gender === "FEMALE" ? "FEMALE" : "MALE"]}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PageTabs tabs={mainTabs} value={mainTab} onChange={setMainTab} className="mt-6" />

      {mainTab === "resumen" && (
        <div className="space-y-6 pt-4">
          <FilterPanel>
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
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-1">
                <div className="space-y-1 sm:w-40">
                  <Label htmlFor="dateFrom" className="text-xs">Desde</Label>
                  <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1 sm:w-40">
                  <Label htmlFor="dateTo" className="text-xs">Hasta</Label>
                  <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
                </div>
                <Button type="button" size="sm" onClick={fetchAttendance} disabled={!dateFrom || !dateTo || attLoading}>
                  Aplicar
                </Button>
              </div>
            )}
          </FilterPanel>

          {attLoading && !attendance ? (
            <LoadingState message="Cargando asistencia..." />
          ) : (
            <>
              <StatGrid className="sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Tu asistencia"
                  value={attendancePct !== null ? `${attendancePct}%` : "—"}
                  tone={attendancePct !== null && attendancePct >= 80 ? "success" : "default"}
                  align="center"
                />
                <StatCard
                  label={`Promedio ${cmp?.categoryLabel ?? "categoría"}`}
                  value={cmp?.categoryAttendancePct != null ? `${cmp.categoryAttendancePct}%` : "—"}
                  align="center"
                />
                <StatCard
                  label="Comparación"
                  value={
                    cmp?.diff != null
                      ? `${cmp.diff > 0 ? "+" : ""}${cmp.diff}%`
                      : "—"
                  }
                  tone={
                    cmp?.aboveAverage === true
                      ? "success"
                      : cmp?.aboveAverage === false
                        ? "default"
                        : "muted"
                  }
                  align="center"
                />
                <StatCard
                  label="Puesto en categoría"
                  value={
                    cmp?.rank && cmp.totalPlayers
                      ? `${cmp.rank} / ${cmp.totalPlayers}`
                      : "—"
                  }
                  align="center"
                />
              </StatGrid>

              {cmp?.aboveAverage != null && (
                <div
                  className={cn(
                    "rounded-lg border px-4 py-3 text-sm font-medium text-center",
                    cmp.aboveAverage
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  )}
                >
                  {cmp.aboveAverage
                    ? `Estás arriba del promedio de tu categoría (${cmp.categoryLabel})`
                    : `Estás debajo del promedio de tu categoría (${cmp.categoryLabel})`}
                </div>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <SectionHeading title="Evolución de asistencia" />
                  <p className="text-xs text-muted-foreground">
                    Porcentaje acumulado en el periodo · línea punteada = promedio de la categoría
                  </p>
                </CardHeader>
                <CardContent>
                  {attendance?.chartSeries && attendance.chartSeries.length > 1 ? (
                    <AttendanceLineChart
                      data={attendance.chartSeries}
                      categoryAvg={cmp?.categoryAttendancePct}
                    />
                  ) : (
                    <EmptyState message="Sin registros suficientes para graficar en este periodo" />
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {mainTab === "datos" && (
        <div className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Editar datos generales</CardTitle>
              <p className="text-sm text-muted-foreground">
                Podés actualizar contacto, permisos y ficha médica. Nombre, documento y categoría los gestiona la comisión.
              </p>
            </CardHeader>
            <CardContent>
              <PlayerSelfEditForm
                player={player}
                onSaved={(updated) => setPlayer((p) => (p ? { ...p, ...updated } : p))}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {mainTab === "tests" && (
        <div className="space-y-6 pt-4">
          {testsLoading ? (
            <LoadingState message="Cargando tests..." />
          ) : tests.length === 0 ? (
            <EmptyState message="Sin evaluaciones registradas todavía" />
          ) : (
            tests.map((t) => {
              const sorted = [...t.evaluations].sort(
                (a, b) => new Date(a.evalDate).getTime() - new Date(b.evalDate).getTime()
              );
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

              const vsCategory =
                t.categoryAvg != null && latest
                  ? t.higherIsBetter
                    ? latest.value >= t.categoryAvg
                    : latest.value <= t.categoryAvg
                  : null;

              return (
                <Card key={t.testId}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <CardTitle className="text-base">{t.testName}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{t.unit}</Badge>
                        <Badge variant="secondary">
                          {t.higherIsBetter ? "Mayor = mejor" : "Menor = mejor"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="text-center bg-muted/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-primary font-mono">
                          {formatTestValue(latest.value, t.unit)}
                        </div>
                        <p className="text-xs text-muted-foreground">Tu última marca</p>
                      </div>
                      <div className="text-center bg-muted/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-green-600 font-mono">
                          {formatTestValue(best.value, t.unit)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Tu {t.higherIsBetter ? "mejor" : "mejor (menor)"}
                        </p>
                      </div>
                      <div className="text-center bg-muted/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-foreground font-mono">
                          {timeU ? formatSecondsAsMmSsCc(avgSec) : avgSec.toFixed(1)}
                        </div>
                        <p className="text-xs text-muted-foreground">Tu promedio</p>
                      </div>
                      <div className="text-center bg-muted/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-slate-600 font-mono">
                          {t.categoryAvg != null
                            ? formatTestValue(t.categoryAvg, t.unit)
                            : "—"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Promedio {cmp?.categoryLabel ?? "categoría"}
                        </p>
                      </div>
                    </div>

                    {vsCategory != null && (
                      <p
                        className={cn(
                          "text-sm font-medium mb-3 text-center",
                          vsCategory ? "text-green-700" : "text-amber-700"
                        )}
                      >
                        {vsCategory
                          ? "Tu última marca está por encima del promedio de tu categoría"
                          : "Tu última marca está por debajo del promedio de tu categoría"}
                      </p>
                    )}

                    {sorted.length > 1 && (
                      <TestLineChart
                        data={chartData}
                        unit={t.unit}
                        testName={t.testName}
                        formatValue={chartFmt}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {mainTab === "partidos" && (
        <div className="pt-4">
          <PlayerPartidosPanel playerId={player.id} />
        </div>
      )}
    </PageShell>
  );
}

export default function MiPerfilPage() {
  return (
    <RoleGate allow={(role) => role === "PARENT"} message="Esta sección es solo para jugadores.">
      <Suspense fallback={<LoadingState />}>
        <MiPerfilContent />
      </Suspense>
    </RoleGate>
  );
}
