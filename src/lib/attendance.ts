import type { SessionType } from "@prisma/client";
import { fallbackSeasonSessionOptions } from "@/lib/attendanceSeasonShared";

export type { SessionType };

export const TRAINING_SESSION_OPTIONS = fallbackSeasonSessionOptions(true);

export const ATTENDANCE_SESSION_OPTIONS = TRAINING_SESSION_OPTIONS.filter(
  (opt) => opt.value !== "PESAS"
);

export const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  TURNO_MANANA: "Piscina 1",
  TURNO_TARDE: "Piscina 2",
  PESAS: "Pesas",
};

export const SESSION_TYPE_SHORT: Record<SessionType, string> = {
  TURNO_MANANA: "Piscina 1",
  TURNO_TARDE: "Piscina 2",
  PESAS: "Pesas",
};

export function trainingRequiresScore(_sessionType: SessionType): boolean {
  return false;
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
  void records;
  return null;
}
