import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canEditAttendance } from "@/lib/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: convocatoriaId } = await params;

  const sessions = await prisma.attendanceSession.findMany({
    where: { convocatoriaId },
    orderBy: [{ sessionDate: "desc" }, { sessionType: "asc" }],
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { records: true } },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canEditAttendance(ctx.role, ctx.email)) {
    return forbidden("No tenés permiso para modificar asistencias o puntajes");
  }

  const { id: convocatoriaId } = await params;
  const body = await req.json();
  const { sessionDate, sessionType } = body;

  if (!sessionDate || !sessionType) {
    return NextResponse.json({ error: "Fecha y tipo de sesión requeridos" }, { status: 400 });
  }

  const existing = await prisma.attendanceSession.findUnique({
    where: {
      convocatoriaId_sessionDate_sessionType: {
        convocatoriaId,
        sessionDate: new Date(sessionDate),
        sessionType,
      },
    },
  });

  if (existing) {
    return NextResponse.json(existing);
  }

  const attendanceSession = await prisma.attendanceSession.create({
    data: {
      convocatoriaId,
      sessionDate: new Date(sessionDate),
      sessionType,
      createdById: ctx.userId,
    },
  });

  return NextResponse.json(attendanceSession, { status: 201 });
}
