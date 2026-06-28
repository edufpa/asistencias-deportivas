import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionRole, forbidden, parentCanAccessPlayer } from "@/lib/auth-session";
import { getCategoryTestAverages } from "@/lib/categoryComparison";
import { toDateOnlyString } from "@/lib/sessionDate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: playerId } = await params;

  if (!(await parentCanAccessPlayer(ctx.userId, ctx.role, playerId))) {
    return forbidden("No tenés acceso a este jugador");
  }

  const evaluations = await prisma.testEvaluation.findMany({
    where: { playerId },
    orderBy: [{ test: { name: "asc" } }, { evalDate: "asc" }],
    include: {
      test: { select: { id: true, name: true, unit: true, higherIsBetter: true, category: true } },
      recordedBy: { select: { name: true } },
    },
  });

  // Group by test
  const byTest = new Map<string, {
    testId: string; testName: string; unit: string; higherIsBetter: boolean; category: string;
    evaluations: { id: string; value: number; evalDate: string; notes: string | null; recordedBy: string }[];
  }>();

  for (const ev of evaluations) {
    if (!byTest.has(ev.test.id)) {
      byTest.set(ev.test.id, {
        testId: ev.test.id, testName: ev.test.name,
        unit: ev.test.unit, higherIsBetter: ev.test.higherIsBetter,
        category: ev.test.category,
        evaluations: [],
      });
    }
    byTest.get(ev.test.id)!.evaluations.push({
      id: ev.id, value: ev.value,
      evalDate: toDateOnlyString(ev.evalDate) ?? ev.evalDate.toISOString().slice(0, 10),
      notes: ev.notes,
      recordedBy: ev.recordedBy.name,
    });
  }

  const categoryAverages = await getCategoryTestAverages(playerId);

  return NextResponse.json(
    Array.from(byTest.values()).map((t) => ({
      ...t,
      categoryAvg: categoryAverages.get(t.testId) ?? null,
    }))
  );
}
