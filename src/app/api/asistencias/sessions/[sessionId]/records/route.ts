import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canEditAttendance } from "@/lib/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { sessionId } = await params;

  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId },
    include: { player: true },
    orderBy: [{ player: { paternalLastName: "asc" } }],
  });

  return NextResponse.json(records);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!canEditAttendance(ctx.role, ctx.email)) return forbidden("No tenés permiso para modificar asistencias o puntajes");

  const { sessionId } = await params;
  const body = await req.json();
  const { records, clearPlayerIds } = body;

  if (!Array.isArray(records)) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const upserts = records.map(
    (r: {
      playerId: string;
      status: string;
      performanceScore?: number | null;
      absenceReason?: string | null;
    }) => ({
      playerId: r.playerId,
      status: r.status as "ATTENDED" | "ABSENT_JUSTIFIED" | "ABSENT_UNJUSTIFIED",
      performanceScore: r.status === "ATTENDED" ? (r.performanceScore ?? null) : null,
      absenceReason: r.status === "ABSENT_JUSTIFIED" ? (r.absenceReason ?? null) : null,
    })
  );

  await prisma.$transaction(async (tx) => {
    for (const r of upserts) {
      await tx.attendanceRecord.upsert({
        where: { sessionId_playerId: { sessionId, playerId: r.playerId } },
        update: {
          status: r.status,
          performanceScore: r.performanceScore,
          absenceReason: r.absenceReason,
        },
        create: {
          sessionId,
          playerId: r.playerId,
          status: r.status,
          performanceScore: r.performanceScore,
          absenceReason: r.absenceReason,
        },
      });
    }

    if (Array.isArray(clearPlayerIds) && clearPlayerIds.length > 0) {
      await tx.attendanceRecord.deleteMany({
        where: { sessionId, playerId: { in: clearPlayerIds } },
      });
    }
  });

  return NextResponse.json({ success: true });
}
