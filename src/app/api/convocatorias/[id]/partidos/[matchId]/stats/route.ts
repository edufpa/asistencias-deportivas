import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { matchId } = await params;
  const body = await req.json();
  const { stats } = body;
  // stats: Array<{ playerId, quarter, goals, assists, recoveries, expulsions, penalties, minutesPlayed? }>

  if (!Array.isArray(stats)) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const upserts = stats.map(
    (s: {
      playerId: string;
      quarter: number;
      goals?: number;
      assists?: number;
      recoveries?: number;
      expulsions?: number;
      penalties?: number;
      minutesPlayed?: number | null;
    }) =>
      prisma.matchPlayerStat.upsert({
        where: { matchId_playerId_quarter: { matchId, playerId: s.playerId, quarter: s.quarter } },
        update: {
          goals: s.goals ?? 0,
          assists: s.assists ?? 0,
          recoveries: s.recoveries ?? 0,
          expulsions: s.expulsions ?? 0,
          penalties: s.penalties ?? 0,
          minutesPlayed: s.minutesPlayed ?? null,
        },
        create: {
          matchId,
          playerId: s.playerId,
          quarter: s.quarter,
          goals: s.goals ?? 0,
          assists: s.assists ?? 0,
          recoveries: s.recoveries ?? 0,
          expulsions: s.expulsions ?? 0,
          penalties: s.penalties ?? 0,
          minutesPlayed: s.minutesPlayed ?? null,
        },
      })
  );

  await prisma.$transaction(upserts);

  return NextResponse.json({ success: true });
}
