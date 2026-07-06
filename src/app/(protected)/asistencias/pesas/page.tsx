"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PesasAttendancePlayerList } from "@/components/asistencias/PesasAttendancePlayerList";
import type { PlayerRecord } from "@/components/asistencias/AttendancePlayerList";
import type { AttendanceStatus } from "@/components/asistencias/AttendancePlayerList";
import {
  PageShell,
  PageHeader,
  FilterChip,
  FilterChipGroup,
  LoadingState,
} from "@/components/layout";
import {
  canAccessPesasAttendancePage,
  normalizeRole,
  canAccessAsistenciasSheet,
} from "@/lib/permissions";
import {
  loadPesasAttendance,
  savePesasPlayerStatus,
  PESAS_FILTERS,
  type PesasFilterId,
} from "@/lib/pesasAttendance";
import type { Category } from "@/lib/player";
import { es } from "date-fns/locale";
import { formatSessionDate } from "@/lib/sessionDate";

export default function PesasAsistenciaPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = normalizeRole((session?.user as { role?: string } | undefined)?.role);
  const email = session?.user?.email;
  const canAccessPesas = canAccessPesasAttendancePage(role, email);

  const [selectedFilter, setSelectedFilter] = useState<PesasFilterId>("SUB16");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState<PlayerRecord[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionIdsByCategory, setSessionIdsByCategory] = useState<Partial<Record<Category, string>>>({});
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!canAccessAsistenciasSheet(role)) {
      router.replace("/mi-perfil");
      return;
    }
    if (!canAccessPesas) {
      router.replace("/asistencias");
    }
  }, [status, role, canAccessPesas, router]);

  const loadAttendance = useCallback(async () => {
    setLoadingPlayers(true);
    setError("");
    const seasonRes = await fetch(`/api/attendance-season/active?date=${sessionDate}`);
    if (seasonRes.ok) {
      const season = await seasonRes.json();
      const pesasEnabled =
        Array.isArray(season.options) &&
        season.options.some((opt: { value?: string }) => opt.value === "PESAS");
      if (!pesasEnabled) {
        setRecords([]);
        setCurrentSessionId(null);
        setSessionIdsByCategory({});
        setError("Pesas no está configurado para esta fecha");
        setLoadingPlayers(false);
        return;
      }
    }
    const result = await loadPesasAttendance(selectedFilter, sessionDate);
    setRecords(result.records);
    setCurrentSessionId(result.sessionId);
    setSessionIdsByCategory(result.sessionIdsByCategory);
    if (result.error) setError(result.error);
    setLoadingPlayers(false);
  }, [selectedFilter, sessionDate]);

  useEffect(() => {
    if (canAccessPesas) loadAttendance();
  }, [canAccessPesas, loadAttendance]);

  function handleFilterChange(filter: PesasFilterId) {
    setSelectedFilter(filter);
  }

  function handleDateChange(date: string) {
    setSessionDate(date);
  }

  async function updateStatus(playerId: string, nextStatus: AttendanceStatus) {
    const current = records.find((r) => r.playerId === playerId);
    if (!current || current.status === nextStatus) return;

    const updated: PlayerRecord = {
      ...current,
      status: nextStatus,
      performanceScore: null,
      absenceReason: "",
    };

    setRecords((prev) => prev.map((r) => (r.playerId === playerId ? updated : r)));
    setSavingPlayerId(playerId);
    setError("");

    const result = await savePesasPlayerStatus({
      filter: selectedFilter,
      sessionDate,
      record: updated,
      currentSessionId,
      sessionIdsByCategory,
    });

    setSavingPlayerId(null);

    if (!result.ok) {
      setError(result.error);
      loadAttendance();
      return;
    }

    setCurrentSessionId(result.sessionId);
    setSessionIdsByCategory(result.sessionIdsByCategory);
  }

  if (status === "loading" || !canAccessPesas) {
    return <LoadingState message="Cargando..." />;
  }

  const filterLabel = PESAS_FILTERS.find((f) => f.id === selectedFilter)?.label ?? "";

  return (
    <PageShell width="lg">
      <PageHeader
        title="Asistencia Pesas"
        description="Registro simplificado de asistencia al entrenamiento de pesas"
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Pesas · {filterLabel}
            <span className="text-muted-foreground font-normal ml-2 capitalize">
              {formatSessionDate(sessionDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="pesasSessionDate" className="text-sm font-medium text-muted-foreground">
              Fecha del entrenamiento
            </Label>
            <Input
              id="pesasSessionDate"
              type="date"
              value={sessionDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="h-16 text-2xl font-semibold max-w-md"
            />
          </div>

          <FilterChipGroup label="Grupo">
            {PESAS_FILTERS.map((filter) => (
              <FilterChip
                key={filter.id}
                active={selectedFilter === filter.id}
                onClick={() => handleFilterChange(filter.id)}
                className="text-base px-4 py-2"
              >
                {filter.label}
              </FilterChip>
            ))}
          </FilterChipGroup>

          <Alert>
            <AlertDescription>
              Cada marca se guarda al instante. N/A, Asistió o Faltó.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4 pb-2">
          <CardTitle className="text-base font-semibold">
            Jugadores ({records.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {loadingPlayers ? (
            <div className="py-10">
              <LoadingState message="Cargando jugadores..." />
            </div>
          ) : (
            <PesasAttendancePlayerList
              records={records}
              onUpdate={updateStatus}
              savingPlayerId={savingPlayerId}
              error={error}
            />
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
