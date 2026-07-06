import { z } from "zod";
import type { Category, ConvocatoriaStatus, Gender } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatPlayerName } from "@/lib/mcp/format";

const categorySchema = z.enum(["SUB10", "SUB12", "SUB14", "SUB16", "SUB18", "OPEN"]);
const genderSchema = z.enum(["MALE", "FEMALE", "MIXED"]);

function getBirthYear(birthDate: Date): number {
  return birthDate.getUTCFullYear();
}

function getPlayerCategory(birthYear: number, referenceYear = new Date().getFullYear()) {
  if (birthYear >= referenceYear - 10) return "SUB10";
  if (birthYear >= referenceYear - 12) return "SUB12";
  if (birthYear >= referenceYear - 14) return "SUB14";
  if (birthYear >= referenceYear - 16) return "SUB16";
  if (birthYear >= referenceYear - 18) return "SUB18";
  return "OPEN";
}

function summarizeAttendance(records: Array<{ status: string }>) {
  const attended = records.filter((r) => r.status === "ATTENDED").length;
  const absentJustified = records.filter((r) => r.status === "ABSENT_JUSTIFIED").length;
  const absentUnjustified = records.filter((r) => r.status === "ABSENT_UNJUSTIFIED").length;
  const total = attended + absentJustified + absentUnjustified;

  return {
    attended,
    absentJustified,
    absentUnjustified,
    totalRegistered: total,
    attendancePct: total > 0 ? Math.round((attended / total) * 100) : null,
    avgScore: null,
  };
}

export async function dashboardStats() {
  const [totalPlayers, activeConvocatorias, totalConvocatorias, recentCuts] = await Promise.all([
    prisma.player.count(),
    prisma.convocatoria.count({ where: { status: "ACTIVE" } }),
    prisma.convocatoria.count(),
    prisma.convocatoriaPlayer.findMany({
      where: { status: "CUT" },
      orderBy: { cutDate: "desc" },
      take: 5,
      include: {
        player: { select: { firstName: true, paternalLastName: true, maternalLastName: true } },
        convocatoria: { select: { name: true } },
        cutBy: { select: { name: true } },
      },
    }),
  ]);

  return {
    totalPlayers,
    activeConvocatorias,
    totalConvocatorias,
    recentCuts: recentCuts.map((c) => ({
      player: formatPlayerName(c.player),
      convocatoria: c.convocatoria.name,
      cutDate: c.cutDate?.toISOString().split("T")[0] ?? null,
      cutReason: c.cutReason,
      cutBy: c.cutBy?.name ?? null,
    })),
  };
}

export async function listConvocatorias(args: {
  status?: "ACTIVE" | "CLOSED";
  category?: z.infer<typeof categorySchema>;
  gender?: z.infer<typeof genderSchema>;
  limit?: number;
}) {
  const convocatorias = await prisma.convocatoria.findMany({
    where: {
      ...(args.status ? { status: args.status as ConvocatoriaStatus } : {}),
      ...(args.category ? { category: args.category as Category } : {}),
      ...(args.gender ? { gender: args.gender as Gender } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: args.limit ?? 20,
    include: {
      creator: { select: { name: true } },
      coachUser: { select: { name: true } },
      _count: {
        select: {
          players: { where: { status: "ACTIVE" } },
          matches: true,
          sessions: true,
        },
      },
    },
  });

  return convocatorias.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    gender: c.gender,
    status: c.status,
    startDate: c.startDate.toISOString().split("T")[0],
    creator: c.creator.name,
    coach: c.coachUser?.name ?? null,
    activePlayers: c._count.players,
    matches: c._count.matches,
    sessions: c._count.sessions,
  }));
}

export async function getConvocatoria(args: { convocatoriaId: string }) {
  const conv = await prisma.convocatoria.findUnique({
    where: { id: args.convocatoriaId },
    include: {
      creator: { select: { name: true, email: true } },
      coachUser: { select: { name: true, email: true } },
      assistant1User: { select: { name: true } },
      assistant2User: { select: { name: true } },
      delegateUser: { select: { name: true } },
      players: {
        where: { status: "ACTIVE" },
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              paternalLastName: true,
              maternalLastName: true,
              documentId: true,
              birthDate: true,
            },
          },
        },
        orderBy: [{ capNumber: "asc" }, { joinedAt: "asc" }],
      },
      _count: { select: { matches: true, sessions: true, coachReports: true } },
    },
  });

  if (!conv) throw new Error("Convocatoria no encontrada");

  return {
    id: conv.id,
    name: conv.name,
    description: conv.description,
    category: conv.category,
    gender: conv.gender,
    status: conv.status,
    startDate: conv.startDate.toISOString().split("T")[0],
    staff: {
      creator: conv.creator,
      coach: conv.coachUser,
      assistant1: conv.assistant1User,
      assistant2: conv.assistant2User,
      delegate: conv.delegateUser,
    },
    counts: conv._count,
    players: conv.players.map((cp) => ({
      playerId: cp.player.id,
      name: formatPlayerName(cp.player),
      capNumber: cp.capNumber,
      documentId: cp.player.documentId,
      category: getPlayerCategory(getBirthYear(cp.player.birthDate)),
    })),
  };
}

