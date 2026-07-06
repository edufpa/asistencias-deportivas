"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatPlayerNameNombreApellido } from "@/lib/player";
import type { AttendanceStatus, PlayerRecord } from "@/components/asistencias/AttendancePlayerList";
import { cn } from "@/lib/utils";

const STATUS_BUTTONS = [
  {
    val: null,
    label: "N/A",
    active: "bg-gray-300 text-gray-900 border-gray-400",
    idle: "bg-white text-gray-500 border-gray-300 hover:border-gray-500",
  },
  {
    val: "ATTENDED" as const,
    label: "Asistió",
    active: "bg-green-600 text-white border-green-600",
    idle: "bg-white text-gray-700 border-gray-300 hover:border-green-500",
  },
  {
    val: "ABSENT_UNJUSTIFIED" as const,
    label: "Faltó",
    active: "bg-red-600 text-white border-red-600",
    idle: "bg-white text-gray-700 border-gray-300 hover:border-red-500",
  },
];

type Props = {
  records: PlayerRecord[];
  onUpdate: (playerId: string, status: AttendanceStatus) => void;
  savingPlayerId: string | null;
  error: string;
};

export function PesasAttendancePlayerList({
  records,
  onUpdate,
  savingPlayerId,
  error,
}: Props) {
  const attended = records.filter((r) => r.status === "ATTENDED").length;
  const absent = records.filter((r) => r.status === "ABSENT_UNJUSTIFIED").length;
  const pending = records.filter((r) => r.status === null).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-green-700 font-semibold">{attended} asistieron</span>
        <span className="text-red-600 font-semibold">{absent} faltaron</span>
        {pending > 0 && <span className="text-gray-400">{pending} sin marcar</span>}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {records.length === 0 ? (
        <p className="text-center py-10 text-muted-foreground">No hay jugadores activos en este filtro</p>
      ) : (
        <div className="space-y-2">
          {records.map((record) => {
            const isSaving = savingPlayerId === record.playerId;
            return (
              <div
                key={record.playerId}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:gap-4",
                  isSaving && "opacity-70"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-gray-900 truncate">
                    {formatPlayerNameNombreApellido(record)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {record.birthYear}
                    {isSaving && <span className="ml-2 text-xs">Guardando…</span>}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:w-[min(100%,28rem)] sm:shrink-0">
                  {STATUS_BUTTONS.map((btn) => (
                    <button
                      key={String(btn.val)}
                      type="button"
                      disabled={isSaving}
                      onClick={() => onUpdate(record.playerId, btn.val)}
                      className={cn(
                        "min-h-14 rounded-xl border-2 px-3 py-3 text-base font-bold transition-colors disabled:cursor-wait",
                        record.status === btn.val ? btn.active : btn.idle
                      )}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
