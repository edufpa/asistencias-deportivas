import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: playerId } = await params;
  const { searchParams } = new URL(req.url);
  const convocatoriaId = searchParams.get("convocatoriaId");

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, firstName: true, lastName: true, documentId: true, club: true },
  });
  if (!player) return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });

  // Get all attendance records for this player
  const records = await prisma.attendanceRecord.findMany({
    where: {
      playerId,
      session: convocatoriaId ? { convocatoriaId } : undefined,
    },
    include: {
      session: {
        include: {
          convocatoria: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { session: { sessionDate: "desc" } },
  });

  // Group by date
  const byDate = new Map<string, typeof records>();
  for (const r of records) {
    const dateKey = r.session.sessionDate.toISOString().split("T")[0];
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey)!.push(r);
  }

  const days = Array.from(byDate.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, recs]) => ({
      date,
      sessions: recs.map((r) => ({
        sessionId: r.sessionId,
        sessionType: r.session.sessionType,
        convocatoria: r.session.convocatoria,
        status: r.status,
        performanceScore: r.performanceScore,
        absenceReason: r.absenceReason,
      })),
    }));

  // Summary stats
  const attended = records.filter((r) => r.status === "ATTENDED").length;
  const justif = records.filter((r) => r.status === "ABSENT_JUSTIFIED").length;
  const unjustif = records.filter((r) => r.status === "ABSENT_UNJUSTIFIED").length;
  const total = records.length;
  const scores = records
    .filter((r) => r.status === "ATTENDED" && r.performanceScore)
    .map((r) => r.performanceScore as number);
  const avgScore =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

  return NextResponse.json({
    player,
    summary: { attended, justif, unjustif, total, avgScore },
    days,
  });
}