export async function searchPlayers(args: { query: string; limit?: number }) {
  const q = args.query.trim();
  const players = await prisma.player.findMany({
    where: {
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { paternalLastName: { contains: q, mode: "insensitive" } },
        { maternalLastName: { contains: q, mode: "insensitive" } },
        { documentId: { contains: q, mode: "insensitive" } },
      ],
    },
    take: args.limit ?? 15,
    orderBy: [{ paternalLastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      paternalLastName: true,
      maternalLastName: true,
      documentId: true,
      birthDate: true,
      gender: true,
      playerStatus: true,
    },
  });

  return players.map((p) => ({
    id: p.id,
    name: formatPlayerName(p),
    documentId: p.documentId,
    gender: p.gender,
    playerStatus: p.playerStatus,
    category: getPlayerCategory(getBirthYear(p.birthDate)),
  }));
}

export async function getPlayer(args: { playerId: string; attendanceDays?: number }) {
  const days = args.attendanceDays ?? 30;
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - (days - 1));
  from.setUTCHours(0, 0, 0, 0);

  const player = await prisma.player.findUnique({
    where: { id: args.playerId },
    include: {
      convocatorias: {
        where: { status: "ACTIVE" },
        include: { convocatoria: { select: { id: true, name: true, category: true, status: true } } },
      },
      attendanceRecords: {
        where: { session: { sessionDate: { gte: from } } },
        include: { session: { select: { sessionDate: true, sessionType: true, category: true } } },
        orderBy: { session: { sessionDate: "desc" } },
      },
    },
  });

  if (!player) throw new Error("Jugador no encontrado");

  const attendance = summarizeAttendance(player.attendanceRecords);

  return {
    id: player.id,
    name: formatPlayerName(player),
    documentId: player.documentId,
    documentType: player.documentType,
    birthDate: player.birthDate.toISOString().split("T")[0],
    gender: player.gender,
    playerStatus: player.playerStatus,
    category: getPlayerCategory(getBirthYear(player.birthDate)),
    contactPhone: player.contactPhone,
    playerEmail: player.playerEmail,
    convocatorias: player.convocatorias.map((cp) => ({
      id: cp.convocatoria.id,
      name: cp.convocatoria.name,
      category: cp.convocatoria.category,
      capNumber: cp.capNumber,
    })),
    attendanceLastDays: {
      days,
      ...attendance,
      recentSessions: player.attendanceRecords.slice(0, 10).map((r) => ({
        date: r.session.sessionDate.toISOString().split("T")[0],
        sessionType: r.session.sessionType,
        category: r.session.category,
        status: r.status,
      })),
    },
  };
}

export async function attendanceSummary(args: {
  category: z.infer<typeof categorySchema>;
  gender: "MALE" | "FEMALE";
  days?: number;
  convocatoriaId?: string;
}) {
  const days = args.days ?? 30;
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  from.setUTCHours(0, 0, 0, 0);

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      ...(args.convocatoriaId
        ? { convocatoriaId: args.convocatoriaId }
        : { convocatoriaId: null, category: args.category as Category }),
      sessionDate: { gte: from, lte: to },
    },
    select: { id: true, sessionDate: true, sessionType: true },
  });

  const sessionIds = sessions.map((s) => s.id);
  const referenceYear = to.getUTCFullYear();

  const allPlayers = await prisma.player.findMany({
    select: {
      id: true,
      firstName: true,
      paternalLastName: true,
      maternalLastName: true,
      birthDate: true,
      gender: true,
    },
  });

  const players = allPlayers.filter((p) => {
    const birthYear = getBirthYear(p.birthDate);
    const playerGender = p.gender === "FEMALE" ? "FEMALE" : "MALE";
    return getPlayerCategory(birthYear, referenceYear) === args.category && playerGender === args.gender;
  });

  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId: { in: sessionIds } },
    select: { playerId: true, status: true },
  });

  const playerIds = new Set(players.map((p) => p.id));
  const scoped = records.filter((r) => playerIds.has(r.playerId));

  const byPlayer = new Map<string, typeof scoped>();
  for (const r of scoped) {
    if (!byPlayer.has(r.playerId)) byPlayer.set(r.playerId, []);
    byPlayer.get(r.playerId)!.push(r);
  }

  const ranking = players
    .map((p) => {
      const stats = summarizeAttendance(byPlayer.get(p.id) ?? []);
      return {
        playerId: p.id,
        name: formatPlayerName(p),
        ...stats,
      };
    })
    .sort((a, b) => (b.attendancePct ?? 0) - (a.attendancePct ?? 0));

  return {
    category: args.category,
    gender: args.gender,
    periodDays: days,
    convocatoriaId: args.convocatoriaId ?? null,
    totalSessions: sessions.length,
    totalPlayers: players.length,
    summary: summarizeAttendance(scoped),
    topPlayers: ranking.slice(0, 10),
    bottomPlayers: [...ranking].reverse().slice(0, 5),
  };
}

