import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBirthYear, getPlayerCategory, matchesPlayerGender } from "@/lib/player";
import type { PlayerGender } from "@/lib/player";
import {
  buildBySessionTypeSummary,
  REPORT_CATEGORIES,
  REPORT_CATEGORY_LABELS,
  REPORT_GENDERS,
  REPORT_GENDER_LABELS,
  resolveReportDateRange,
  summarizeReportRecords,
  type RecordRow,
} from "@/lib/reportesAsistencia";
import type { Category, SessionType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionType = searchParams.get("sessionType");
  const period = searchParams.get("period") ?? "30";
  const { from, to } = resolveReportDateRange(searchParams);

  const sessionWhere: Record<string, unknown> = {
    category: { not: null },
    convocatoriaId: null,
  };

  if (sessionType && sessionType !== "ALL") {
    sessionWhere.sessionType = sessionType;
  }
  if (from || to) {
    sessionWhere.sessionDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const sessions = await prisma.attendanceSession.findMany({
    where: sessionWhere,
    select: { id: true, sessionDate: true, sessionType: true, category: true },
    orderBy: [{ sessionDate: "asc" }, { sessionType: "asc" }],
  });

  const sessionTypeById = new Map(sessions.map((s) => [s.id, s.sessionType as SessionType]));
  const sessionCategoryById = new Map(
    sessions.map((s) => [s.id, s.category as Category])
  );

  const referenceYear = to?.getUTCFullYear() ?? from?.getUTCFullYear() ?? new Date().getFullYear();

  const allPlayers = await prisma.player.findMany({
    select: { id: true, birthDate: true, gender: true },
  });

  const playersByCategoryGender = new Map<string, string[]>();
  for (const cat of REPORT_CATEGORIES) {
    for (const gender of REPORT_GENDERS) {
      const ids = allPlayers
        .filter(
          (p) =>
            getPlayerCategory(getBirthYear(p.birthDate), referenceYear) === cat &&
            matchesPlayerGender(p.gender, gender)
        )
        .map((p) => p.id);
      playersByCategoryGender.set(`${cat}:${gender}`, ids);
    }
  }

  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId: { in: sessions.map((s) => s.id) } },
    select: { playerId: true, sessionId: true, status: true, performanceScore: true },
  });

  const rows = REPORT_CATEGORIES.flatMap((category) =>
    REPORT_GENDERS.map((gender) => {
      const playerIds = new Set(playersByCategoryGender.get(`${category}:${gender}`) ?? []);
      const categorySessions = sessions.filter((s) => s.category === category);
      const categorySessionIds = new Set(categorySessions.map((s) => s.id));

      const scopedRecords: RecordRow[] = records.filter(
        (r) => playerIds.has(r.playerId) && categorySessionIds.has(r.sessionId)
      );

      const overall = summarizeReportRecords(scopedRecords);
      const bySessionType = buildBySessionTypeSummary(
        scopedRecords,
        categorySessions,
        sessionTypeById
      );

      return {
        category,
        categoryLabel: REPORT_CATEGORY_LABELS[category],
        gender,
        genderLabel: REPORT_GENDER_LABELS[gender],
        totalPlayers: playerIds.size,
        totalSessions: categorySessions.length,
        ...overall,
        bySessionType,
      };
    })
  );

  rows.sort((a, b) => {
    const catDiff =
      REPORT_CATEGORIES.indexOf(a.category) - REPORT_CATEGORIES.indexOf(b.category);
    if (catDiff !== 0) return catDiff;
    return a.gender.localeCompare(b.gender);
  });

  const visibleRows = rows.filter((r) => r.totalPlayers > 0);

  const allScoped = records.filter((r) => {
    const cat = sessionCategoryById.get(r.sessionId);
    if (!cat) return false;
    const gender = allPlayers.find((p) => p.id === r.playerId)?.gender;
    if (!gender) return false;
    const g: PlayerGender = gender === "FEMALE" ? "FEMALE" : "MALE";
    const playerIds = playersByCategoryGender.get(`${cat}:${g}`);
    return playerIds?.includes(r.playerId) ?? false;
  });

  const overall = summarizeReportRecords(allScoped);

  return NextResponse.json({
    filters: {
      sessionType: sessionType ?? "ALL",
      period,
      dateFrom: from?.toISOString().split("T")[0] ?? null,
      dateTo: to?.toISOString().split("T")[0] ?? null,
    },
    summary: {
      totalSessions: sessions.length,
      globalAttendancePct: overall.attendancePct ?? 0,
      ...overall,
    },
    rows: visibleRows,
  });
}
