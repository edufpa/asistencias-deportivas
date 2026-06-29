import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canEditAttendance } from "@/lib/permissions";
import type { Category } from "@prisma/client";

function parseDateOnly(value: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

export async function GET(req: NextRequest) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as Category | null;

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      convocatoriaId: null,
      category: category ?? { not: null },
    },
    orderBy: [{ sessionDate: "desc" }, { sessionType: "asc" }],
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { records: true } },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canEditAttendance(ctx.role, ctx.email)) return forbidden("No tenés permiso para modificar asistencias o puntajes");

  const body = await req.json();
  const { sessionDate, sessionType, category } = body;

  if (!sessionDate || !sessionType || !category) {
    return NextResponse.json({ error: "Fecha, tipo y categoría son requeridos" }, { status: 400 });
  }

  const parsedDate = parseDateOnly(String(sessionDate));
  if (!parsedDate) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const existing = await prisma.attendanceSession.findUnique({
    where: {
      category_sessionDate_sessionType: {
        category: category as Category,
        sessionDate: parsedDate,
        sessionType,
      },
    },
  });

  if (existing) return NextResponse.json(existing);

  try {
    const attendanceSession = await prisma.attendanceSession.create({
      data: {
        category: category as Category,
        sessionDate: parsedDate,
        sessionType,
        createdById: ctx.userId,
      },
    });

    return NextResponse.json(attendanceSession, { status: 201 });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "P2002") {
      const conflict = await prisma.attendanceSession.findUnique({
        where: {
          category_sessionDate_sessionType: {
            category: category as Category,
            sessionDate: parsedDate,
            sessionType,
          },
        },
      });
      if (conflict) return NextResponse.json(conflict);
    }
    throw err;
  }
}
