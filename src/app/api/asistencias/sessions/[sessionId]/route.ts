import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canEditAttendance } from "@/lib/permissions";
import type { SessionType } from "@prisma/client";

function parseDateOnly(value: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canEditAttendance(ctx.role, ctx.email)) {
    return forbidden("No tenés permiso para modificar asistencias o puntajes");
  }

  const { sessionId } = await params;
  const body = await req.json();
  const { sessionDate, sessionType } = body as {
    sessionDate?: string;
    sessionType?: SessionType;
  };

  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.convocatoriaId || !session.category) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  let nextDate = session.sessionDate;
  if (sessionDate) {
    const parsed = parseDateOnly(sessionDate);
    if (!parsed) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }
    nextDate = parsed;
  }

  const nextType = sessionType ?? session.sessionType;

  const dateChanged =
    nextDate.toISOString().split("T")[0] !== session.sessionDate.toISOString().split("T")[0];
  const typeChanged = nextType !== session.sessionType;

  if (dateChanged || typeChanged) {
    const conflict = await prisma.attendanceSession.findUnique({
      where: {
        category_sessionDate_sessionType: {
          category: session.category,
          sessionDate: nextDate,
          sessionType: nextType,
        },
      },
    });

    if (conflict && conflict.id !== sessionId) {
      return NextResponse.json(
        { error: "Ya existe una sesión para esa categoría, fecha y turno" },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.attendanceSession.update({
    where: { id: sessionId },
    data: {
      sessionDate: nextDate,
      sessionType: nextType,
    },
  });

  return NextResponse.json(updated);
}
