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

  const convocatoria = await prisma.convocatoria.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
      players: {
        include: {
          player: true,
          cutBy: { select: { name: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      sessions: {
        orderBy: [{ sessionDate: "desc" }, { sessionType: "asc" }],
        include: {
          _count: { select: { records: true } },
        },
      },
    },
  });

  if (!convocatoria)
    return NextResponse.json({ error: "Convocatoria no encontrada" }, { status: 404 });

  return NextResponse.json(convocatoria);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, description, gender, status } = body;

  const convocatoria = await prisma.convocatoria.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(gender && { gender }),
      ...(status && { status }),
    },
  });

  await log({ userId: session.user?.id ?? "", action: "CONV_UPDATED", entity: "convocatoria", entityId: id, detail: `Convocatoria "${convocatoria.name}" actualizada` });

  return NextResponse.json(convocatoria);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const conv = await prisma.convocatoria.findUnique({ where: { id }, select: { name: true } });
  await prisma.convocatoria.delete({ where: { id } });

  await log({ userId: session.user?.id ?? "", action: "CONV_DELETED", entity: "convocatoria", entityId: id, detail: `Convocatoria "${conv?.name}" eliminada` });

  return NextResponse.json({ success: true });
}
