import type { SessionType } from "@prisma/client";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type SeasonSessionConfig = {
  sessionType: SessionType;
  weekdays: number[];
  sortOrder: number;
};

export type SeasonSessionOption = {
  value: SessionType;
  label: string;
  short: string;
  weekdays: number[];
  sortOrder: number;
};

export type AttendanceSeasonPeriodDto = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  sessions: SeasonSessionConfig[];
};

export const WEEKDAY_OPTIONS: { value: Weekday; label: string; short: string }[] = [
  { value: 1, label: "Lunes", short: "Lun" },
  { value: 2, label: "Martes", short: "Mar" },
  { value: 3, label: "Miércoles", short: "Mié" },
  { value: 4, label: "Jueves", short: "Jue" },
  { value: 5, label: "Viernes", short: "Vie" },
  { value: 6, label: "Sábado", short: "Sáb" },
  { value: 0, label: "Domingo", short: "Dom" },
];

export const SESSION_SORT_ORDER: Record<SessionType, number> = {
  TURNO_MANANA: 1,
  TURNO_TARDE: 2,
  PESAS: 3,
};

export function isPoolSession(sessionType: SessionType): boolean {
  return sessionType === "TURNO_MANANA" || sessionType === "TURNO_TARDE";
}

export function normalizeDateOnly(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return String(value).split("T")[0];
}

export function parseDateOnlyUtc(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

export function weekdayFromDateOnly(value: string): Weekday {
  return new Date(`${value}T00:00:00.000Z`).getUTCDay() as Weekday;
}

export function sessionRunsOnWeekday(
  session: { weekdays: number[] },
  weekday: number
): boolean {
  return session.weekdays.length === 0 || session.weekdays.includes(weekday);
}

export function buildSeasonSessionOptions(
  sessions: SeasonSessionConfig[]
): SeasonSessionOption[] {
  const ordered = [...sessions].sort(
    (a, b) =>
      (a.sortOrder || SESSION_SORT_ORDER[a.sessionType]) -
      (b.sortOrder || SESSION_SORT_ORDER[b.sessionType])
  );
  const poolCount = ordered.filter((s) => isPoolSession(s.sessionType)).length;

  return ordered.map((session) => {
    if (session.sessionType === "PESAS") {
      return { value: "PESAS", label: "Pesas", short: "Pesas", weekdays: session.weekdays, sortOrder: session.sortOrder };
    }

    if (poolCount <= 1) {
      return {
        value: session.sessionType,
        label: "Piscina",
        short: "Piscina",
        weekdays: session.weekdays,
        sortOrder: session.sortOrder,
      };
    }

    const label = session.sessionType === "TURNO_MANANA" ? "Piscina 1" : "Piscina 2";
    return {
      value: session.sessionType,
      label,
      short: label,
      weekdays: session.weekdays,
      sortOrder: session.sortOrder,
    };
  });
}

export function fallbackSeasonSessionOptions(includePesas = true): SeasonSessionOption[] {
  const sessions: SeasonSessionConfig[] = [
    { sessionType: "TURNO_MANANA", weekdays: [], sortOrder: 1 },
    { sessionType: "TURNO_TARDE", weekdays: [], sortOrder: 2 },
    ...(includePesas ? [{ sessionType: "PESAS" as const, weekdays: [], sortOrder: 3 }] : []),
  ];
  return buildSeasonSessionOptions(sessions);
}

export function describeWeekdays(weekdays: number[]): string {
  if (weekdays.length === 0) return "Todos los días";
  const ordered = WEEKDAY_OPTIONS.filter((d) => weekdays.includes(d.value));
  return ordered.map((d) => d.short).join(", ");
}
