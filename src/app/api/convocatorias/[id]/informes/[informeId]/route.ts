import { NextResponse } from "next/server";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canCreateCoachReport } from "@/lib/permissions";
import { assertCoachReportAccess } from "@/lib/coachReportAccess";
import { updateCoachReportWithAi } from "@/lib/coachReportService";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export async function GET(
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
    include: { createdBy: { select: { name: true, email: true } } },
  });

  if (!report) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });
  return NextResponse.json(report);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; informeId: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canCreateCoachReport(ctx.role)) return forbidden();

  const { id: convocatoriaId, informeId } = await params;
  const access = await assertCoachReportAccess(ctx.role, ctx.userId, convocatoriaId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json();
  const { championshipObjective, championshipPosition, coachPerception, sportsTopic, nonSportsTopic, refreshSummary } = body;

  const existing = await prisma.coachReport.findFirst({
    where: { id: informeId, convocatoriaId },
  });
  if (!existing) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });

  const report = await updateCoachReportWithAi(
    informeId,
    convocatoriaId,
    { championshipObjective, championshipPosition, coachPerception, sportsTopic, nonSportsTopic },
    { refreshSummary: !!refreshSummary }
  );

  if (!report) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });

  await log({
    userId: ctx.userId,
    action: "COACH_REPORT_UPDATED",
    entity: "coach_report",
    entityId: informeId,
    detail: "Informe actualizado",
  });

  return NextResponse.json(report);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; informeId: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canCreateCoachReport(ctx.role)) return forbidden();

  const { id: convocatoriaId, informeId } = await params;
  const access = await assertCoachReportAccess(ctx.role, ctx.userId, convocatoriaId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const existing = await prisma.coachReport.findFirst({
    where: { id: informeId, convocatoriaId },
  });
  if (!existing) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });

  await prisma.coachReport.delete({ where: { id: informeId } });

  await log({
    userId: ctx.userId,
    action: "COACH_REPORT_DELETED",
    entity: "coach_report",
    entityId: informeId,
    detail: "Informe eliminado",
  });

  return NextResponse.json({ ok: true });
}
