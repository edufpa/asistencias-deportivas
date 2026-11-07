import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessPartidos, normalizeRole } from "@/lib/permissions";
import { getBlueWhiteBoard } from "@/lib/matchLiveControlService";

type RouteContext = { params: Promise<{ matchId: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = normalizeRole((session.user as { role?: string }).role);
  if (!canAccessPartidos(role)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { matchId } = await context.params;
  const data = await getBlueWhiteBoard(matchId);
  if (!data) {
    return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  return NextResponse.json(data);
}
