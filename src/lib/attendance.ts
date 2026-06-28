import type { SessionType } from "@prisma/client";

export type { SessionType };

export const TRAINING_SESSION_OPTIONS: { value: SessionType; label: string; short: string }[] = [
  { value: "TURNO_MANANA", label: "Turno Mañana", short: "Mañana" },
  { value: "TURNO_TARDE", label: "Turno Tarde", short: "Tarde" },
  { value: "PESAS", label: "Pesas", short: "Pesas" },
];

export const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  TURNO_MANANA: "Turno Mañana",
  TURNO_TARDE: "Turno Tarde",
  PESAS: "Pesas",
};

export const SESSION_TYPE_SHORT: Record<SessionType, string> = {
  TURNO_MANANA: "Mañana",
  TURNO_TARDE: "Tarde",
  PESAS: "Pesas",
};

/** Todos los entrenamientos (incl. Pesas) llevan asistencia y puntaje 1–4. */
export function trainingRequiresScore(_sessionType: SessionType): boolean {
  return true;
}

export type AttendanceRecordToSave = {
  playerId: string;
  firstName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
  status: string | null;
  performanceScore: number | null;
};

export function validateTrainingAttendanceRecords(
  records: AttendanceRecordToSave[]
): string | null {
  const missing = records.filter(
    (r) => r.status === "ATTENDED" && (r.performanceScore == null || r.performanceScore < 1)
  );
  if (missing.length === 0) return null;

  if (missing.length === 1 && missing[0].firstName) {
    const p = missing[0];
    return `Asigná puntaje (1–4) a ${p.paternalLastName ?? ""}, ${p.firstName ?? "el jugador"}`.trim();
  }

  return `Hay ${missing.length} jugador(es) marcados como presentes sin puntaje. Completá la nota 1–4 antes de guardar.`;
}
