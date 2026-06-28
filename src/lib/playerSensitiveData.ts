import type { AppRole } from "@/lib/permissions";
import { canViewPlayerContactData } from "@/lib/permissions";

export { canViewPlayerContactData, canViewPlayerContactData as canViewPlayerSensitiveData };

/** Campos ocultos para entrenadores (contacto, familiares, permisos, documentos). La ficha médica sí es visible. */
export const PLAYER_CONTACT_FIELDS = [
  "homeAddress",
  "contactPhone",
  "playerEmail",
  "fatherName",
  "fatherEmail",
  "fatherPhone",
  "motherName",
  "motherEmail",
  "motherPhone",
  "tutorName",
  "tutorEmail",
  "tutorPhone",
  "documentPhotoFrontUrl",
  "documentPhotoBackUrl",
  "educationalCenter",
  "educationLevel",
  "absencePermissionContact",
] as const;

export type PlayerContactField = (typeof PLAYER_CONTACT_FIELDS)[number];

export function stripPlayerSensitiveData<T extends Record<string, unknown>>(
  player: T,
  role: AppRole
): T {
  if (canViewPlayerContactData(role)) return player;
  const out = { ...player };
  for (const key of PLAYER_CONTACT_FIELDS) {
    if (key in out) (out as Record<string, unknown>)[key] = null;
  }
  return out;
}

export function stripPlayersSensitiveData<T extends Record<string, unknown>>(
  players: T[],
  role: AppRole
): T[] {
  if (canViewPlayerContactData(role)) return players;
  return players.map((p) => stripPlayerSensitiveData(p, role));
}
