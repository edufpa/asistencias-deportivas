"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatPlayerName } from "@/lib/player";

export type AttendanceStatus = "ATTENDED" | "ABSENT_JUSTIFIED" | "ABSENT_UNJUSTIFIED" | null;

export type PlayerRecord = {
  playerId: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  birthYear: number;
  status: AttendanceStatus;
  performanceScore: number | null;
  absenceReason: string;
};

const SCORE_LABELS: Record<number, string> = {
  1: "Bajo",
  2: "Regular",
  3: "Bueno",
  4: "Excelente",
};

const STATUS_LABELS: Record<string, string> = {
  ATTENDED: "Asistió",
  ABSENT_JUSTIFIED: "Justificada",
  ABSENT_UNJUSTIFIED: "Injustificada",
};

const STATUS_BUTTONS = [
  { val: null, label: "N/A", active: "bg-gray-200 text-gray-700 border-gray-300", idle: "bg-white text-gray-400 border-gray-200 hover:border-gray-400" },
  { val: "ATTENDED" as const, label: "Asistió", active: "bg-green-600 text-white border-green-600", idle: "bg-white text-gray-600 border-gray-200 hover:border-green-400" },
  { val: "ABSENT_JUSTIFIED" as const, label: "Just.", active: "bg-yellow-500 text-white border-yellow-500", idle: "bg-white text-gray-600 border-gray-200 hover:border-yellow-400" },
  { val: "ABSENT_UNJUSTIFIED" as const, label: "Injust.", active: "bg-red-600 text-white border-red-600", idle: "bg-white text-gray-600 border-gray-200 hover:border-red-400" },
];

type Props = {
  records: PlayerRecord[];
  onUpdate: (playerId: string, field: keyof PlayerRecord, value: AttendanceStatus | number | string | null) => void;
  onMarkAll: (status: "ATTENDED" | "ABSENT_UNJUSTIFIED") => void;
  saving: boolean;
  saved: boolean;
  error: string;
  onSave: () => void;
  readOnly?: boolean;
  hideScores?: boolean;
  requireScore?: boolean;
};

export function AttendancePlayerList({
  records,
  onUpdate,
  onMarkAll,
  saving,
  saved,
  error,
  onSave,
  readOnly = false,
  hideScores = false,
  requireScore = false,
}: Props) {
  const attended = records.filter((r) => r.status === "ATTENDED").length;
  const absent = records.filter((r) => r.status && r.status !== "ATTENDED").length;
  const pending = records.filter((r) => r.status === null).length;

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex items-center justify-between gap-2 flex-wrap py-1">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-green-700 font-medium">{attended} ✓</span>
            <span className="text-red-600 font-medium">{absent} ✗</span>
            {pending > 0 && <span className="text-gray-400">{pending} pend.</span>}
            <span className="text-gray-300">|</span>
            <button type="button" onClick={() => onMarkAll("ATTENDED")} disabled={records.length === 0} className="text-blue-600 hover:underline disabled:opacity-40">
              Todos presentes
            </button>
            <button type="button" onClick={() => onMarkAll("ABSENT_UNJUSTIFIED")} disabled={records.length === 0} className="text-blue-600 hover:underline disabled:opacity-40">
              Todos ausentes
            </button>
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="text-green-600 text-xs font-medium">✓ Guardado</span>}
            <Button onClick={onSave} disabled={saving || records.length === 0} size="sm" className="h-8">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      )}

      {readOnly && (
        <p className="text-xs text-gray-500 py-1">Vista de solo lectura — asistencia de tus hijos</p>
      )}

      {!readOnly && !hideScores && (
        <p className="text-[11px] text-gray-500 py-0.5">
          {requireScore
            ? "Si marcás Asistió, debés asignar puntaje 1–4 (Bajo → Excelente)."
            : "Opcional: puntaje 1–4 para quienes asistieron."}
        </p>
      )}

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {records.length === 0 ? (
        <p className="text-center py-6 text-gray-400 text-sm">No hay jugadores en esta categoría</p>
      ) : (
        <div className="border rounded-lg divide-y">
          {records.map((record) => (
            <div
              key={record.playerId}
              className={`px-3 py-2 ${record.status ? "bg-white" : "bg-gray-50/50"}`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-2">
                <div className="lg:w-44 shrink-0 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{formatPlayerName(record)}</p>
                  <p className="text-[11px] text-gray-400">{record.birthYear}</p>
                </div>

                {readOnly ? (
                  <div className="flex-1">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        record.status === "ATTENDED"
                          ? "bg-green-100 text-green-800"
                          : record.status === "ABSENT_JUSTIFIED"
                          ? "bg-yellow-100 text-yellow-800"
                          : record.status === "ABSENT_UNJUSTIFIED"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {record.status ? STATUS_LABELS[record.status] : "Sin registro"}
                    </span>
                    {record.status === "ABSENT_JUSTIFIED" && record.absenceReason && (
                      <p className="text-xs text-gray-500 mt-1">{record.absenceReason}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex-1 flex flex-wrap gap-1">
                      {STATUS_BUTTONS.map((btn) => (
                        <button
                          key={String(btn.val)}
                          type="button"
                          onClick={() => onUpdate(record.playerId, "status", btn.val)}
                          className={`px-2 py-0.5 rounded border text-xs font-medium transition-colors ${
                            record.status === btn.val ? btn.active : btn.idle
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>

                    {!hideScores && record.status === "ATTENDED" && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] text-gray-500">
                          Nota{requireScore ? " *" : ":"}
                        </span>
                        {[1, 2, 3, 4].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => onUpdate(record.playerId, "performanceScore", score)}
                            title={SCORE_LABELS[score]}
                            className={`w-7 h-7 rounded border text-xs font-bold transition-colors ${
                              record.performanceScore === score
                                ? score <= 1
                                  ? "bg-red-500 text-white border-red-500"
                                  : score === 2
                                  ? "bg-yellow-500 text-white border-yellow-500"
                                  : score === 3
                                  ? "bg-blue-500 text-white border-blue-500"
                                  : "bg-green-600 text-white border-green-600"
                                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                            }`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {!readOnly && record.status === "ABSENT_JUSTIFIED" && (
                <div className="mt-1.5 pl-0 lg:pl-44">
                  <Textarea
                    value={record.absenceReason}
                    onChange={(e) => onUpdate(record.playerId, "absenceReason", e.target.value)}
                    placeholder="Motivo..."
                    rows={1}
                    className="text-xs min-h-[32px] py-1.5 resize-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
