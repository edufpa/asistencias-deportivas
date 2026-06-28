import type { DocumentType, MembershipStatus, PlayerStatus } from "@prisma/client";

export type Category = "SUB10" | "SUB12" | "SUB14" | "SUB16" | "SUB18" | "OPEN";

export const CATEGORIES: Category[] = ["SUB10", "SUB12", "SUB14", "SUB16", "SUB18", "OPEN"];

export const CATEGORY_LABELS: Record<Category, string> = {
  SUB10: "Sub 10",
  SUB12: "Sub 12",
  SUB14: "Sub 14",
  SUB16: "Sub 16",
  SUB18: "Sub 18",
  OPEN: "Mayores (Open)",
};

export type PlayerGender = "MALE" | "FEMALE";

export function getPlayerCategory(birthYear: number, referenceYear?: number): Category {
  const year = referenceYear && !Number.isNaN(referenceYear) ? referenceYear : new Date().getFullYear();
  if (birthYear >= year - 10) return "SUB10";
  if (birthYear >= year - 12) return "SUB12";
  if (birthYear >= year - 14) return "SUB14";
  if (birthYear >= year - 16) return "SUB16";
  if (birthYear >= year - 18) return "SUB18";
  return "OPEN";
}

/** Evita errores de zona horaria al calcular categoría desde birthDate. */
export function getBirthYear(birthDate: string | Date): number {
  if (birthDate instanceof Date) {
    if (!Number.isNaN(birthDate.getTime())) return birthDate.getUTCFullYear();
  }
  if (typeof birthDate === "string" && birthDate.trim()) {
    const iso = birthDate.includes("T") ? birthDate.split("T")[0] : birthDate;
    const year = parseInt(iso.slice(0, 4), 10);
    if (!Number.isNaN(year)) return year;
  }
  const d = new Date(birthDate);
  return Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getUTCFullYear();
}

export function matchesPlayerGender(
  playerGender: string | null | undefined,
  filter: PlayerGender
): boolean {
  const normalized = playerGender === "FEMALE" ? "FEMALE" : "MALE";
  return normalized === filter;
}

/** Categorías elegibles al convocar: la de la convocatoria y hasta 2 inferiores (ej. Sub 16 → 14 y 12). */
export function getConvocatoriaEligibleCategories(category: Category): Category[] {
  const index = CATEGORIES.indexOf(category);
  if (index === -1) return [category];
  return CATEGORIES.slice(Math.max(0, index - 2), index + 1);
}

export function playerEligibleForConvocatoria(
  birthDate: string | Date,
  playerGender: string | null | undefined,
  convocatoriaGender: "MALE" | "FEMALE" | "MIXED",
  convocatoriaCategory: Category,
  referenceYear?: number
): boolean {
  if (
    convocatoriaGender !== "MIXED" &&
    !matchesPlayerGender(playerGender, convocatoriaGender)
  ) {
    return false;
  }
  const playerCategory = getPlayerCategory(getBirthYear(birthDate), referenceYear);
  return getConvocatoriaEligibleCategories(convocatoriaCategory).includes(playerCategory);
}

export function isPlayerMinor(birthDate: string | Date, referenceDate: Date = new Date()): boolean {
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return false;
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birth.getDate())) {
    age--;
  }
  return age < 18;
}

export type PlayerNameFields = {
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string | null;
};

export function formatPlayerName(p: PlayerNameFields): string {
  const apellidos = [p.paternalLastName, p.maternalLastName?.trim()].filter(Boolean).join(" ");
  return `${apellidos}, ${p.firstName}`;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  DNI: "DNI",
  PASAPORTE: "Pasaporte",
  CARNET_EXTRANJERIA: "Carnet de extranjería",
};

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  ASOCIADO: "Asociado",
  NO_ASOCIADO: "No asociado",
};

export const DOCUMENT_TYPE_OPTIONS = (
  Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, string][]
).map(([value, label]) => ({ value, label }));

export const MEMBERSHIP_STATUS_OPTIONS = (
  Object.entries(MEMBERSHIP_STATUS_LABELS) as [MembershipStatus, string][]
).map(([value, label]) => ({ value, label }));

export const PLAYER_GENDER_LABELS: Record<PlayerGender, string> = {
  MALE: "Masculino",
  FEMALE: "Femenino",
};

export const PLAYER_GENDER_OPTIONS = (
  Object.entries(PLAYER_GENDER_LABELS) as [PlayerGender, string][]
).map(([value, label]) => ({ value, label }));

export const PLAYER_STATUS_LABELS: Record<PlayerStatus, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  SUSPENDED: "Suspendido",
};

export const PLAYER_STATUS_OPTIONS = (
  Object.entries(PLAYER_STATUS_LABELS) as [PlayerStatus, string][]
).map(([value, label]) => ({ value, label }));

export const BLOOD_TYPE_OPTIONS = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
] as const;
