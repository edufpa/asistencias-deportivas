import { NextResponse } from "next/server";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canCreateCoachReport } from "@/lib/permissions";
import { listPendingConvocatoriasForReports } from "@/lib/coachReportAccess";

export async function GET() {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canCreateCoachReport(ctx.role)) return forbidden();

  const pending = await listPendingConvocatoriasForReports(ctx.role, ctx.userId);
  return NextResponse.json({ pending });
}
