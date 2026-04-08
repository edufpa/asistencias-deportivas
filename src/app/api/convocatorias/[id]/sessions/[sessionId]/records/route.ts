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

  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId },
    include: { player: true },
    orderBy: [{ player: { lastName: "asc" } }],
  });

  return NextResponse.json(records);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { sessionId } = await params;
  const body = await req.json();

  // records: Array<{ playerId, status, performanceScore?, absenceReason? }>
  const { records } = body;

  if (!Array.isArray(records)) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const upserts = records.map(
    (r: {
      playerId: string;
      status: string;
      performanceScore?: number | null;
      absenceReason?: string | null;
    }) =>
      prisma.attendanceRecord.upsert({
        where: { sessionId_playerId: { sessionId, playerId: r.playerId } },
        update: {
          status: r.status as "ATTENDED" | "ABSENT_JUSTIFIED" | "ABSENT_UNJUSTIFIED",
          performanceScore:
            r.status === "ATTENDED" ? (r.performanceScore ?? null) : null,
          absenceReason:
            r.status === "ABSENT_JUSTIFIED" ? (r.absenceReason ?? null) : null,
        },
        create: {
          sessionId,
          playerId: r.playerId,
          status: r.status as "ATTENDED" | "ABSENT_JUSTIFIED" | "ABSENT_UNJUSTIFIED",
          performanceScore:
            r.status === "ATTENDED" ? (r.performanceScore ?? null) : null,
          absenceReason:
            r.status === "ABSENT_JUSTIFIED" ? (r.absenceReason ?? null) : null,
        },
      })
  );

  await prisma.$transaction(upserts);

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { sessionId } = await params;
  const body = await req.json();
  const { playerId } = body;

  await prisma.attendanceRecord.delete({
    where: { sessionId_playerId: { sessionId, playerId } },
  });

  return NextResponse.json({ success: true });
}
