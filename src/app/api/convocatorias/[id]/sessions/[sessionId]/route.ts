import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { sessionId } = await params;

  const attendanceSession = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      createdBy: { select: { name: true } },
      records: {
        include: { player: true },
        orderBy: [{ player: { lastName: "asc" } }],
      },
    },
  });

  if (!attendanceSession)
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

  return NextResponse.json(attendanceSession);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { sessionId } = await params;
  await prisma.attendanceSession.delete({ where: { id: sessionId } });

  return NextResponse.json({ success: true });
}
