import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const convocatoriaId = searchParams.get("convocatoriaId");
  const sessionType = searchParams.get("sessionType"); // ALL | TURNO_MANANA | TURNO_TARDE | PESAS
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (!convocatoriaId) {
    return NextResponse.json({ error: "convocatoriaId es requerido" }, { status: 400 });
  }

  // Build session filter
  const sessionWhere: Record<string, unknown> = { convocatoriaId };
  if (sessionType && sessionType !== "ALL") {
    sessionWhere.sessionType = sessionType;
  }
  if (dateFrom || dateTo) {
    sessionWhere.sessionDate = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
    };
  }

  // Get convocatoria info
  const convocatoria = await prisma.convocatoria.findUnique({
    where: { id: convocatoriaId },
    select: { id: true, name: true, status: true, startDate: true },
  });

  if (!convocatoria) {
    return NextResponse.json({ error: "Convocatoria no encontrada" }, { status: 404 });
  }

  // Get all sessions matching filters
  const sessions = await prisma.attendanceSession.findMany({
    where: sessionWhere,
    select: { id: true, sessionDate: true, sessionType: true },
    orderBy: [{ sessionDate: "asc" }, { sessionType: "asc" }],
  });

  const sessionIds = sessions.map((s) => s.id);

  // Get all players in convocatoria (active + cut)
  const convocatoriaPlayers = await prisma.convocatoriaPlayer.findMany({
    where: { convocatoriaId },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          documentId: true,
          club: true,
        },
      },
    },
    orderBy: [{ player: { lastName: "asc" } }, { player: { firstName: "asc" } }],
  });

  // Get all attendance records for these sessions
  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId: { in: sessionIds } },
    select: {
      playerId: true,
      sessionId: true,
      status: true,
      performanceScore: true,
    },
  });

  // Group records by playerId
  const recordsByPlayer = new Map<string, typeof records>();
  for (const r of records) {
    if (!recordsByPlayer.has(r.playerId)) recordsByPlayer.set(r.playerId, []);
    recordsByPlayer.get(r.playerId)!.push(r);
  }

  // Build ranking per player
  const ranking = convocatoriaPlayers.map((cp) => {
    const playerRecords = recordsByPlayer.get(cp.player.id) ?? [];

    const attended = playerRecords.filter((r) => r.status === "ATTENDED").length;
    const absentJustified = playerRecords.filter(
      (r) => r.status === "ABSENT_JUSTIFIED"
    ).length;
    const absentUnjustified = playerRecords.filter(
      (r) => r.status === "ABSENT_UNJUSTIFIED"
    ).length;
    const totalRegistered = attended + absentJustified + absentUnjustified;

    const scores = playerRecords
      .filter((r) => r.status === "ATTENDED" && r.performanceScore !== null)
      .map((r) => r.performanceScore as number);

    const avgScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : null;

    const attendancePct =
      totalRegistered > 0 ? Math.round((attended / totalRegistered) * 100) : null;

    return {
      playerId: cp.player.id,
      firstName: cp.player.firstName,
      lastName: cp.player.lastName,
      documentId: cp.player.documentId,
      club: cp.player.club,
      playerStatus: cp.status, // ACTIVE | CUT
      attended,
      absentJustified,
      absentUnjustified,
      totalRegistered,
      attendancePct,
      avgScore,
    };
  });

  // Sort: players with records first by attendance % desc, then by avg score desc
  // Players with no records at all go to the bottom
  ranking.sort((a, b) => {
    if (a.totalRegistered === 0 && b.totalRegistered === 0) return 0;
    if (a.totalRegistered === 0) return 1;
    if (b.totalRegistered === 0) return -1;
    if ((b.attendancePct ?? 0) !== (a.attendancePct ?? 0)) {
      return (b.attendancePct ?? 0) - (a.attendancePct ?? 0);
    }
    return (b.avgScore ?? 0) - (a.avgScore ?? 0);
  });

  // Global stats
  const totalSessions = sessions.length;
  const totalAttended = records.filter((r) => r.status === "ATTENDED").length;
  const totalRegistered = records.length;
  const globalAttendancePct =
    totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

  // Sessions breakdown by type
  const sessionsByType = sessions.reduce(
    (acc, s) => {
      acc[s.sessionType] = (acc[s.sessionType] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return NextResponse.json({
    convocatoria,
    filters: {
      sessionType: sessionType ?? "ALL",
      dateFrom: dateFrom ?? null,
      dateTo: dateTo ?? null,
    },
    summary: {
      totalSessions,
      totalPlayers: convocatoriaPlayers.length,
      activePlayers: convocatoriaPlayers.filter((p) => p.status === "ACTIVE").length,
      globalAttendancePct,
      sessionsByType,
    },
    ranking,
    sessions,
  });
}
