import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; evalId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { evalId } = await params;
  const body = await req.json();

  const evaluation = await prisma.testEvaluation.update({
    where: { id: evalId },
    data: {
      ...(body.value !== undefined && { value: body.value }),
      ...(body.evalDate !== undefined && { evalDate: new Date(body.evalDate) }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
    include: { player: { select: { firstName: true, lastName: true } }, test: { select: { name: true } } },
  });

  await log({ userId: session.user?.id ?? "", action: "EVAL_UPDATED", entity: "test", entityId: evalId, detail: `Evaluación de "${evaluation.test.name}" para ${evaluation.player.lastName} actualizada → ${evaluation.value}` });

  return NextResponse.json(evaluation);
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
    include: { player: { select: { firstName: true, lastName: true } }, test: { select: { name: true } } },
  });
  await prisma.testEvaluation.delete({ where: { id: evalId } });

  await log({ userId: session.user?.id ?? "", action: "EVAL_DELETED", entity: "test", entityId: evalId, detail: `Evaluación de "${evaluation?.test.name}" para ${evaluation?.player.lastName} eliminada` });

  return NextResponse.json({ success: true });
}
