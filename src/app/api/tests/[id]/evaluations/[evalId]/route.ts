import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { formatPlayerName } from "@/lib/player";
import { formatTestValue } from "@/lib/testTimeFormat";
import { parseDateOnlyForDb, isFutureDateOnly, toDateOnlyString } from "@/lib/sessionDate";
import { serializeEvaluation } from "@/lib/serializeEvaluation";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; evalId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: testId, evalId } = await params;
  const body = await req.json();

  const existing = await prisma.testEvaluation.findUnique({
    where: { id: evalId },
    include: {
      player: { select: { firstName: true, paternalLastName: true, maternalLastName: true } },
      test: { select: { name: true, unit: true } },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
  }

  if (body.evalDate !== undefined) {
    const dateStr = String(body.evalDate);
    if (isFutureDateOnly(dateStr)) {
      return NextResponse.json(
        { error: "La fecha de evaluación no puede ser futura" },
        { status: 400 }
      );
    }
    const parsed = parseDateOnlyForDb(dateStr);
    if (!parsed) {
      return NextResponse.json({ error: "Fecha de evaluación inválida" }, { status: 400 });
    }
  }

  const evaluation = await prisma.testEvaluation.update({
    where: { id: evalId },
    data: {
      ...(body.value !== undefined && { value: body.value }),
      ...(body.evalDate !== undefined && {
        evalDate: parseDateOnlyForDb(String(body.evalDate))!,
      }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
    include: {
      player: { select: { firstName: true, paternalLastName: true, maternalLastName: true } },
      test: { select: { name: true, unit: true } },
    },
  });

  await log({
    userId: session.user?.id ?? "",
    action: "EVAL_UPDATED",
    entity: "test",
    entityId: testId,
    detail: [
      `"${evaluation.test.name}" — ${formatPlayerName(evaluation.player)}:`,
      body.value !== undefined
        ? `marca ${formatTestValue(existing.value, existing.test.unit)} → ${formatTestValue(evaluation.value, evaluation.test.unit)}`
        : null,
      body.evalDate !== undefined
        ? `fecha ${toDateOnlyString(existing.evalDate) ?? "?"} → ${toDateOnlyString(evaluation.evalDate) ?? "?"}`
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
  });

  return NextResponse.json(serializeEvaluation(evaluation));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; evalId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: testId, evalId } = await params;
  const evaluation = await prisma.testEvaluation.findUnique({
    where: { id: evalId },
    include: {
      player: { select: { firstName: true, paternalLastName: true, maternalLastName: true } },
      test: { select: { name: true } },
    },
  });
  await prisma.testEvaluation.delete({ where: { id: evalId } });

  await log({
    userId: session.user?.id ?? "",
    action: "EVAL_DELETED",
    entity: "test",
    entityId: testId,
    detail: `Evaluación de "${evaluation?.test.name}" para ${evaluation ? formatPlayerName(evaluation.player) : evalId} eliminada`,
  });

  return NextResponse.json({ success: true });
}
