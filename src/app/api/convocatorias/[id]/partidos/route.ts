import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: convocatoriaId } = await params;
  const matches = await prisma.match.findMany({
    where: { convocatoriaId },
    orderBy: { matchDate: "desc" },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { playerStats: true } },
    },
  });

  return NextResponse.json(matches);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: convocatoriaId } = await params;
  const body = await req.json();
  const {
    matchDate, matchType, opponent, location,
    homeScore, awayScore, quarterDuration, notes,
    evalOverall, evalAttack, evalDefense, evalFinishing,
  } = body;

  if (!matchDate || !matchType) {
    return NextResponse.json({ error: "Fecha y tipo son requeridos" }, { status: 400 });
  }

  const match = await prisma.match.create({
    data: {
      convocatoriaId,
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
    },
  });

  return NextResponse.json(match, { status: 201 });
}
