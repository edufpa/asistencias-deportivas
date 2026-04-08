import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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
      createdById: session.user?.id ?? "",
    },
  });

  return NextResponse.json(attendanceSession, { status: 201 });
}
