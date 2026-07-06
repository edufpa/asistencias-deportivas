import type { AttendanceStatus, Category, SessionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatPlayerName } from "@/lib/mcp/format";
import type { McpAuthContext } from "@/lib/mcp/oauth";
import { assertCanEditAttendance } from "@/lib/mcp/authz";

const ATTENDANCE_STATUSES = ["ATTENDED", "ABSENT_JUSTIFIED", "ABSENT_UNJUSTIFIED"] as const;
type AttendanceStatusValue = (typeof ATTENDANCE_STATUSES)[number];

export type AttendanceRecordInput = {
  playerId: string;
  status: AttendanceStatusValue;
  absenceReason?: string | null;
};

export type SessionLocator = {
  sessionId?: string;
  sessionDate?: string;
  sessionType?: SessionType;
  category?: Category;
  convocatoriaId?: string;
};

function parseDateOnly(value: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

async function resolveSessionId(locator: SessionLocator): Promise<string> {
  if (locator.sessionId) {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: locator.sessionId },
      select: { id: true },
    });
    if (!session) throw new Error("Sesión de asistencia no encontrada");
    return session.id;
  }

  const { sessionDate, sessionType } = locator;
  if (!sessionDate || !sessionType) {
    throw new Error(
      "Indicá sessionId o bien sessionDate + sessionType + (category o convocatoriaId)"
    );
  }

  const parsedDate = parseDateOnly(sessionDate);
  if (!parsedDate) throw new Error("sessionDate inválida (usar YYYY-MM-DD)");

  if (locator.convocatoriaId) {
    const session = await prisma.attendanceSession.findUnique({
      where: {
        convocatoriaId_sessionDate_sessionType: {
          convocatoriaId: locator.convocatoriaId,
          sessionDate: parsedDate,
          sessionType,
        },
      },
      select: { id: true },
    });
    if (!session) throw new Error("Sesión de convocatoria no encontrada para esa fecha y turno");
    return session.id;
  }

  if (!locator.category) {
    throw new Error("Para sesiones por categoría, indicá category además de sessionDate y sessionType");
  }

  const session = await prisma.attendanceSession.findUnique({
    where: {
      category_sessionDate_sessionType: {
        category: locator.category,
        sessionDate: parsedDate,
        sessionType,
      },
    },
    select: { id: true },
  });
  if (!session) throw new Error("Sesión de categoría no encontrada para esa fecha y turno");
  return session.id;
}

function normalizeRecord(r: AttendanceRecordInput) {
  if (!ATTENDANCE_STATUSES.includes(r.status)) {
    throw new Error(`Estado inválido: ${r.status}. Usar ATTENDED, ABSENT_JUSTIFIED o ABSENT_UNJUSTIFIED`);
  }
  return {
    playerId: r.playerId,
    status: r.status as AttendanceStatus,
    performanceScore: null as number | null,
    absenceReason: r.status !== "ATTENDED" ? (r.absenceReason ?? null) : null,
  };
}

async function saveAttendanceRecords(
  sessionId: string,
  records: AttendanceRecordInput[],
  clearPlayerIds?: string[]
) {
  if (records.length === 0 && (!clearPlayerIds || clearPlayerIds.length === 0)) {
    throw new Error("No hay registros para guardar");
  }

  const upserts = records.map(normalizeRecord);

  await prisma.$transaction(async (tx) => {
    for (const r of upserts) {
      await tx.attendanceRecord.upsert({
        where: { sessionId_playerId: { sessionId, playerId: r.playerId } },
        update: {
          status: r.status,
          performanceScore: r.performanceScore,
          absenceReason: r.absenceReason,
        },
        create: {
          sessionId,
          playerId: r.playerId,
          status: r.status,
          performanceScore: r.performanceScore,
          absenceReason: r.absenceReason,
        },
      });
    }

    if (clearPlayerIds && clearPlayerIds.length > 0) {
      await tx.attendanceRecord.deleteMany({
        where: { sessionId, playerId: { in: clearPlayerIds } },
      });
    }
  });

  const saved = await prisma.attendanceRecord.findMany({
    where: {
      sessionId,
      playerId: { in: upserts.map((r) => r.playerId) },
    },
    include: {
      player: {
        select: { firstName: true, paternalLastName: true, maternalLastName: true },
      },
    },
  });

  return saved.map((r) => ({
    playerId: r.playerId,
    playerName: formatPlayerName(r.player),
    status: r.status,
    absenceReason: r.absenceReason,
  }));
}

