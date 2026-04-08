import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { matchId } = await params;
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      convocatoria: { select: { id: true, name: true, players: { include: { player: true }, where: { status: "ACTIVE" } } } },
      createdBy: { select: { name: true } },
      playerStats: {
        include: { player: { select: { id: true, firstName: true, lastName: true, club: true } } },
        orderBy: [{ quarter: "asc" }, { player: { lastName: "asc" } }],
      },
    },
  });

  if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  return NextResponse.json(match);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { matchId } = await params;
  const body = await req.json();

  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      ...(body.result !== undefined && { result: body.result }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.opponent !== undefined && { opponent: body.opponent }),
      ...(body.location !== undefined && { location: body.location }),
    },
  });

  return NextResponse.json(match);
}
