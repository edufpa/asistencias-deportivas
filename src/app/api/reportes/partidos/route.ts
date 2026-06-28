import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { formatPlayerName } from "@/lib/player";
import { statsFromDb, emptyMatchPlayerStats } from "@/lib/matchPlayerStats";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const convocatoriaId = searchParams.get("convocatoriaId");
  const matchType = searchParams.get("matchType"); // ALL | OFFICIAL | PRACTICE
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Record<string, unknown> = {};
  if (convocatoriaId) where.convocatoriaId = convocatoriaId;
  if (matchType && matchType !== "ALL") where.matchType = matchType;
  if (dateFrom || dateTo) {
    where.matchDate = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
    };
  }

  const matches = await prisma.match.findMany({
    where,
    orderBy: { matchDate: "desc" },
    include: {
      convocatoria: { select: { name: true } },
      createdBy: { select: { name: true } },
      playerStats: {
        include: { player: { select: { id: true, firstName: true, paternalLastName: true, maternalLastName: true } } },
      },
    },
  });

  // Build per-match summary
  const matchSummaries = matches.map((m) => {
    const statsByPlayer = new Map<string, ReturnType<typeof emptyMatchPlayerStats> & { name: string }>();
    for (const ps of m.playerStats) {
      const key = ps.playerId;
      if (!statsByPlayer.has(key)) {
        statsByPlayer.set(key, { name: formatPlayerName(ps.player), ...emptyMatchPlayerStats() });
      }
      const s = statsByPlayer.get(key)!;
      const row = statsFromDb(ps);
      for (const k of Object.keys(row) as (keyof typeof row)[]) {
        s[k] += row[k];
      }
    }

    const playerList = Array.from(statsByPlayer.entries()).map(([id, s]) => ({ id, ...s }));
    const topScorer = playerList.sort((a, b) => b.goals - a.goals)[0];
    const totalGoals = playerList.reduce((sum, p) => sum + p.goals, 0);

    return {
      id: m.id,
      matchDate: m.matchDate,
      matchType: m.matchType,
      opponent: m.opponent,
      location: m.location,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      quarterDuration: m.quarterDuration,
      evalOverall: m.evalOverall,
      evalAttack: m.evalAttack,
      evalDefense: m.evalDefense,
      evalFinishing: m.evalFinishing,
      notes: m.notes,
      convocatoriaId: m.convocatoriaId,
      convocatoriaName: m.convocatoria?.name ?? "Amistoso",
      createdBy: m.createdBy.name,
      totalGoals,
      topScorer: topScorer?.goals > 0 ? { name: topScorer.name, goals: topScorer.goals } : null,
      playerCount: statsByPlayer.size,
    };
  });

  // Aggregated team eval averages
  const withEvals = matches.filter((m) => m.evalOverall);
  const avgEvals =
    withEvals.length > 0
      ? {
          overall: Math.round((withEvals.reduce((s, m) => s + (m.evalOverall ?? 0), 0) / withEvals.length) * 10) / 10,
          attack: Math.round((withEvals.reduce((s, m) => s + (m.evalAttack ?? 0), 0) / withEvals.length) * 10) / 10,
          defense: Math.round((withEvals.reduce((s, m) => s + (m.evalDefense ?? 0), 0) / withEvals.length) * 10) / 10,
          finishing: Math.round((withEvals.reduce((s, m) => s + (m.evalFinishing ?? 0), 0) / withEvals.length) * 10) / 10,
        }
      : null;

  const totalGoals = matchSummaries.reduce((s, m) => s + m.totalGoals, 0);
  const wins = matchSummaries.filter((m) => m.homeScore !== null && m.awayScore !== null && m.homeScore > m.awayScore).length;
  const losses = matchSummaries.filter((m) => m.homeScore !== null && m.awayScore !== null && m.homeScore < m.awayScore).length;
  const draws = matchSummaries.filter((m) => m.homeScore !== null && m.awayScore !== null && m.homeScore === m.awayScore).length;

  return NextResponse.json({
    matches: matchSummaries,
    summary: {
      total: matches.length,
      official: matches.filter((m) => m.matchType === "OFFICIAL").length,
      practice: matches.filter((m) => m.matchType === "PRACTICE").length,
      wins, losses, draws, totalGoals, avgEvals,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const {
    convocatoriaId,
    matchDate,
    matchType,
    opponent,
    location,
    homeScore,
    awayScore,
    quarterDuration,
    notes,
    evalOverall,
    evalAttack,
    evalDefense,
    evalFinishing,
    playerIds,
  } = body;

  if (!matchDate || !matchType) {
    return NextResponse.json({ error: "Fecha y tipo son requeridos" }, { status: 400 });
  }

  if (convocatoriaId) {
    const conv = await prisma.convocatoria.findUnique({
      where: { id: convocatoriaId },
      select: { status: true },
    });
    if (!conv) return NextResponse.json({ error: "Convocatoria no encontrada" }, { status: 404 });
    if (conv.status !== "ACTIVE") {
      return NextResponse.json({ error: "Solo se pueden crear partidos en convocatorias activas" }, { status: 400 });
    }
  } else {
    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json({ error: "Seleccioná al menos un jugador para el plantel" }, { status: 400 });
    }
  }

  try {
    const match = await prisma.match.create({
      data: {
        matchDate: new Date(matchDate),
        matchType,
        opponent: opponent ?? null,
        location: location ?? null,
        homeScore: homeScore ?? null,
        awayScore: awayScore ?? null,
        quarterDuration: quarterDuration ?? null,
        notes: notes ?? null,
        evalOverall: evalOverall ?? null,
        evalAttack: evalAttack ?? null,
        evalDefense: evalDefense ?? null,
        evalFinishing: evalFinishing ?? null,
        createdById: session.user?.id ?? "",
        ...(convocatoriaId
          ? { convocatoriaId }
          : { rosterPlayers: { create: playerIds.map((playerId: string) => ({ playerId })) } }),
      },
    });

    await log({
      userId: session.user?.id ?? "",
      action: "MATCH_CREATED",
      entity: "match",
      entityId: match.id,
      detail: convocatoriaId
        ? `Partido vs "${opponent ?? "Sin rival"}" en convocatoria ${convocatoriaId}`
        : `Partido amistoso vs "${opponent ?? "Sin rival"}" creado`,
    });

    return NextResponse.json(match, { status: 201 });
  } catch (err) {
    console.error("Error creando partido:", err);
    return NextResponse.json({ error: "No se pudo crear el partido. Revisá la conexión e intentá de nuevo." }, { status: 500 });
  }
}
