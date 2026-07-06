import { NextResponse } from "next/server";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canAccessInformes } from "@/lib/permissions";
import { listAllCoachReports } from "@/lib/coachReportService";

export async function GET() {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canAccessInformes(ctx.role)) return forbidden();

  const reports = await listAllCoachReports(ctx.role, ctx.userId);
  return NextResponse.json({ reports });
}