export async function listAttendanceSessions(
  _ctx: McpAuthContext,
  args: {
    category?: Category;
    convocatoriaId?: string;
    sessionDate?: string;
    limit?: number;
  }
) {
  const parsedDate = args.sessionDate ? parseDateOnly(args.sessionDate) : null;
  if (args.sessionDate && !parsedDate) {
    throw new Error("sessionDate inválida (usar YYYY-MM-DD)");
  }

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      ...(args.convocatoriaId
        ? { convocatoriaId: args.convocatoriaId }
        : args.category
          ? { convocatoriaId: null, category: args.category }
          : {}),
      ...(parsedDate ? { sessionDate: parsedDate } : {}),
    },
    orderBy: [{ sessionDate: "desc" }, { sessionType: "asc" }],
    take: args.limit ?? 30,
    include: {
      _count: { select: { records: true } },
      convocatoria: { select: { id: true, name: true } },
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    sessionDate: s.sessionDate.toISOString().split("T")[0],
    sessionType: s.sessionType,
    category: s.category,
    convocatoria: s.convocatoria,
    recordsCount: s._count.records,
  }));
}

export async function getAttendanceSessionRecords(
  _ctx: McpAuthContext,
  args: SessionLocator
) {
  const sessionId = await resolveSessionId(args);

  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      convocatoria: { select: { id: true, name: true } },
      records: {
        include: {
          player: {
            select: { id: true, firstName: true, paternalLastName: true, maternalLastName: true },
          },
        },
        orderBy: [{ player: { paternalLastName: "asc" } }],
      },
    },
  });

  if (!session) throw new Error("Sesión no encontrada");

  return {
    id: session.id,
    sessionDate: session.sessionDate.toISOString().split("T")[0],
    sessionType: session.sessionType,
    category: session.category,
    convocatoria: session.convocatoria,
    records: session.records.map((r) => ({
      playerId: r.playerId,
      playerName: formatPlayerName(r.player),
      status: r.status,
      absenceReason: r.absenceReason,
    })),
  };
}

export async function updateAttendance(
  ctx: McpAuthContext,
  args: SessionLocator & AttendanceRecordInput
) {
  assertCanEditAttendance(ctx);

  const sessionId = await resolveSessionId(args);
  const { playerId, status, absenceReason } = args;

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true },
  });
  if (!player) throw new Error("Jugador no encontrado");

  const saved = await saveAttendanceRecords(sessionId, [{ playerId, status, absenceReason }]);

  return {
    sessionId,
    updated: saved,
  };
}

export async function updateAttendanceBatch(
  ctx: McpAuthContext,
  args: SessionLocator & {
    records: AttendanceRecordInput[];
    clearPlayerIds?: string[];
  }
) {
  assertCanEditAttendance(ctx);

  const sessionId = await resolveSessionId(args);

  if (!Array.isArray(args.records) || args.records.length === 0) {
    if (!args.clearPlayerIds?.length) {
      throw new Error("records debe ser un array con al menos un jugador");
    }
  }

  const playerIds = args.records.map((r) => r.playerId);
  if (playerIds.length > 0) {
    const found = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true },
    });
    if (found.length !== new Set(playerIds).size) {
      throw new Error("Uno o más jugadores no existen");
    }
  }

  const saved = await saveAttendanceRecords(sessionId, args.records, args.clearPlayerIds);

  return {
    sessionId,
    updatedCount: saved.length,
    clearedCount: args.clearPlayerIds?.length ?? 0,
    updated: saved,
  };
}
