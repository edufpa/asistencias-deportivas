import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessPartidos, normalizeRole } from "@/lib/permissions";
import { addLiveEvent } from "@/lib/matchLiveControlService";

type RouteContext = { params: Promise<{ matchId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = normalizeRole((session.user as { role?: string }).role);
  if (!canAccessPartidos(role)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { matchId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const result = await addLiveEvent({
    matchId,
    userId: session.user.id,
    team: body.team,
    capNumber: body.capNumber,
    eventType: body.eventType,
    quarter: body.quarter,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, board: result.board });
}
