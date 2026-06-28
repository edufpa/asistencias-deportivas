import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  emptyMatchPlayerStats,
  hasAnyMatchStat,
  statsToDbPayload,
  type MatchPlayerStats,
} from "@/lib/matchPlayerStats";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { matchId } = await params;
  const body = await req.json();
  const { stats } = body;

  if (!Array.isArray(stats)) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    for (const s of stats as ({
      playerId: string;
      quarter: number;
      minutesPlayed?: number | null;
    } & Partial<MatchPlayerStats>)[]) {
      const values = statsToDbPayload({ ...emptyMatchPlayerStats(), ...s });
      if (!hasAnyMatchStat(values)) continue;
      await tx.matchPlayerStat.upsert({
        where: { matchId_playerId_quarter: { matchId, playerId: s.playerId, quarter: s.quarter } },
        update: { ...values, minutesPlayed: s.minutesPlayed ?? null },
        create: {
          matchId,
          playerId: s.playerId,
          quarter: s.quarter,
          ...values,
          minutesPlayed: s.minutesPlayed ?? null,
        },
      });
    }
  });

  return NextResponse.json({ success: true });
}
