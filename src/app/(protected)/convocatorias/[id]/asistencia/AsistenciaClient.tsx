"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type AttendanceStatus = "ATTENDED" | "ABSENT_JUSTIFIED" | "ABSENT_UNJUSTIFIED" | null;

type PlayerRecord = {
  playerId: string;
  firstName: string;
  lastName: string;
  club: string | null;
  status: AttendanceStatus;
  performanceScore: number | null;
  absenceReason: string;
};

type SessionType = "TURNO_MANANA" | "TURNO_TARDE" | "PESAS";

const SESSION_OPTIONS: { value: SessionType; label: string }[] = [
  { value: "TURNO_MANANA", label: "Turno Mañana" },
  { value: "TURNO_TARDE", label: "Turno Tarde" },
  { value: "PESAS", label: "Pesas" },
];

const SCORE_LABELS: Record<number, string> = {
  1: "1 — Bajo",
  2: "2 — Regular",
  3: "3 — Bueno",
  4: "4 — Excelente",
};

export function AsistenciaClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const convocatoriaId = params.id as string;
  const existingSessionId = searchParams.get("sessionId");

  const [convocatoriaName, setConvocatoriaName] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionType, setSessionType] = useState<SessionType>("TURNO_MANANA");
  const [records, setRecords] = useState<PlayerRecord[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(existingSessionId);
  const [loadingSession, setLoadingSession] = useState(!!existingSessionId);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"config" | "attendance">(
    existingSessionId ? "attendance" : "config"
  );

  const loadSession = useCallback(async (sid: string) => {
    setLoadingSession(true);
    const [recRes, convRes] = await Promise.all([
      fetch(`/api/convocatorias/${convocatoriaId}/sessions/${sid}/records`),
      fetch(`/api/convocatorias/${convocatoriaId}`),
    ]);
    const existingRecords = await recRes.json();
    const conv = await convRes.json();
    setConvocatoriaName(conv.name);
    const session = conv.sessions?.find((s: { id: string; sessionDate: string; sessionType: string }) => s.id === sid);
    if (session) {
      setSessionDate(session.sessionDate.split("T")[0]);
      setSessionType(session.sessionType as SessionType);
    }
    const recordMap = new Map(
      existingRecords.map((r: { playerId: string; status: string; performanceScore: number | null; absenceReason: string | null }) => [r.playerId, r])
    );
    const activePlayers = conv.players.filter((p: { status: string }) => p.status === "ACTIVE");
    setRecords(
      activePlayers.map((cp: { player: { id: string; firstName: string; lastName: string; club: string | null } }) => {
        const existing = recordMap.get(cp.player.id) as { status?: string; performanceScore?: number | null; absenceReason?: string | null } | undefined;
        return {
          playerId: cp.player.id,
          firstName: cp.player.firstName,
          lastName: cp.player.lastName,
          club: cp.player.club,
          status: (existing?.status as AttendanceStatus) ?? null,
          performanceScore: existing?.performanceScore ?? null,
          absenceReason: existing?.absenceReason ?? "",
        };
      })
    );
    setLoadingSession(false);
    setStep("attendance");
  }, [convocatoriaId]);

  useEffect(() => {
    if (existingSessionId) {
      loadSession(existingSessionId);
    } else {
      fetch(`/api/convocatorias/${convocatoriaId}`)
        .then((r) => r.json())
        .then((d) => setConvocatoriaName(d.name));
    }
  }, [convocatoriaId, existingSessionId, loadSession]);

  async function handleStartSession() {
    setError("");
    setLoadingSession(true);
    const res = await fetch(`/api/convocatorias/${convocatoriaId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionDate, sessionType }),
    });
    const sessionData = await res.json();
    setSessionId(sessionData.id);
    const convRes = await fetch(`/api/convocatorias/${convocatoriaId}`);
    const conv = await convRes.json();
    const activePlayers = conv.players.filter((p: { status: string }) => p.status === "ACTIVE");
    const recRes = await fetch(`/api/convocatorias/${convocatoriaId}/sessions/${sessionData.id}/records`);
    const existingRecords = await recRes.json();
    const recordMap = new Map(
      existingRecords.map((r: { playerId: string; status: string; performanceScore: number | null; absenceReason: string | null }) => [r.playerId, r])
    );
    setRecords(
      activePlayers.map((cp: { player: { id: string; firstName: string; lastName: string; club: string | null } }) => {
        const existing = recordMap.get(cp.player.id) as { status?: string; performanceScore?: number | null; absenceReason?: string | null } | undefined;
        return {
          playerId: cp.player.id,
          firstName: cp.player.firstName,
          lastName: cp.player.lastName,
          club: cp.player.club,
          status: (existing?.status as AttendanceStatus) ?? null,
          performanceScore: existing?.performanceScore ?? null,
          absenceReason: existing?.absenceReason ?? "",
        };
      })
    );
    setLoadingSession(false);
    setStep("attendance");
  }

  function updateRecord(playerId: string, field: keyof PlayerRecord, value: AttendanceStatus | number | string | null) {
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

  async function handleSave() {
    if (!sessionId) return;
    setSaving(true);
    setError("");
    const toSave = records.filter((r) => r.status !== null);
    const res = await fetch(`/api/convocatorias/${convocatoriaId}/sessions/${sessionId}/records`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        records: toSave.map((r) => ({
          playerId: r.playerId,
          status: r.status,
          performanceScore: r.status === "ATTENDED" ? r.performanceScore : null,
          absenceReason: r.status === "ABSENT_JUSTIFIED" ? r.absenceReason : null,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Error al guardar la asistencia");
    } else {
      setSaved(true);
    }
  }

  const currentSessionLabel = SESSION_OPTIONS.find((s) => s.value === sessionType)?.label;

  if (loadingSession) return <div className="text-gray-400">Cargando sesión...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href={`/convocatorias/${convocatoriaId}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← {convocatoriaName}
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Registro de Asistencia</h1>

      {step === "config" && (
        <Card className="max-w-md">
          <CardHeader><CardTitle className="text-base">Configurar sesión</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="sessionDate">Fecha</Label>
              <Input id="sessionDate" type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de sesión</Label>
              <div className="flex gap-2 flex-wrap">
                {SESSION_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setSessionType(opt.value)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      sessionType === opt.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                    }`}>{opt.label}</button>
                ))}
              </div>
            </div>
            <Button onClick={handleStartSession} className="w-full">Abrir sesión →</Button>
          </CardContent>
        </Card>
      )}

      {step === "attendance" && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-base px-3 py-1">{currentSessionLabel}</Badge>
              <span className="text-gray-500 text-sm">
                {format(new Date(sessionDate + "T12:00:00"), "EEEE d 'de' MMMM yyyy", { locale: es })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {saved && <span className="text-green-600 text-sm font-medium">✓ Guardado</span>}
              <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar asistencia"}</Button>
            </div>
          </div>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-2 border">
            <strong>Instrucciones:</strong> Seleccioná el estado para cada jugador. Si dejás en blanco, significa que el jugador no debía asistir a esta sesión.
          </div>
          <div className="space-y-3">
            {records.map((record) => (
              <Card key={record.playerId} className={record.status ? "" : "opacity-70"}>
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="sm:w-48 shrink-0">
                      <p className="font-medium text-gray-900">{record.lastName}, {record.firstName}</p>
                      {record.club && <p className="text-xs text-gray-400 mt-0.5">{record.club}</p>}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {[
                          { val: null, label: "No aplica", cls: record.status === null ? "bg-gray-200 text-gray-700 border-gray-300" : "bg-white text-gray-400 border-gray-200 hover:border-gray-400" },
                          { val: "ATTENDED" as const, label: "Asistió", cls: record.status === "ATTENDED" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-200 hover:border-green-400" },
                          { val: "ABSENT_JUSTIFIED" as const, label: "Inasistencia Justificada", cls: record.status === "ABSENT_JUSTIFIED" ? "bg-yellow-500 text-white border-yellow-500" : "bg-white text-gray-600 border-gray-200 hover:border-yellow-400" },
                          { val: "ABSENT_UNJUSTIFIED" as const, label: "Inasistencia Injustificada", cls: record.status === "ABSENT_UNJUSTIFIED" ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 border-gray-200 hover:border-red-400" },
                        ].map((btn) => (
                          <button key={String(btn.val)} type="button"
                            onClick={() => updateRecord(record.playerId, "status", btn.val)}
                            className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${btn.cls}`}>
                            {btn.label}
                          </button>
                        ))}
                      </div>
                      {record.status === "ATTENDED" && (
                        <div className="flex items-center gap-3">
                          <Label className="text-sm text-gray-600 shrink-0">Desempeño:</Label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map((score) => (
                              <button key={score} type="button"
                                onClick={() => updateRecord(record.playerId, "performanceScore", score)}
                                className={`w-10 h-10 rounded-lg border text-sm font-bold transition-colors ${
                                  record.performanceScore === score
                                    ? score <= 1 ? "bg-red-500 text-white border-red-500"
                                      : score === 2 ? "bg-yellow-500 text-white border-yellow-500"
                                      : score === 3 ? "bg-blue-500 text-white border-blue-500"
                                      : "bg-green-600 text-white border-green-600"
                                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                                }`}
                                title={SCORE_LABELS[score]}>{score}</button>
                            ))}
                          </div>
                          {record.performanceScore && (
                            <span className="text-xs text-gray-500">{SCORE_LABELS[record.performanceScore]}</span>
                          )}
                        </div>
                      )}
                      {record.status === "ABSENT_JUSTIFIED" && (
                        <div className="space-y-1">
                          <Label className="text-sm text-gray-600">Motivo de la inasistencia:</Label>
                          <Textarea value={record.absenceReason}
                            onChange={(e) => updateRecord(record.playerId, "absenceReason", e.target.value)}
                            placeholder="Describí el motivo de la inasistencia justificada..."
                            rows={2} className="text-sm" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-between items-center pt-2">
            <Button variant="outline" onClick={() => router.push(`/convocatorias/${convocatoriaId}`)}>
              Volver a la convocatoria
            </Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar asistencia"}</Button>
          </div>
        </>
      )}
    </div>
  );
}
