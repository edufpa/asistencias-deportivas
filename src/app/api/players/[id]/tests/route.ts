import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: playerId } = await params;

  const evaluations = await prisma.testEvaluation.findMany({
    where: { playerId },
    orderBy: [{ test: { name: "asc" } }, { evalDate: "asc" }],
    include: {
      test: { select: { id: true, name: true, unit: true, higherIsBetter: true } },
      recordedBy: { select: { name: true } },
    },
  });

  // Group by test
  const byTest = new Map<string, {
    testId: string; testName: string; unit: string; higherIsBetter: boolean;
    evaluations: { id: string; value: number; evalDate: string; notes: string | null; recordedBy: string }[];
  }>();

  for (const ev of evaluations) {
    if (!byTest.has(ev.test.id)) {
      byTest.set(ev.test.id, {
        testId: ev.test.id, testName: ev.test.name,
        unit: ev.test.unit, higherIsBetter: ev.test.higherIsBetter,
        evaluations: [],
      });
    }
    byTest.get(ev.test.id)!.evaluations.push({
      id: ev.id, value: ev.value,
      evalDate: ev.evalDate.toISOString(),
      notes: ev.notes,
      recordedBy: ev.recordedBy.name,
    });
  }

  return NextResponse.json(Array.from(byTest.values()));
}
