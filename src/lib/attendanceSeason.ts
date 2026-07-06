import "server-only";

import type { SessionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildSeasonSessionOptions,
  fallbackSeasonSessionOptions,
  normalizeDateOnly,
  parseDateOnlyUtc,
  sessionRunsOnWeekday,
  SESSION_SORT_ORDER,
  weekdayFromDateOnly,
  type AttendanceSeasonPeriodDto,
  type SeasonSessionConfig,
  type SeasonSessionOption,
} from "@/lib/attendanceSeasonShared";

type PeriodRow = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  sessions: {
    sessionType: SessionType;
    weekdays: number[];
    sortOrder: number;
  }[];
};

export type AttendanceSeasonPayload = {
  name: string;
  startDate: string;
  endDate: string;
  sessions: SeasonSessionConfig[];
};

function toDto(period: PeriodRow): AttendanceSeasonPeriodDto {
  return {
    id: period.id,
    name: period.name,
    startDate: normalizeDateOnly(period.startDate),
    endDate: normalizeDateOnly(period.endDate),
    sessions: [...period.sessions]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({
        sessionType: s.sessionType,
        weekdays: s.weekdays,
        sortOrder: s.sortOrder,
      })),
  };
}

export async function listAttendanceSeasonPeriods(): Promise<AttendanceSeasonPeriodDto[]> {
  const periods = await prisma.attendanceSeasonPeriod.findMany({
    orderBy: [{ startDate: "asc" }, { endDate: "asc" }],
    include: { sessions: true },
  });
  return periods.map(toDto);
}

export async function findAttendanceSeasonPeriod(
  id: string
): Promise<AttendanceSeasonPeriodDto | null> {
  const period = await prisma.attendanceSeasonPeriod.findUnique({
    where: { id },
    include: { sessions: true },
  });
  return period ? toDto(period) : null;
}

export async function getActiveAttendanceSeasonPeriod(
  dateOnly: string
): Promise<AttendanceSeasonPeriodDto | null> {
  const date = parseDateOnlyUtc(dateOnly);
  if (!date) return null;

  const periods = await prisma.attendanceSeasonPeriod.findMany({
    where: {
      startDate: { lte: date },
      endDate: { gte: date },
    },
    orderBy: [{ startDate: "desc" }, { endDate: "asc" }],
    include: { sessions: true },
    take: 1,
  });

  if (!periods[0]) return null;
  const weekday = weekdayFromDateOnly(dateOnly);
  const dto = toDto(periods[0]);
  return {
    ...dto,
    sessions: dto.sessions.filter((session) => sessionRunsOnWeekday(session, weekday)),
  };
}

export async function getAttendanceSeasonOptionsForDate(
  dateOnly: string
): Promise<{
  period: AttendanceSeasonPeriodDto | null;
  options: SeasonSessionOption[];
}> {
  const period = await getActiveAttendanceSeasonPeriod(dateOnly);
  if (!period || period.sessions.length === 0) {
    return { period, options: fallbackSeasonSessionOptions(true) };
  }
  return { period, options: buildSeasonSessionOptions(period.sessions) };
}

export async function isSessionTypeEnabledForDate(
  dateOnly: string,
  sessionType: SessionType
): Promise<boolean> {
  const period = await getActiveAttendanceSeasonPeriod(dateOnly);
  if (!period) return true;
  return period.sessions.some((session) => session.sessionType === sessionType);
}

export async function getAttendanceSeasonOptionsForReportRange(
  from: Date | null,
  to: Date | null
): Promise<SeasonSessionOption[]> {
  if (!from || !to) return fallbackSeasonSessionOptions(true);

  const periods = await prisma.attendanceSeasonPeriod.findMany({
    where: {
      startDate: { lte: to },
      endDate: { gte: from },
    },
    orderBy: [{ startDate: "asc" }, { endDate: "asc" }],
    include: { sessions: true },
  });

  if (periods.length === 0) return fallbackSeasonSessionOptions(true);

  const sessionsByType = new Map<SessionType, SeasonSessionConfig>();
  for (const period of periods) {
    for (const session of period.sessions) {
      if (!sessionsByType.has(session.sessionType)) {
        sessionsByType.set(session.sessionType, {
          sessionType: session.sessionType,
          weekdays: [],
          sortOrder: session.sortOrder || SESSION_SORT_ORDER[session.sessionType],
        });
      }
    }
  }

  return buildSeasonSessionOptions(Array.from(sessionsByType.values()));
}

export async function resolveSeasonReportDateRange(
  period: string | null
): Promise<{ from: Date | null; to: Date | null }> {
  if (!period?.startsWith("season:")) return { from: null, to: null };
  const id = period.slice("season:".length);
  const season = await prisma.attendanceSeasonPeriod.findUnique({
    where: { id },
    select: { startDate: true, endDate: true },
  });
  if (!season) return { from: null, to: null };
  const to = new Date(season.endDate);
  to.setUTCHours(23, 59, 59, 999);
  return { from: season.startDate, to };
}

export function validateAttendanceSeasonPayload(
  body: Partial<AttendanceSeasonPayload>
): { ok: true; data: AttendanceSeasonPayload } | { ok: false; error: string } {
  const name = String(body.name ?? "").trim();
  const startDate = String(body.startDate ?? "");
  const endDate = String(body.endDate ?? "");
  const start = parseDateOnlyUtc(startDate);
  const end = parseDateOnlyUtc(endDate);
  const sessions = Array.isArray(body.sessions) ? body.sessions : [];

  if (!name) return { ok: false, error: "El nombre del periodo es requerido" };
  if (!start || !end) return { ok: false, error: "Fechas inválidas" };
  if (start > end) return { ok: false, error: "La fecha de inicio no puede ser posterior al fin" };
  if (sessions.length === 0) return { ok: false, error: "Seleccioná al menos un turno" };

  const seen = new Set<SessionType>();
  const normalized: SeasonSessionConfig[] = [];
  for (const session of sessions) {
    if (!["TURNO_MANANA", "TURNO_TARDE", "PESAS"].includes(session.sessionType)) {
      return { ok: false, error: "Turno inválido" };
    }
    if (seen.has(session.sessionType)) return { ok: false, error: "Hay turnos duplicados" };
    seen.add(session.sessionType);
    const weekdays = Array.isArray(session.weekdays)
      ? session.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      : [];
    normalized.push({
      sessionType: session.sessionType,
      weekdays: Array.from(new Set(weekdays)),
      sortOrder: session.sortOrder || SESSION_SORT_ORDER[session.sessionType],
    });
  }

  return { ok: true, data: { name, startDate, endDate, sessions: normalized } };
}

export async function hasAttendanceSeasonOverlap(input: {
  startDate: string;
  endDate: string;
  excludeId?: string;
}): Promise<boolean> {
  const start = parseDateOnlyUtc(input.startDate);
  const end = parseDateOnlyUtc(input.endDate);
  if (!start || !end) return false;
  const overlap = await prisma.attendanceSeasonPeriod.findFirst({
    where: {
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      startDate: { lte: end },
      endDate: { gte: start },
    },
    select: { id: true },
  });
  return Boolean(overlap);
}
