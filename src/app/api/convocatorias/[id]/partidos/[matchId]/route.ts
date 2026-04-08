import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";

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
      convocatoria: {
        select: {
          id: true, name: true,
          players: { where: { status: "ACTIVE" }, include: { player: true } },
        },
      },
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
      ...(body.matchDate !== undefined && { matchDate: new Date(body.matchDate) }),
      ...(body.matchType !== undefined && { matchType: body.matchType }),
      ...(body.opponent !== undefined && { opponent: body.opponent }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.homeScore !== undefined && { homeScore: body.homeScore }),
      ...(body.awayScore !== undefined && { awayScore: body.awayScore }),
      ...(body.quarterDuration !== undefined && { quarterDuration: body.quarterDuration }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.evalOverall !== undefined && { evalOverall: body.evalOverall }),
      ...(body.evalAttack !== undefined && { evalAttack: body.evalAttack }),
      ...(body.evalDefense !== undefined && { evalDefense: body.evalDefense }),
      ...(body.evalFinishing !== undefined && { evalFinishing: body.evalFinishing }),
    },
  });

  await log({ userId: session.user?.id ?? "", action: "MATCH_UPDATED", entity: "match", entityId: matchId, detail: "Partido actualizado" });
  return NextResponse.json(match);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { matchId } = await params;
  const match = await prisma.match.findUnique({ where: { id: matchId }, select: { opponent: true } });
  await prisma.match.delete({ where: { id: matchId } });
  await log({ userId: session.user?.id ?? "", action: "MATCH_DELETED", entity: "match", entityId: matchId, detail: `Partido vs "${match?.opponent ?? "Sin rival"}" eliminado` });
  return NextResponse.json({ success: true });
}
