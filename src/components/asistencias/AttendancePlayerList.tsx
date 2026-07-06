"use client";

import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatPlayerName } from "@/lib/player";
import { cn } from "@/lib/utils";

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

const STATUS_LABELS: Record<string, string> = {
  ATTENDED: "Asistió",
  ABSENT_JUSTIFIED: "Falta",
  ABSENT_UNJUSTIFIED: "Falta",
};

const STATUS_BUTTONS = [
  { val: null, label: "N/A", active: "bg-gray-200 text-gray-700 border-gray-300", idle: "bg-white text-gray-400 border-gray-200 hover:border-gray-400" },
  { val: "ATTENDED" as const, label: "Asistió", active: "bg-green-600 text-white border-green-600", idle: "bg-white text-gray-600 border-gray-200 hover:border-green-400" },
  { val: "ABSENT_UNJUSTIFIED" as const, label: "Falta", active: "bg-red-600 text-white border-red-600", idle: "bg-white text-gray-600 border-gray-200 hover:border-red-400" },
];

type Props = {
  records: PlayerRecord[];
  onStatusChange: (playerId: string, status: AttendanceStatus) => void;
  onAbsenceReasonChange: (playerId: string, value: string) => void;
  onAbsenceReasonBlur: (playerId: string) => void;
  savingPlayerId: string | null;
  error: string;
  readOnly?: boolean;
};

export function AttendancePlayerList({
  records,
  onStatusChange,
  onAbsenceReasonChange,
  onAbsenceReasonBlur,
  savingPlayerId,
  error,
  readOnly = false,
}: Props) {
  const attended = records.filter((r) => r.status === "ATTENDED").length;
  const absent = records.filter((r) => r.status && r.status !== "ATTENDED").length;
  const pending = records.filter((r) => r.status === null).length;

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex items-center gap-3 text-xs py-1">
          <span className="text-green-700 font-medium">{attended} ✓</span>
          <span className="text-red-600 font-medium">{absent} faltas</span>
          {pending > 0 && <span className="text-gray-400">{pending} pend.</span>}
        </div>
      )}

      {readOnly && (
        <p className="text-xs text-gray-500 py-1">Vista de solo lectura — asistencia de tus hijos</p>
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
          {records.map((record) => {
            const isSaving = savingPlayerId === record.playerId;
            return (
            <div
              key={record.playerId}
              className={cn("px-3 py-2", record.status ? "bg-white" : "bg-gray-50/50", isSaving && "opacity-70")}
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                <div className="lg:w-72 xl:w-80 shrink-0 min-w-0">
                  <p className="text-base font-semibold text-gray-900 truncate">{formatPlayerName(record)}</p>
                  <p className="text-[11px] text-gray-400">{record.birthYear}</p>
                </div>

                {readOnly ? (
                  <div className="flex-1">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        record.status === "ATTENDED"
                          ? "bg-green-100 text-green-800"
                          : record.status
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {record.status ? STATUS_LABELS[record.status] : "Sin registro"}
                    </span>
                    {record.status && record.status !== "ATTENDED" && record.absenceReason && (
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
                          disabled={isSaving}
                          onClick={() => onStatusChange(record.playerId, btn.val)}
                          className={`px-3 py-1.5 rounded border text-xs font-semibold transition-colors disabled:cursor-wait ${
                            record.status === btn.val ? btn.active : btn.idle
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>

                    {isSaving && <span className="text-[11px] text-muted-foreground">Guardando...</span>}
                  </>
                )}
              </div>

              {!readOnly && record.status && record.status !== "ATTENDED" && (
                <div className="mt-1.5 pl-0 lg:pl-72 xl:pl-80">
                  <Textarea
                    value={record.absenceReason}
                    onChange={(e) => onAbsenceReasonChange(record.playerId, e.target.value)}
                    onBlur={() => onAbsenceReasonBlur(record.playerId)}
                    placeholder="Motivo de la falta..."
                    rows={2}
                    className="text-xs min-h-[32px] py-1.5 resize-none"
                  />
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
