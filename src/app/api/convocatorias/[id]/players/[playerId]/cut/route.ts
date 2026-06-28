import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { formatPlayerName } from "@/lib/player";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: convocatoriaId, playerId } = await params;
  const body = await req.json();
  const { cutReason } = body;

  if (!cutReason?.trim()) {
    return NextResponse.json({ error: "Se requiere el motivo del corte" }, { status: 400 });
  }

  const record = await prisma.convocatoriaPlayer.findUnique({
    where: { convocatoriaId_playerId: { convocatoriaId, playerId } },
  });

  if (!record) {
    return NextResponse.json({ error: "El jugador no está en esta convocatoria" }, { status: 404 });
  }

  if (record.status === "CUT") {
    return NextResponse.json({ error: "El jugador ya fue cortado" }, { status: 400 });
  }

  const updated = await prisma.convocatoriaPlayer.update({
    where: { convocatoriaId_playerId: { convocatoriaId, playerId } },
    data: {
      status: "CUT",
      cutDate: new Date(),
      cutReason,
      cutById: session.user?.id,
    },
    include: { player: true },
  });

  await log({ userId: session.user?.id ?? "", action: "PLAYER_CUT", entity: "convocatoria", entityId: convocatoriaId, detail: `Jugador "${formatPlayerName(updated.player)}" cortado. Motivo: ${cutReason}` });

  return NextResponse.json(updated);
}
