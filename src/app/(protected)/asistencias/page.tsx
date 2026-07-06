"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CATEGORIES, CATEGORY_LABELS, PLAYER_GENDER_OPTIONS } from "@/lib/player";
import type { Category, PlayerGender } from "@/lib/player";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { es } from "date-fns/locale";
import { formatSessionDate } from "@/lib/sessionDate";
import {
  AttendancePlayerList,
  type PlayerRecord,
} from "@/components/asistencias/AttendancePlayerList";
import {
  ensureAttendanceSession,
  findExistingAttendanceSession,
  loadCategoryAttendanceRecords,
  loadCategoryPlayersOnly,
} from "@/lib/attendanceSession";
import { hasComisionLikeRole, canAccessAsistenciasSheet, usesPesasAttendanceDedicatedUx } from "@/lib/permissions";
import { useAppRole } from "@/hooks/useAppRole";
import { useCanEditAttendance } from "@/hooks/useCanEditAttendance";
import {
  PageShell,
  PageHeader,
  FilterChip,
  FilterChipGroup,
  FilterPanel,
  LoadingState,
} from "@/components/layout";
import {
  TRAINING_SESSION_OPTIONS,
  SESSION_TYPE_SHORT,
  type SessionType,
} from "@/lib/attendance";
import type { SeasonSessionOption } from "@/lib/attendanceSeasonShared";

type RecentSession = {
  id: string;
  sessionDate: string;
  sessionType: SessionType;
  category: Category;
  _count: { records: number };
  createdBy: { name: string };
};

function isCategory(v: string | null): v is Category {
  return !!v && (CATEGORIES as readonly string[]).includes(v);
}

function AsistenciasPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const role = useAppRole();
  const canEdit = useCanEditAttendance();
  const readOnly = !canEdit;
  const canUsePesasInGeneral = role === "SUPER_ADMIN" || role === "COMISION";

  useEffect(() => {
    if (role === "PARENT") router.replace("/mi-perfil");
    else if (usesPesasAttendanceDedicatedUx(session?.user?.email)) router.replace("/asistencias/pesas");
  }, [role, router, session?.user?.email]);

  const initialCategory = searchParams.get("category");
  const initialSessionId = searchParams.get("sessionId");

  const [selectedCategory, setSelectedCategory] = useState<Category>(
    isCategory(initialCategory) ? initialCategory : "SUB16"
  );
  const [selectedGender, setSelectedGender] = useState<PlayerGender>("MALE");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionType, setSessionType] = useState<SessionType>("TURNO_MANANA");
  const [seasonOptions, setSeasonOptions] = useState<SeasonSessionOption[]>(TRAINING_SESSION_OPTIONS);
  const [pinnedSessionId, setPinnedSessionId] = useState<string | null>(initialSessionId);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [records, setRecords] = useState<PlayerRecord[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const sessionOptions = useMemo(
    () =>
      canUsePesasInGeneral
        ? seasonOptions
        : seasonOptions.filter((opt) => opt.value !== "PESAS"),
    [canUsePesasInGeneral, seasonOptions]
  );
  const sessionLabelByType = useMemo(() => {
    const labels = new Map<SessionType, string>();
    for (const opt of TRAINING_SESSION_OPTIONS) labels.set(opt.value, opt.short);
    for (const opt of sessionOptions) labels.set(opt.value, opt.short);
    return labels;
  }, [sessionOptions]);
  const activeSessionLabel = sessionLabelByType.get(sessionType) ?? SESSION_TYPE_SHORT[sessionType];

  useEffect(() => {
    let alive = true;
    async function loadSeasonOptions() {
      const res = await fetch(`/api/attendance-season/active?date=${sessionDate}`);
      if (!alive || !res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.options)) {
        setSeasonOptions(data.options);
      }
    }
    loadSeasonOptions();
    return () => {
      alive = false;
    };
  }, [sessionDate]);

  useEffect(() => {
    if (sessionOptions.length === 0) return;
    if (!sessionOptions.some((opt) => opt.value === sessionType)) {
      setSessionType(sessionOptions[0].value);
      setPinnedSessionId(null);
      setCurrentSessionId(null);
    }
  }, [sessionOptions, sessionType]);

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    const res = await fetch(`/api/asistencias/sessions?category=${selectedCategory}`);
    if (res.ok) {
      const sessions: RecentSession[] = await res.json();
      setRecentSessions(
        sessions.filter(
          (s) =>
            s.category &&
            s.sessionDate &&
            (canUsePesasInGeneral || s.sessionType !== "PESAS")
        )
      );
    }
    setLoadingRecent(false);
  }, [canUsePesasInGeneral, selectedCategory]);

  const loadAttendance = useCallback(async () => {
    setLoadingPlayers(true);
    setError("");

    let sessionId = pinnedSessionId;
    let effectiveDate = sessionDate;
    let effectiveType = sessionType;

    if (sessionId) {
      const sessionsRes = await fetch(`/api/asistencias/sessions?category=${selectedCategory}`);
      if (sessionsRes.ok) {
        const sessions: RecentSession[] = await sessionsRes.json();
        const sess = sessions.find((s) => s.id === sessionId);
        if (sess) {
          const dateOnly = String(sess.sessionDate).split("T")[0];
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) effectiveDate = dateOnly;
          effectiveType = sess.sessionType;
        } else {
          sessionId = null;
        }
      }
    } else {
      const existing = await findExistingAttendanceSession(
        selectedCategory,
        sessionDate,
        sessionType
      );
      sessionId = existing?.id ?? null;
    }

    setCurrentSessionId(sessionId);
    if (effectiveDate !== sessionDate) setSessionDate(effectiveDate);
    if (effectiveType !== sessionType) setSessionType(effectiveType);

    if (sessionId) {
      const { records: loaded, error: loadError } = await loadCategoryAttendanceRecords(
        selectedCategory,
        sessionId,
        selectedGender,
        effectiveDate
      );
      setRecords(loaded);
      if (loadError) setError(loadError);
    } else if (readOnly) {
      setRecords([]);
      setError("No hay sesión registrada para esta fecha y turno");
    } else {
      const { records: loaded, error: loadError } = await loadCategoryPlayersOnly(
        selectedCategory,
        selectedGender,
        sessionDate
      );
      setRecords(loaded);
      if (loadError) setError(loadError);
    }

    setLoadingPlayers(false);
  }, [selectedCategory, selectedGender, sessionDate, sessionType, pinnedSessionId, readOnly]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    if (!canUsePesasInGeneral && sessionType === "PESAS") {
      setSessionType("TURNO_MANANA");
      setPinnedSessionId(null);
      setCurrentSessionId(null);
    }
  }, [canUsePesasInGeneral, sessionType]);

  function handleGenderChange(g: PlayerGender) {
    setSelectedGender(g);
  }

  function handleCategoryChange(cat: Category) {
    setSelectedCategory(cat);
    setPinnedSessionId(null);
    setCurrentSessionId(null);
  }

  function handleDateChange(date: string) {
    setSessionDate(date);
    setPinnedSessionId(null);
  }

  function handleSessionTypeChange(type: SessionType) {
    setSessionType(type);
    setPinnedSessionId(null);
  }

  function openRecentSession(s: RecentSession) {
    const dateOnly = String(s.sessionDate).split("T")[0];
    setSelectedCategory(s.category);
    setSessionDate(/^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : sessionDate);
    setSessionType(s.sessionType);
    setPinnedSessionId(s.id);
  }

  async function persistRecord(record: PlayerRecord) {
    if (readOnly) return;
    if (!record.status && !currentSessionId) return;

    setSavingPlayerId(record.playerId);
    setError("");

    let sessionId = currentSessionId;
    if (!sessionId && record.status) {
      const session = await ensureAttendanceSession(
        selectedCategory,
        sessionDate,
        sessionType
      );
      if (!("id" in session)) {
        setSavingPlayerId(null);
        setError(session.error);
        return;
      }
      sessionId = session.id;
      setCurrentSessionId(sessionId);
    }

    const res = await fetch(`/api/asistencias/sessions/${sessionId}/records`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        records: record.status
          ? [
              {
                playerId: record.playerId,
                status: record.status,
                performanceScore: null,
                absenceReason:
                  record.status !== "ATTENDED" ? record.absenceReason : null,
              },
            ]
          : [],
        clearPlayerIds: record.status ? [] : [record.playerId],
      }),
    });
    setSavingPlayerId(null);
    if (!res.ok) {
      setError("Error al guardar la asistencia");
      return;
    }
    loadRecent();
  }

  function updateStatus(playerId: string, status: PlayerRecord["status"]) {
    const current = records.find((r) => r.playerId === playerId);
    if (!current || current.status === status) return;

    const updated: PlayerRecord = {
      ...current,
      status,
      performanceScore: null,
      absenceReason: status && status !== "ATTENDED" ? current.absenceReason : "",
    };

    setRecords((prev) => prev.map((r) => (r.playerId === playerId ? updated : r)));
    persistRecord(updated);
  }

  function updateAbsenceReason(playerId: string, value: string) {
    setRecords((prev) =>
      prev.map((r) => (r.playerId === playerId ? { ...r, absenceReason: value } : r))
    );
  }

  function persistAbsenceReason(playerId: string) {
    const record = records.find((r) => r.playerId === playerId);
    if (!record || !record.status || record.status === "ATTENDED") return;
    persistRecord(record);
  }

  if (!canAccessAsistenciasSheet(role)) {
    return <LoadingState message="Redirigiendo..." />;
  }

  return (
    <PageShell width="lg">
      <PageHeader
        title="Asistencia General"
        description={
          canUsePesasInGeneral
            ? "Registro por categoría según la temporada configurada"
            : "Registro por categoría según la temporada configurada"
        }
      />

      {readOnly && hasComisionLikeRole(role) && (
        <Alert>
          <AlertDescription>
            Solo lectura: tu usuario de comisión puede consultar asistencias pero no modificarlas.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold">
            {CATEGORY_LABELS[selectedCategory]} ·{" "}
            {PLAYER_GENDER_OPTIONS.find((g) => g.value === selectedGender)?.label} ·{" "}
            {activeSessionLabel}
            {sessionDate && (
              <span className="text-muted-foreground font-normal ml-1 capitalize">
                — {formatSessionDate(sessionDate, "d MMM yyyy", { locale: es })}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 space-y-3">
          <FilterPanel>
            <FilterChipGroup label="Categoría" className="flex-1 min-w-0">
              {CATEGORIES.map((cat) => (
                <FilterChip
                  key={cat}
                  active={selectedCategory === cat}
                  onClick={() => handleCategoryChange(cat)}
                >
                  {CATEGORY_LABELS[cat]}
                </FilterChip>
              ))}
            </FilterChipGroup>
            <FilterChipGroup label="Género" className="shrink-0">
              {PLAYER_GENDER_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.value}
                  active={selectedGender === opt.value}
                  onClick={() => handleGenderChange(opt.value)}
                >
                  {opt.label}
                </FilterChip>
              ))}
            </FilterChipGroup>
          </FilterPanel>

          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="space-y-1 sm:w-40">
              <Label htmlFor="sessionDate" className="text-xs text-muted-foreground">Fecha</Label>
              <Input
                id="sessionDate"
                type="date"
                value={sessionDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex-1 space-y-1">
              <FilterChipGroup label="Entrenamiento">
                {sessionOptions.map((opt) => (
                  <FilterChip
                    key={opt.value}
                    active={sessionType === opt.value}
                    onClick={() => handleSessionTypeChange(opt.value)}
                  >
                    {opt.label}
                  </FilterChip>
                ))}
              </FilterChipGroup>
              {!currentSessionId && !readOnly && records.length > 0 && (
                <p className="text-[11px] text-muted-foreground pt-1">
                  Sin registro para esta fecha y turno. La sesión se crea al marcar la primera asistencia.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4 pb-2">
          <CardTitle className="text-sm font-semibold">
            Jugadores ({records.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {loadingPlayers ? (
            <div className="py-10 text-center">
              <LoadingState message="Cargando jugadores..." />
            </div>
          ) : (
            <AttendancePlayerList
              records={records}
              onStatusChange={updateStatus}
              onAbsenceReasonChange={updateAbsenceReason}
              onAbsenceReasonBlur={persistAbsenceReason}
              savingPlayerId={savingPlayerId}
              error={error}
              readOnly={readOnly}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-sm font-semibold">
            Sesiones recientes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingRecent ? (
            <div className="py-8 text-center">
              <LoadingState />
            </div>
          ) : recentSessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay sesiones registradas aún
            </p>
          ) : (
            <div className="divide-y">
              {recentSessions.slice(0, 10).map((s) => {
                const isActive = currentSessionId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openRecentSession(s)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                      isActive ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {formatSessionDate(s.sessionDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Por {s.createdBy.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {sessionLabelByType.get(s.sessionType) ?? SESSION_TYPE_SHORT[s.sessionType]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{s._count.records} registros</span>
                      {isActive && (
                        <Badge variant="default" className="text-xs">Actual</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

export default function AsistenciasPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center"><LoadingState /></div>}>
      <AsistenciasPageContent />
    </Suspense>
  );
}
