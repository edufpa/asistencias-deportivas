import { format } from "date-fns";
import type { Locale } from "date-fns";

/** Fecha local de hoy en YYYY-MM-DD (sin desfase UTC). */
export function todayDateOnly(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Normaliza cualquier valor de fecha a YYYY-MM-DD (calendario, sin desfase local). */
export function toDateOnlyString(value: string | Date | null | undefined): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (trimmed.includes("T")) {
      const dateOnly = trimmed.split("T")[0];
      return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : null;
    }
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return null;
}

/** Parsea YYYY-MM-DD para guardar en BD (@db.Date). Misma convención que asistencias. */
export function parseDateOnlyForDb(value: string): Date | null {
  const dateOnly = toDateOnlyString(value);
  if (!dateOnly) return null;
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

export function isFutureDateOnly(value: string): boolean {
  const dateOnly = toDateOnlyString(value);
  return dateOnly !== null && dateOnly > todayDateOnly();
}

/** @deprecated Usar toDateOnlyString */
export function dateOnlyFromValue(value: string | Date | null | undefined): string | null {
  return toDateOnlyString(value);
}

/** Normaliza fechas de sesión (Date de Prisma o ISO) para evitar Invalid time value. */
export function parseSessionDate(value: string | Date | null | undefined): Date | null {
  const dateOnly = toDateOnlyString(value);
  if (!dateOnly) return null;
  const [y, m, d] = dateOnly.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function formatSessionDate(
  value: string | Date | null | undefined,
  pattern: string,
  options?: { locale?: Locale }
): string {
  const d = parseSessionDate(value);
  if (!d) return "—";
  return format(d, pattern, options);
}
