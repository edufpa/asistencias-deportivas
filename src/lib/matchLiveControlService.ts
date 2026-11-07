import { prisma } from "@/lib/prisma";
import {
  buildLiveBoard,
  FOUL_OUT_THRESHOLD,
  isValidCapNumber,
  isValidLiveEventType,
  isValidLiveTeam,
  isValidQuarter,
  type LiveEventRecord,
  type LiveEventType,
  type LiveTeam,
  type MatchLiveBoard,
} from "@/lib/matchLiveControl";

function serializeEvent(event: {
  id: string;
  team: LiveTeam;
  capNumber: number;
  eventType: LiveEventType;
  quarter: number;
  undone: boolean;
  createdAt: Date;
  createdBy?: { id: string; name: string } | null;
}): LiveEventRecord {
  return {
    id: event.id,
    team: event.team,
    capNumber: event.capNumber,
    eventType: event.eventType,
    quarter: event.quarter,
    undone: event.undone,
    createdAt: event.createdAt.toISOString(),
    createdBy: event.createdBy ?? null,
  };
}

export async function listBlueWhiteMatches() {
  const matches = await prisma.match.findMany({
    where: { blueWhiteMode: true },
    orderBy: [{ matchDate: "desc" }, { createdAt: "desc" }],
    take: 40,
    select: {
      id: true,
      matchDate: true,
      location: true,
      notes: true,
      homeScore: true,
      awayScore: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
      _count: { select: { liveEvents: { where: { undone: false } } } },
    },
  });

  return matches.map((m) => ({
    id: m.id,
    matchDate: m.matchDate.toISOString().slice(0, 10),
    location: m.location,
    notes: m.notes,
    blueScore: m.homeScore ?? 0,
    whiteScore: m.awayScore ?? 0,
    createdAt: m.createdAt.toISOString(),
    createdBy: m.createdBy,
    eventCount: m._count.liveEvents,
  }));
}

export async function createBlueWhiteMatch(input: {
  userId: string;
  matchDate?: string;
  location?: string;
  notes?: string;
}) {
  const matchDate = input.matchDate
    ? new Date(`${input.matchDate}T12:00:00.000Z`)
    : new Date();

  const match = await prisma.match.create({
    data: {
      matchDate,
      matchType: "PRACTICE",
      opponent: "Equipo Blanco",
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || "Partido de práctica Azul vs Blanco",
      blueWhiteMode: true,
      homeScore: 0,
      awayScore: 0,
      createdById: input.userId,
    },
    select: { id: true },
  });

  return match;
}

async function loadMatchEvents(matchId: string): Promise<LiveEventRecord[]> {
  const events = await prisma.matchLiveEvent.findMany({
    where: { matchId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
  return events.map((e) =>
    serializeEvent({
      ...e,
      team: e.team as LiveTeam,
      eventType: e.eventType as LiveEventType,
    })
  );
}

export async function getBlueWhiteBoard(matchId: string): Promise<{
  match: {
    id: string;
    matchDate: string;
    location: string | null;
    notes: string | null;
    blueWhiteMode: boolean;
  };
  board: MatchLiveBoard;
} | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      matchDate: true,
      location: true,
      notes: true,
      blueWhiteMode: true,
    },
  });
  if (!match || !match.blueWhiteMode) return null;

  const events = await loadMatchEvents(matchId);
  return {
    match: {
      id: match.id,
      matchDate: match.matchDate.toISOString().slice(0, 10),
      location: match.location,
      notes: match.notes,
      blueWhiteMode: match.blueWhiteMode,
    },
    board: buildLiveBoard(events),
  };
}

async function syncMatchScores(matchId: string, board: MatchLiveBoard) {
  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore: board.blue.score,
      awayScore: board.white.score,
    },
  });
}

export async function addLiveEvent(input: {
  matchId: string;
  userId: string;
  team: unknown;
  capNumber: unknown;
  eventType: unknown;
  quarter?: unknown;
}): Promise<{ ok: true; board: MatchLiveBoard } | { ok: false; error: string; status: number }> {
  if (!isValidLiveTeam(input.team)) {
    return { ok: false, error: "Equipo inválido", status: 400 };
  }
  if (!isValidCapNumber(input.capNumber)) {
    return { ok: false, error: "Gorro debe ser del 1 al 15", status: 400 };
  }
  if (!isValidLiveEventType(input.eventType)) {
    return { ok: false, error: "Tipo de evento inválido", status: 400 };
  }
  const quarter = input.quarter === undefined ? 1 : input.quarter;
  if (!isValidQuarter(quarter)) {
    return { ok: false, error: "Cuarto inválido", status: 400 };
  }

  const match = await prisma.match.findUnique({
    where: { id: input.matchId },
    select: { id: true, blueWhiteMode: true },
  });
  if (!match || !match.blueWhiteMode) {
    return { ok: false, error: "Partido no encontrado", status: 404 };
  }

  const current = buildLiveBoard(await loadMatchEvents(input.matchId));
  const teamState = input.team === "BLUE" ? current.blue : current.white;
  const cap = teamState.caps[input.capNumber - 1];
  if (!cap) {
    return { ok: false, error: "Gorro inválido", status: 400 };
  }

  if (cap.fouledOut) {
    return {
      ok: false,
      error: `El gorro ${input.capNumber} ya está fuera (${FOUL_OUT_THRESHOLD} faltas)`,
      status: 409,
    };
  }

  // Gol, expulsión o penal sobre un jugador que al sumar llega a 3: permitir el evento
  // (si es la 3ª falta, queda fuera a partir de ahí).
  await prisma.matchLiveEvent.create({
    data: {
      matchId: input.matchId,
      team: input.team,
      capNumber: input.capNumber,
      eventType: input.eventType,
      quarter,
      createdById: input.userId,
    },
  });

  const board = buildLiveBoard(await loadMatchEvents(input.matchId));
  await syncMatchScores(input.matchId, board);
  return { ok: true, board };
}

export async function undoLiveEvent(input: {
  matchId: string;
  eventId: string;
}): Promise<{ ok: true; board: MatchLiveBoard } | { ok: false; error: string; status: number }> {
  const match = await prisma.match.findUnique({
    where: { id: input.matchId },
    select: { id: true, blueWhiteMode: true },
  });
  if (!match || !match.blueWhiteMode) {
    return { ok: false, error: "Partido no encontrado", status: 404 };
  }

  const event = await prisma.matchLiveEvent.findFirst({
    where: { id: input.eventId, matchId: input.matchId, undone: false },
  });
  if (!event) {
    return { ok: false, error: "Evento no encontrado", status: 404 };
  }

  await prisma.matchLiveEvent.update({
    where: { id: event.id },
    data: { undone: true },
  });

  const board = buildLiveBoard(await loadMatchEvents(input.matchId));
  await syncMatchScores(input.matchId, board);
  return { ok: true, board };
}
