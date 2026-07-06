import { NextResponse } from "next/server";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canCreateCoachReport } from "@/lib/permissions";
import { assertCoachReportAccess } from "@/lib/coachReportAccess";
import { canFinalizeInforme } from "@/lib/informeStatus";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; informeId: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canCreateCoachReport(ctx.role)) return forbidden();

  const { id: convocatoriaId, informeId } = await params;
  const access = await assertCoachReportAccess(ctx.role, ctx.userId, convocatoriaId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const report = await prisma.coachReport.findFirst({
    where: { id: informeId, convocatoriaId },
  });
  if (!report) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });

  if (!canFinalizeInforme(report.status)) {
    return NextResponse.json({ error: "Solo se pueden finalizar informes en borrador" }, { status: 400 });
  }

  const updated = await prisma.coachReport.update({
    where: { id: informeId },
    data: { status: "FINAL" },
  });

  await log({
    userId: ctx.userId,
    action: "COACH_REPORT_FINALIZED",
    entity: "coach_report",
    entityId: informeId,
    detail: "Informe marcado como final",
  });

  return NextResponse.json(updated);
}
