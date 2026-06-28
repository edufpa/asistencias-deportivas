import { prisma } from "@/lib/prisma";
import { statsFromDb } from "@/lib/matchPlayerStats";

export async function loadMatchDetail(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      convocatoria: {
        select: {
          id: true,
          name: true,
          players: {
            where: { status: "ACTIVE" },
            include: {
              player: {
                select: {
                  id: true,
                  firstName: true,
                  paternalLastName: true,
                  maternalLastName: true,
                },
              },
            },
          },
        },
      },
      rosterPlayers: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              paternalLastName: true,
              maternalLastName: true,
            },
          },
        },
        orderBy: [{ player: { paternalLastName: "asc" } }, { player: { maternalLastName: "asc" } }],
      },
      createdBy: { select: { name: true } },
      playerStats: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              paternalLastName: true,
              maternalLastName: true,
            },
          },
        },
        orderBy: [{ quarter: "asc" }, { player: { paternalLastName: "asc" } }],
      },
    },
  });

  if (!match) return null;

  let rosterPlayers: {
    player: {
      id: string;
      firstName: string;
      paternalLastName: string;
      maternalLastName: string;
    };
  }[];

  if (match.convocatoria) {
    rosterPlayers = match.convocatoria.players;
  } else if (match.rosterPlayers.length > 0) {
    rosterPlayers = match.rosterPlayers.map((r) => ({ player: r.player }));
  } else {
    const allPlayers = await prisma.player.findMany({
      where: { playerStatus: "ACTIVE" },
      orderBy: [{ paternalLastName: "asc" }, { maternalLastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        paternalLastName: true,
        maternalLastName: true,
      },
    });
    rosterPlayers = allPlayers.map((player) => ({ player }));
  }

  return {
    id: match.id,
    matchDate: match.matchDate,
    matchType: match.matchType,
    opponent: match.opponent,
    location: match.location,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    quarterDuration: match.quarterDuration,
    notes: match.notes,
    evalOverall: match.evalOverall,
    evalAttack: match.evalAttack,
    evalDefense: match.evalDefense,
    evalFinishing: match.evalFinishing,
    convocatoriaId: match.convocatoriaId,
    isFriendly: !match.convocatoriaId,
    convocatoria: match.convocatoria
      ? { id: match.convocatoria.id, name: match.convocatoria.name, players: rosterPlayers }
      : { id: null, name: "Amistoso", players: rosterPlayers },
    createdBy: match.createdBy,
    playerStats: match.playerStats.map((ps) => ({
      quarter: ps.quarter,
      playerId: ps.playerId,
      player: ps.player,
      ...statsFromDb(ps),
    })),
  };
}

export type LoadedMatchDetail = NonNullable<Awaited<ReturnType<typeof loadMatchDetail>>>;
