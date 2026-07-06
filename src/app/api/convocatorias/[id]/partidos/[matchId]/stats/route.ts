import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveMatchPlayerStats, type StatSaveRow } from "@/lib/matchStatsSave";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { matchId } = await params;
  const body = await req.json();
  const { stats } = body;

  if (!Array.isArray(stats)) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const result = await saveMatchPlayerStats(matchId, stats as StatSaveRow[]);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true });
}
