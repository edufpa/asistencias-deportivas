import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessPartidos, normalizeRole } from "@/lib/permissions";
import { undoLiveEvent } from "@/lib/matchLiveControlService";

type RouteContext = { params: Promise<{ matchId: string; eventId: string }> };

export async function DELETE(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = normalizeRole((session.user as { role?: string }).role);
  if (!canAccessPartidos(role)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { matchId, eventId } = await context.params;
  const result = await undoLiveEvent({ matchId, eventId });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, board: result.board });
}
