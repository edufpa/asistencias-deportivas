import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      convocatorias: {
        include: { convocatoria: { select: { id: true, name: true, status: true } } },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  if (!player) return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });

  return NextResponse.json(player);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { firstName, lastName, documentId, club, birthDate } = body;

  if (!firstName || !lastName || !documentId || !birthDate) {
    return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
  }

  const existing = await prisma.player.findFirst({
    where: { documentId, NOT: { id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Ya existe otro jugador con ese documento" }, { status: 409 });
  }

  const player = await prisma.player.update({
    where: { id },
    data: { firstName, lastName, documentId, club: club ?? null, birthDate: new Date(birthDate) },
  });

  await log({ userId: session.user?.id ?? "", action: "PLAYER_UPDATED", entity: "player", entityId: id, detail: `Jugador "${lastName}, ${firstName}" editado` });

  return NextResponse.json(player);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const player = await prisma.player.findUnique({ where: { id }, select: { firstName: true, lastName: true } });
  await prisma.player.delete({ where: { id } });

  await log({ userId: session.user?.id ?? "", action: "PLAYER_DELETED", entity: "player", entityId: id, detail: `Jugador "${player?.lastName}, ${player?.firstName}" eliminado` });

  return NextResponse.json({ success: true });
}
