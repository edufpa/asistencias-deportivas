import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { formatPlayerName } from "@/lib/player";
import { parseDateOnlyForDb, isFutureDateOnly, toDateOnlyString } from "@/lib/sessionDate";
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

  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { name: true, unit: true },
  });

  if (test && recordedById) {
    const playerIds = [...new Set(evaluations.map((e: { playerId: string }) => e.playerId))];
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, firstName: true, paternalLastName: true, maternalLastName: true },
    });
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const dateLabel = toDateOnlyString(String(evaluations[0]?.evalDate)) ?? "";

    await log({
      userId: recordedById,
      action: "EVAL_CREATED",
      entity: "test",
      entityId: testId,
      detail: `"${test.name}" — ${evaluations.length} marca(s) registrada(s) el ${dateLabel} (${playerIds
        .slice(0, 3)
        .map((id) => {
          const p = playerMap.get(id);
          return p ? formatPlayerName(p) : id;
        })
        .join(", ")}${playerIds.length > 3 ? "…" : ""})`,
    });
  }

  return NextResponse.json({ saved: evaluations.length }, { status: 201 });
}
