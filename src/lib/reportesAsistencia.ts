import type { PlayerGender } from "@/lib/player";
import { CATEGORIES, CATEGORY_LABELS, PLAYER_GENDER_LABELS } from "@/lib/player";
import { TRAINING_SESSION_OPTIONS } from "@/lib/attendance";
import { resolveSeasonReportDateRange } from "@/lib/attendanceSeason";
import type { SeasonSessionOption } from "@/lib/attendanceSeasonShared";
import type { Category, SessionType } from "@prisma/client";

export const REPORT_PRESET_PERIODS = new Set([7, 15, 30, 90, 180, 364]);

export function parseReportDateOnly(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

export async function resolveReportDateRange(searchParams: URLSearchParams): Promise<{
  from: Date | null;
  to: Date | null;
}> {
  const period = searchParams.get("period");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (period?.startsWith("season:")) {
    return resolveSeasonReportDateRange(period);
  }

  if (period === "custom") {
    const from = parseReportDateOnly(dateFrom);
    const to = parseReportDateOnly(dateTo);
    if (to) to.setUTCHours(23, 59, 59, 999);
    return { from, to };
  }

  const days = period ? parseInt(period, 10) : 30;
  if (!REPORT_PRESET_PERIODS.has(days)) {
    return { from: null, to: null };
  }

  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  from.setUTCHours(0, 0, 0, 0);

  return { from, to };
}

export type RecordRow = {
  playerId: string;
  sessionId: string;
  status: string;
};

export function summarizeReportRecords(records: RecordRow[]) {
  const attended = records.filter((r) => r.status === "ATTENDED").length;
  const absentJustified = records.filter((r) => r.status === "ABSENT_JUSTIFIED").length;
  const absentUnjustified = records.filter((r) => r.status === "ABSENT_UNJUSTIFIED").length;
  const totalRegistered = attended + absentJustified + absentUnjustified;
  const attendancePct =
    totalRegistered > 0 ? Math.round((attended / totalRegistered) * 100) : null;

  return {
    attended,
    absentJustified,
    absentUnjustified,
    totalRegistered,
    attendancePct,
    avgScore: null,
  };
}

export function buildBySessionTypeSummary(
  records: RecordRow[],
  sessions: { id: string; sessionType: SessionType }[],
  sessionTypeById: Map<string, SessionType>,
  sessionOptions: SeasonSessionOption[] = TRAINING_SESSION_OPTIONS
) {
  return sessionOptions.map(({ value, short }) => {
    const turnRecords = records.filter((r) => sessionTypeById.get(r.sessionId) === value);
    const stats = summarizeReportRecords(turnRecords);
    return {
      sessionType: value,
      label: short,
      sessions: sessions.filter((s) => s.sessionType === value).length,
      ...stats,
    };
  });
}

export const REPORT_CATEGORIES = CATEGORIES;
export const REPORT_CATEGORY_LABELS = CATEGORY_LABELS;
export const REPORT_GENDERS: PlayerGender[] = ["MALE", "FEMALE"];
export const REPORT_GENDER_LABELS = PLAYER_GENDER_LABELS;
