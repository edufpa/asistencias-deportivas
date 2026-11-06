import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessPartidos, normalizeRole } from "@/lib/permissions";
import {
  createBlueWhiteMatch,
  listBlueWhiteMatches,
} from "@/lib/matchLiveControlService";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = normalizeRole((session.user as { role?: string }).role);
  if (!canAccessPartidos(role)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const matches = await listBlueWhiteMatches();
  return NextResponse.json({ matches });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = normalizeRole((session.user as { role?: string }).role);
  if (!canAccessPartidos(role)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const match = await createBlueWhiteMatch({
    userId: session.user.id,
    matchDate: typeof body.matchDate === "string" ? body.matchDate : undefined,
    location: typeof body.location === "string" ? body.location : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
  });

  return NextResponse.json(match, { status: 201 });
}
