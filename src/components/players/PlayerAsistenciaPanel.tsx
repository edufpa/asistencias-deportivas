"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { es } from "date-fns/locale";
import { formatSessionDate } from "@/lib/sessionDate";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  FilterChip,
  FilterChipGroup,
  FilterPanel,
  StatCard,
  StatGrid,
  SectionHeading,
  LoadingState,
  EmptyState,
  DataTableWrap,
} from "@/components/layout";

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

const STATUS_CONFIG = {
  ATTENDED: { label: "Asistió", className: "bg-green-100 text-green-800 border-green-200" },
  ABSENT_JUSTIFIED: { label: "Justificada", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  ABSENT_UNJUSTIFIED: { label: "Injustificada", className: "bg-red-100 text-red-800 border-red-200" },
};

const SCORE_STYLE: Record<number, string> = {
  1: "bg-red-500 text-white",
  2: "bg-yellow-500 text-white",
  3: "bg-blue-500 text-white",
  4: "bg-green-600 text-white",
};

function attendancePctTone(pct: number | null): "success" | "default" | "muted" {
  if (pct === null) return "muted";
  if (pct >= 80) return "success";
  return "default";
}

function attendancePctColor(pct: number | null) {
  if (pct === null) return "text-muted-foreground";
  if (pct >= 80) return "text-green-600";
  if (pct >= 60) return "text-yellow-600";
  return "text-red-600";
}

type AsistenciaData = {
  summary: {
    total: number;
    attended: number;
    justif: number;
    unjustif: number;
    avgScore: number | null;
  };
  rows: Array<{
    id: string;
    date: string;
    sessionLabel: string;
    categoryLabel: string;
    status: string;
    performanceScore: number | null;
    absenceReason: string | null;
  }>;
  bySessionType: Array<{
    sessionType: string;
    label: string;
    total: number;
    attendancePct: number | null;
    attended: number;
    justif: number;
    unjustif: number;
    avgScore: number | null;
  }>;
};

export function PlayerAsistenciaPanel({
  playerId,
  hideScores = false,
}: {
  playerId: string;
  hideScores?: boolean;
}) {
  const [data, setData] = useState<AsistenciaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodPreset>("30");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (period === "custom") {
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
    }
    const res = await fetch(`/api/players/${playerId}/asistencia?${params}`);
    if (res.ok) setData(await res.json());
    else setData(null);
    setLoading(false);
  }, [playerId, period, dateFrom, dateTo]);

  useEffect(() => {
    if (period !== "custom" || (dateFrom && dateTo)) load();
  }, [load, period, dateFrom, dateTo]);

  const summary = data?.summary;
  const attendancePct = useMemo(() => {
    if (!summary || summary.total === 0) return null;
    return Math.round((summary.attended / summary.total) * 100);
  }, [summary]);

  if (loading && !data) return <LoadingState message="Cargando asistencia..." />;
  if (!data) return <EmptyState message="No se pudo cargar la asistencia" />;

  const { rows, bySessionType } = data;

  return (
    <div className="space-y-4">
      <FilterPanel>
        <FilterChipGroup label="Periodo" className="w-full">
          {PERIOD_OPTIONS.map((opt) => (
            <FilterChip key={opt.value} active={period === opt.value} onClick={() => setPeriod(opt.value)}>
              {opt.label}
            </FilterChip>
          ))}
        </FilterChipGroup>
        {period === "custom" && (
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-1 w-full">
            <div className="space-y-1 sm:w-40">
              <Label htmlFor="attDateFrom" className="text-xs">Desde</Label>
              <Input id="attDateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1 sm:w-40">
              <Label htmlFor="attDateTo" className="text-xs">Hasta</Label>
              <Input id="attDateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm" />
            </div>
            <Button type="button" onClick={load} disabled={!dateFrom || !dateTo || loading} size="sm">
              Aplicar
            </Button>
          </div>
        )}
      </FilterPanel>

      {summary && (
        <StatGrid className="sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Asistencia" value={attendancePct !== null ? `${attendancePct}%` : "—"} tone={attendancePctTone(attendancePct)} align="center" />
          <StatCard label="Asistió" value={String(summary.attended)} tone="success" align="center" />
          <StatCard label="Just." value={String(summary.justif)} align="center" />
          <StatCard label="Injust." value={String(summary.unjustif)} align="center" />
          {!hideScores && (
            <StatCard label="Prom. puntaje" value={summary.avgScore !== null ? String(summary.avgScore) : "—"} tone={summary.avgScore ? "success" : "muted"} align="center" />
          )}
        </StatGrid>
      )}

      {bySessionType?.length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <SectionHeading title="Desglose por turno" />
            <DataTableWrap>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turno</TableHead>
                    <TableHead className="text-center">Registros</TableHead>
                    <TableHead className="text-center">Asistencia</TableHead>
                    <TableHead className="text-center">Asistió</TableHead>
                    <TableHead className="text-center">Just.</TableHead>
                    <TableHead className="text-center">Injust.</TableHead>
                    {!hideScores && <TableHead className="text-center">Prom. puntaje</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bySessionType.map((row) => (
                    <TableRow key={row.sessionType}>
                      <TableCell className="font-medium text-sm">{row.label}</TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">{row.total}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn("font-bold text-sm tabular-nums", attendancePctColor(row.attendancePct))}>
                          {row.attendancePct !== null ? `${row.attendancePct}%` : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm text-green-600">{row.attended}</TableCell>
                      <TableCell className="text-center text-sm text-yellow-600">{row.justif}</TableCell>
                      <TableCell className="text-center text-sm text-red-600">{row.unjustif}</TableCell>
                      {!hideScores && (
                        <TableCell className="text-center">
                          {row.avgScore !== null ? (
                            <span className={cn("inline-flex items-center justify-center min-w-8 h-8 rounded-full text-xs font-bold", SCORE_STYLE[Math.round(row.avgScore)])}>
                              {row.avgScore}
                            </span>
                          ) : "—"}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableWrap>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState message="Sin registros en el periodo seleccionado" />
          ) : (
            <DataTableWrap className="border-0 rounded-none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Entrenamiento</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-center">Asistencia</TableHead>
                    {!hideScores && <TableHead className="text-center w-24">Puntaje</TableHead>}
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const cfg = STATUS_CONFIG[row.status as keyof typeof STATUS_CONFIG];
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-sm capitalize">
                          {formatSessionDate(row.date, "EEE d MMM yyyy", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{row.sessionLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.categoryLabel}</TableCell>
                        <TableCell className="text-center">
                          <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium border", cfg.className)}>
                            {cfg.label}
                          </span>
                        </TableCell>
                        {!hideScores && (
                          <TableCell className="text-center">
                            {row.status === "ATTENDED" && row.performanceScore ? (
                              <span className={cn("inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold", SCORE_STYLE[row.performanceScore])}>
                                {row.performanceScore}
                              </span>
                            ) : "—"}
                          </TableCell>
                        )}
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {row.status === "ABSENT_JUSTIFIED" && row.absenceReason ? row.absenceReason : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DataTableWrap>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