export async function listMatches(args: { convocatoriaId: string; limit?: number }) {
  const matches = await prisma.match.findMany({
    where: { convocatoriaId: args.convocatoriaId },
    orderBy: { matchDate: "desc" },
    take: args.limit ?? 20,
    select: {
      id: true,
      matchDate: true,
      matchType: true,
      opponent: true,
      location: true,
      homeScore: true,
      awayScore: true,
      evalOverall: true,
    },
  });

  return matches.map((m) => ({
    ...m,
    matchDate: m.matchDate.toISOString().split("T")[0],
    score:
      m.homeScore !== null && m.awayScore !== null ? `${m.homeScore} - ${m.awayScore}` : null,
    outcome:
      m.homeScore === null || m.awayScore === null
        ? null
        : m.homeScore > m.awayScore
          ? "G"
          : m.homeScore < m.awayScore
            ? "P"
            : "E",
  }));
}

export async function getMatchStats(args: { matchId: string }) {
  const match = await prisma.match.findUnique({
    where: { id: args.matchId },
    include: {
      convocatoria: { select: { id: true, name: true } },
      playerStats: {
        include: {
          player: {
            select: { id: true, firstName: true, paternalLastName: true, maternalLastName: true },
          },
        },
      },
    },
  });

  if (!match) throw new Error("Partido no encontrado");

  const totals = new Map<
    string,
    {
      playerId: string;
      name: string;
      goals: number;
      assists: number;
      exclusionsGenerated: number;
      exclusionsAgainst: number;
      penaltiesGenerated: number;
      penaltiesAgainst: number;
    }
  >();

  for (const stat of match.playerStats) {
    const key = stat.playerId;
    const existing = totals.get(key) ?? {
      playerId: stat.playerId,
      name: formatPlayerName(stat.player),
      goals: 0,
      assists: 0,
      exclusionsGenerated: 0,
      exclusionsAgainst: 0,
      penaltiesGenerated: 0,
      penaltiesAgainst: 0,
    };
    existing.goals += stat.goals;
    existing.assists += stat.assists;
    existing.exclusionsGenerated += stat.exclusionsGenerated;
    existing.exclusionsAgainst += stat.exclusionsAgainst;
    existing.penaltiesGenerated += stat.penaltiesGenerated;
    existing.penaltiesAgainst += stat.penaltiesAgainst;
    totals.set(key, existing);
  }

  return {
    match: {
      id: match.id,
      date: match.matchDate.toISOString().split("T")[0],
      type: match.matchType,
      opponent: match.opponent,
      location: match.location,
      score:
        match.homeScore !== null && match.awayScore !== null
          ? `${match.homeScore} - ${match.awayScore}`
          : null,
      convocatoria: match.convocatoria,
    },
    playerTotals: [...totals.values()].sort((a, b) => b.goals - a.goals || b.assists - a.assists),
  };
}

export async function listInformes(args: {
  convocatoriaId?: string;
  status?: "DRAFT" | "FINAL" | "SENT";
  limit?: number;
}) {
  const informes = await prisma.coachReport.findMany({
    where: {
      ...(args.convocatoriaId ? { convocatoriaId: args.convocatoriaId } : {}),
      ...(args.status ? { status: args.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: args.limit ?? 20,
    include: {
      createdBy: { select: { name: true } },
      convocatoria: { select: { id: true, name: true } },
    },
  });

  return informes.map((i) => ({
    id: i.id,
    convocatoria: i.convocatoria,
    createdBy: i.createdBy.name,
    createdAt: i.createdAt.toISOString(),
    status: i.status,
    wins: i.wins,
    losses: i.losses,
    draws: i.draws,
    championshipPosition: i.championshipPosition,
  }));
}

export async function getInforme(args: { informeId: string }) {
  const informe = await prisma.coachReport.findUnique({
    where: { id: args.informeId },
    include: {
      createdBy: { select: { name: true, email: true } },
      convocatoria: { select: { id: true, name: true, category: true } },
    },
  });

  if (!informe) throw new Error("Informe no encontrado");

  return {
    id: informe.id,
    convocatoria: informe.convocatoria,
    createdBy: informe.createdBy,
    createdAt: informe.createdAt.toISOString(),
    sentAt: informe.sentAt?.toISOString() ?? null,
    status: informe.status,
    wins: informe.wins,
    losses: informe.losses,
    draws: informe.draws,
    championshipObjective: informe.championshipObjective,
    championshipPosition: informe.championshipPosition,
    coachPerception: informe.coachPerception,
    sportsTopic: informe.sportsTopic,
    nonSportsTopic: informe.nonSportsTopic,
    hasAiPreview: Boolean(informe.aiPreviewHtml?.trim()),
  };
}
