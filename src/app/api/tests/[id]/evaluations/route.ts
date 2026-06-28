import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateOnlyForDb, isFutureDateOnly } from "@/lib/sessionDate";
import { serializeEvaluations, serializeEvaluation } from "@/lib/serializeEvaluation";

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
      player: { select: { id: true, firstName: true, paternalLastName: true, maternalLastName: true } },
      recordedBy: { select: { name: true } },
    },
    orderBy: [{ evalDate: "asc" }, { player: { paternalLastName: "asc" } }],
  });

  return NextResponse.json(serializeEvaluations(evaluations));
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

  for (const e of evaluations) {
    if (!e.evalDate || isFutureDateOnly(String(e.evalDate))) {
      return NextResponse.json(
        { error: "La fecha de evaluación no puede ser futura" },
        { status: 400 }
      );
    }
    const parsed = parseDateOnlyForDb(String(e.evalDate));
    if (!parsed) {
      return NextResponse.json({ error: "Fecha de evaluación inválida" }, { status: 400 });
    }
  }

  const upserts = evaluations.map((e: { playerId: string; value: number; evalDate: string; notes?: string }) =>
    prisma.testEvaluation.create({
      data: {
        testId,
        playerId: e.playerId,
        value: e.value,
        evalDate: parseDateOnlyForDb(String(e.evalDate))!,
        notes: e.notes ?? null,
        recordedById,
      },
    })
  );

  await prisma.$transaction(upserts);

  return NextResponse.json({ saved: evaluations.length }, { status: 201 });
}
