"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { useAppRole } from "@/hooks/useAppRole";
import { useCanEditAttendance } from "@/hooks/useCanEditAttendance";
import { canViewPerformanceScores, canAccessAsistenciasSheet } from "@/lib/permissions";
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
  validateTrainingAttendanceRecords,
  type SessionType,
} from "@/lib/attendance";

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
  const role = useAppRole();
  const canEdit = useCanEditAttendance();
  const readOnly = !canEdit;
  const hideScores = !canViewPerformanceScores(role);

  useEffect(() => {
    if (role === "PARENT") router.replace("/mi-perfil");
  }, [role, router]);

  const initialCategory = searchParams.get("category");
  const initialSessionId = searchParams.get("sessionId");

  const [selectedCategory, setSelectedCategory] = useState<Category>(
    isCategory(initialCategory) ? initialCategory : "SUB16"
  );
  const [selectedGender, setSelectedGender] = useState<PlayerGender>("MALE");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionType, setSessionType] = useState<SessionType>("TURNO_MANANA");
  const [pinnedSessionId, setPinnedSessionId] = useState<string | null>(initialSessionId);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [records, setRecords] = useState<PlayerRecord[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    const res = await fetch(`/api/asistencias/sessions?category=${selectedCategory}`);
    if (res.ok) {
      const sessions: RecentSession[] = await res.json();
      setRecentSessions(sessions.filter((s) => s.category && s.sessionDate));
    }
    setLoadingRecent(false);
  }, [selectedCategory]);

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

  function handleGenderChange(g: PlayerGender) {
    setSelectedGender(g);
    setSaved(false);
  }

  function handleCategoryChange(cat: Category) {
    setSelectedCategory(cat);
    setPinnedSessionId(null);
    setCurrentSessionId(null);
    setSaved(false);
  }

  function handleDateChange(date: string) {
    setSessionDate(date);
    setPinnedSessionId(null);
    setSaved(false);
  }

  function handleSessionTypeChange(type: SessionType) {
    setSessionType(type);
    setPinnedSessionId(null);
    setSaved(false);
  }

  function openRecentSession(s: RecentSession) {
    const dateOnly = String(s.sessionDate).split("T")[0];
    setSelectedCategory(s.category);
    setSessionDate(/^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : sessionDate);
    setSessionType(s.sessionType);
    setPinnedSessionId(s.id);
    setSaved(false);
  }

  function updateRecord(
    playerId: string,
    field: keyof PlayerRecord,
    value: PlayerRecord[keyof PlayerRecord]
  ) {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.playerId !== playerId) return r;
        const updated = { ...r, [field]: value };
        if (field === "status") {
          if (value !== "ATTENDED") updated.performanceScore = null;
          if (value !== "ABSENT_JUSTIFIED") updated.absenceReason = "";
        }
        return updated;
      })
    );
    setSaved(false);
  }

  function markAll(status: "ATTENDED" | "ABSENT_UNJUSTIFIED") {
    setRecords((prev) =>
      prev.map((r) => ({
        ...r,
        status,
        performanceScore: status !== "ATTENDED" ? null : r.performanceScore,
        absenceReason: "",
      }))
    );
    setSaved(false);
  }

  async function handleSave() {
    const toSave = records.filter((r) => r.status !== null);
    const toClear = records.filter((r) => r.status === null).map((r) => r.playerId);
    const scoreError = validateTrainingAttendanceRecords(toSave);
    if (scoreError) {
      setError(scoreError);
      return;
    }

    if (toSave.length === 0 && toClear.length === 0) {
      setError("No hay cambios para guardar");
      return;
    }

    if (!currentSessionId && toSave.length === 0) {
      setError("Marcá al menos una asistencia para guardar");
      return;
    }

    setSaving(true);
    setError("");

    let sessionId = currentSessionId;
    if (!sessionId) {
      const session = await ensureAttendanceSession(
        selectedCategory,
        sessionDate,
        sessionType
      );
      if (!("id" in session)) {
        setSaving(false);
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
        records: toSave.map((r) => ({
          playerId: r.playerId,
          status: r.status,
          performanceScore: r.status === "ATTENDED" ? r.performanceScore : null,
          absenceReason: r.status === "ABSENT_JUSTIFIED" ? r.absenceReason : null,
        })),
        clearPlayerIds: toClear,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Error al guardar la asistencia");
      return;
    }
    setSaved(true);
    loadRecent();
    loadAttendance();
  }

  const SESSION_TYPE_LABEL = SESSION_TYPE_SHORT;

  if (!canAccessAsistenciasSheet(role)) {
    return <LoadingState message="Redirigiendo..." />;
  }

  return (
    <PageShell width="lg">
      <PageHeader
        title="Asistencia General"
        description="Registro por categoría — turno mañana, tarde o pesas (asistencia y puntaje)"
      />

      {readOnly && role === "COMISION" && (
        <Alert>
          <AlertDescription>
            Solo lectura: tu usuario de comisión puede consultar asistencias y puntajes pero no modificarlos.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold">
            {CATEGORY_LABELS[selectedCategory]} ·{" "}
            {PLAYER_GENDER_OPTIONS.find((g) => g.value === selectedGender)?.label} ·{" "}
            {SESSION_TYPE_LABEL[sessionType]}
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
                {TRAINING_SESSION_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt.value}
                    active={sessionType === opt.value}
                    onClick={() => handleSessionTypeChange(opt.value)}
                  >
                    {opt.label}
                  </FilterChip>
                ))}
              </FilterChipGroup>
              <p className="text-[11px] text-muted-foreground pt-0.5">
                Pesas es un entrenamiento igual que mañana o tarde: marcá asistencia y puntaje 1–4.
              </p>
              {!currentSessionId && !readOnly && records.length > 0 && (
                <p className="text-[11px] text-muted-foreground pt-1">
                  Sin registro para esta fecha y turno. Marcá asistencia y guardá para crear la sesión.
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
              onUpdate={updateRecord}
              onMarkAll={markAll}
              saving={saving}
              saved={saved}
              error={error}
              onSave={handleSave}
              readOnly={readOnly}
              hideScores={hideScores}
              requireScore
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
                        {SESSION_TYPE_LABEL[s.sessionType]}
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
