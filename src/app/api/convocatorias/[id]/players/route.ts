import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: convocatoriaId } = await params;
  const body = await req.json();
  const { playerIds } = body;

  if (!Array.isArray(playerIds) || playerIds.length === 0) {
    return NextResponse.json({ error: "Se deben seleccionar jugadores" }, { status: 400 });
  }

  const existing = await prisma.convocatoriaPlayer.findMany({
    where: { convocatoriaId, playerId: { in: playerIds } },
    select: { playerId: true },
  });
  const existingIds = new Set(existing.map((e) => e.playerId));
  const newIds = playerIds.filter((id: string) => !existingIds.has(id));

  if (newIds.length > 0) {
    await prisma.convocatoriaPlayer.createMany({
      data: newIds.map((playerId: string) => ({ convocatoriaId, playerId })),
    });
  }

  return NextResponse.json({ added: newIds.length }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: convocatoriaId } = await params;
  const body = await req.json();
  const { playerId } = body;

  await prisma.convocatoriaPlayer.delete({
    where: { convocatoriaId_playerId: { convocatoriaId, playerId } },
  });

  return NextResponse.json({ success: true });
}
