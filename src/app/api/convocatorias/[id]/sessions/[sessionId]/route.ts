import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canEditAttendance } from "@/lib/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { sessionId } = await params;

  const attendanceSession = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      createdBy: { select: { name: true } },
      records: {
        include: { player: true },
        orderBy: [{ player: { paternalLastName: "asc" } }],
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
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canEditAttendance(ctx.role, ctx.email)) {
    return forbidden("No tenés permiso para modificar asistencias o puntajes");
  }

  const { sessionId } = await params;
  await prisma.attendanceSession.delete({ where: { id: sessionId } });

  return NextResponse.json({ success: true });
}
