import { NextResponse } from "next/server";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canCreateCoachReport } from "@/lib/permissions";
import { assertCoachReportAccess } from "@/lib/coachReportAccess";
import { createCoachReport, sendCoachReportToComision } from "@/lib/coachReportService";
import { getConvocatoriaMatchSummary } from "@/lib/coachReportSummary";
import { getCoachReportContext } from "@/lib/coachReportContext";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canCreateCoachReport(ctx.role)) return forbidden();

  const { id: convocatoriaId } = await params;
  const access = await assertCoachReportAccess(ctx.role, ctx.userId, convocatoriaId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const [reports, summary, context] = await Promise.all([
    prisma.coachReport.findMany({
      where: { convocatoriaId },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    }),
    getConvocatoriaMatchSummary(convocatoriaId),
    getCoachReportContext(convocatoriaId),
  ]);

  return NextResponse.json({
    reports,
    summary,
    convocatoriaName: access.conv.name,
    contextMeta: {
      convocados: context.convocados.length,
      partidos: context.matches.length,
      conEstadisticas: context.playerStats.length,
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canCreateCoachReport(ctx.role)) return forbidden();

  const { id: convocatoriaId } = await params;
  const access = await assertCoachReportAccess(ctx.role, ctx.userId, convocatoriaId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json();
  const { championshipObjective, championshipPosition, coachPerception, sportsTopic, nonSportsTopic, sendToComision } = body;

  const report = await createCoachReport(convocatoriaId, ctx.userId, {
    championshipObjective,
    championshipPosition,
    coachPerception,
    sportsTopic,
    nonSportsTopic,
  });

  await log({
    userId: ctx.userId,
    action: "COACH_REPORT_CREATED",
    entity: "coach_report",
    entityId: report.id,
    detail: `Informe creado para ${access.conv.name}`,
  });

  if (sendToComision) {
    const sendResult = await sendCoachReportToComision(report.id, convocatoriaId);
    if (!sendResult.ok) {
      return NextResponse.json({
        report,
        warning: sendResult.emailResult && !sendResult.emailResult.sent && sendResult.emailResult.reason === "email_not_configured"
          ? "Informe guardado pero el correo no está configurado"
          : "Informe guardado pero no se pudo enviar el correo",
      }, { status: 201 });
    }
  }

  const updated = sendToComision
    ? await prisma.coachReport.findUnique({
        where: { id: report.id },
        include: { createdBy: { select: { name: true } }, convocatoria: { select: { id: true, name: true } } },
      })
    : report;

  return NextResponse.json(updated, { status: 201 });
}
