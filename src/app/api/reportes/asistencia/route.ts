import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBirthYear, getPlayerCategory, matchesPlayerGender } from "@/lib/player";
import type { PlayerGender } from "@/lib/player";
import { getAttendanceSeasonOptionsForReportRange } from "@/lib/attendanceSeason";
import { resolveReportDateRange } from "@/lib/reportesAsistencia";
import type { Category, SessionType } from "@prisma/client";

type RecordRow = {
  playerId: string;
  sessionId: string;
  status: string;
};

function summarizeRecords(records: RecordRow[]) {
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

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as Category | null;
  const sessionType = searchParams.get("sessionType");
  const gender = searchParams.get("gender") as PlayerGender | null;
  const period = searchParams.get("period") ?? "30";

  if (!category) {
    return NextResponse.json({ error: "category es requerido" }, { status: 400 });
  }

  if (!gender || !["MALE", "FEMALE"].includes(gender)) {
    return NextResponse.json({ error: "gender es requerido (MALE o FEMALE)" }, { status: 400 });
  }

  const { from, to } = await resolveReportDateRange(searchParams);
  const reportSessionOptions = await getAttendanceSeasonOptionsForReportRange(from, to);
  const reportSessionTypes = reportSessionOptions.map((opt) => opt.value);

  const sessionWhere: Record<string, unknown> = {
    category,
    convocatoriaId: null,
  };

  if (sessionType && sessionType !== "ALL") {
    sessionWhere.sessionType = sessionType;
  } else {
    sessionWhere.sessionType = { in: reportSessionTypes };
  }
  if (from || to) {
    sessionWhere.sessionDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const sessions = await prisma.attendanceSession.findMany({
    where: sessionWhere,
    select: { id: true, sessionDate: true, sessionType: true },
    orderBy: [{ sessionDate: "asc" }, { sessionType: "asc" }],
  });

  const sessionIds = sessions.map((s) => s.id);
  const sessionTypeById = new Map(sessions.map((s) => [s.id, s.sessionType as SessionType]));

  const referenceYear = to?.getUTCFullYear() ?? from?.getUTCFullYear() ?? new Date().getFullYear();

  const allPlayers = await prisma.player.findMany({
    select: {
      id: true,
      firstName: true,
      paternalLastName: true,
      maternalLastName: true,
      documentId: true,
      documentType: true,
      birthDate: true,
      gender: true,
    },
    orderBy: [{ paternalLastName: "asc" }, { firstName: "asc" }],
  });

  const players = allPlayers
    .filter(
      (p) =>
        getPlayerCategory(getBirthYear(p.birthDate), referenceYear) === category &&
        matchesPlayerGender(p.gender, gender)
    )
    .map((p) => ({ ...p, documentType: p.documentType as string, playerStatus: "ACTIVE" as const }));

  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId: { in: sessionIds } },
    select: { playerId: true, sessionId: true, status: true },
  });

  const playerIds = new Set(players.map((p) => p.id));
  const scopedRecords = records.filter((r) => playerIds.has(r.playerId));

  const recordsByPlayer = new Map<string, RecordRow[]>();
  for (const r of scopedRecords) {
    if (!recordsByPlayer.has(r.playerId)) recordsByPlayer.set(r.playerId, []);
    recordsByPlayer.get(r.playerId)!.push(r);
  }

  const ranking = players.map((p) => {
    const playerRecords = recordsByPlayer.get(p.id) ?? [];
    const overall = summarizeRecords(playerRecords);

    const bySessionType = reportSessionOptions.map(({ value, short }) => {
      const turnRecords = playerRecords.filter(
        (r) => sessionTypeById.get(r.sessionId) === value
      );
      const stats = summarizeRecords(turnRecords);
      return {
        sessionType: value,
        label: short,
        ...stats,
      };
    });

    return {
      playerId: p.id,
      firstName: p.firstName,
      paternalLastName: p.paternalLastName,
      maternalLastName: p.maternalLastName,
      documentId: p.documentId,
      documentType: p.documentType,
      birthYear: getBirthYear(p.birthDate),
      playerStatus: p.playerStatus,
      ...overall,
      bySessionType,
    };
  });

  ranking.sort((a, b) => {
    if (a.totalRegistered === 0 && b.totalRegistered === 0) return 0;
    if (a.totalRegistered === 0) return 1;
    if (b.totalRegistered === 0) return -1;
    if ((b.attendancePct ?? 0) !== (a.attendancePct ?? 0)) {
      return (b.attendancePct ?? 0) - (a.attendancePct ?? 0);
    }
    return `${a.paternalLastName} ${a.firstName}`.localeCompare(`${b.paternalLastName} ${b.firstName}`);
  });

  const overallStats = summarizeRecords(scopedRecords);
  const globalAttendancePct = overallStats.attendancePct ?? 0;

  const sessionsByType = sessions.reduce(
    (acc, s) => {
      acc[s.sessionType] = (acc[s.sessionType] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const bySessionType = reportSessionOptions.map(({ value, short }) => {
    const turnRecords = scopedRecords.filter(
      (r) => sessionTypeById.get(r.sessionId) === value
    );
    const stats = summarizeRecords(turnRecords);
    return {
      sessionType: value,
      label: short,
      sessions: sessions.filter((s) => s.sessionType === value).length,
      ...stats,
    };
  });

  return NextResponse.json({
    category,
    filters: {
      sessionType: sessionType ?? "ALL",
      gender,
      period,
      dateFrom: from?.toISOString().split("T")[0] ?? null,
      dateTo: to?.toISOString().split("T")[0] ?? null,
    },
    summary: {
      totalSessions: sessions.length,
      totalPlayers: players.length,
      activePlayers: players.length,
      globalAttendancePct,
      sessionsByType,
      bySessionType,
      ...overallStats,
    },
    ranking,
    sessions,
  });
}
