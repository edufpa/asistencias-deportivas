import { NextRequest, NextResponse } from "next/server";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canManageUsers } from "@/lib/permissions";
import {
  getClubRegistrationUrl,
  regenerateClubRegistrationLink,
} from "@/lib/clubRegistrationLink";
import { buildRegistrationUrl } from "@/lib/registration";

export async function GET(req: NextRequest) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageUsers(ctx.role)) return forbidden();

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const data = await getClubRegistrationUrl(origin);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageUsers(ctx.role)) return forbidden();

  const link = await regenerateClubRegistrationLink();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  return NextResponse.json({
    token: link.token,
    url: buildRegistrationUrl(link.token, origin),
    updatedAt: link.updatedAt,
  });
}
