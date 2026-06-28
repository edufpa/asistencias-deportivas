import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { formatPlayerName } from "@/lib/player";
import { parseDateOnlyForDb, isFutureDateOnly } from "@/lib/sessionDate";
import { serializeEvaluation } from "@/lib/serializeEvaluation";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; evalId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { evalId } = await params;
  const body = await req.json();

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
      test: { select: { name: true } },
    },
  });

  await log({
    userId: session.user?.id ?? "",
    action: "EVAL_UPDATED",
    entity: "test",
    entityId: evalId,
    detail: `Evaluación de "${evaluation.test.name}" para ${formatPlayerName(evaluation.player)} actualizada → ${evaluation.value}`,
  });

  return NextResponse.json(serializeEvaluation(evaluation));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; evalId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { evalId } = await params;
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
    entityId: evalId,
    detail: `Evaluación de "${evaluation?.test.name}" para ${evaluation ? formatPlayerName(evaluation.player) : evalId} eliminada`,
  });

  return NextResponse.json({ success: true });
}
