import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: testId } = await params;
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("playerId");

  const evaluations = await prisma.testEvaluation.findMany({
    where: {
      testId,
      ...(playerId ? { playerId } : {}),
    },
    include: {
      player: { select: { id: true, firstName: true, lastName: true, club: true } },
      recordedBy: { select: { name: true } },
    },
    orderBy: [{ evalDate: "asc" }, { player: { lastName: "asc" } }],
  });

  return NextResponse.json(evaluations);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: testId } = await params;
  const body = await req.json();
  const { evaluations } = body;
  // evaluations: Array<{ playerId, value, evalDate, notes? }>

  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return NextResponse.json({ error: "Sin evaluaciones" }, { status: 400 });
  }

  const recordedById = session.user?.id ?? "";

  const upserts = evaluations.map((e: { playerId: string; value: number; evalDate: string; notes?: string }) =>
    prisma.testEvaluation.create({
      data: {
        testId,
        playerId: e.playerId,
        value: e.value,
        evalDate: new Date(e.evalDate),
        notes: e.notes ?? null,
        recordedById,
      },
    })
  );

  await prisma.$transaction(upserts);

  return NextResponse.json({ saved: evaluations.length }, { status: 201 });
}
