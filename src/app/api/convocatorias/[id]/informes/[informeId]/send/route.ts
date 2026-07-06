import { NextResponse } from "next/server";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canCreateCoachReport } from "@/lib/permissions";
import { sendCoachReportToComision } from "@/lib/coachReportService";
import { assertCoachReportAccess } from "@/lib/coachReportAccess";
import { canSendInformeToComision } from "@/lib/informeStatus";
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
    select: { status: true },
  });
  if (!report) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });
  if (!canSendInformeToComision(report.status)) {
    return NextResponse.json(
      { error: "El informe debe estar finalizado antes de enviar a comisión" },
      { status: 400 }
    );
  }

  const result = await sendCoachReportToComision(informeId, convocatoriaId);
  if (!result.ok) {
    if (result.error === "Informe no encontrado") {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    const emailResult = result.emailResult;
    const reason = emailResult && !emailResult.sent ? emailResult.reason : undefined;
    return NextResponse.json({
      error: reason === "email_not_configured"
        ? "El correo no está configurado (RESEND_API_KEY)"
        : reason === "no_recipients"
          ? "No hay destinatarios de comisión configurados"
          : "No se pudo enviar el correo",
    }, { status: 502 });
  }

  await log({
    userId: ctx.userId,
    action: "COACH_REPORT_SENT",
    entity: "coach_report",
    entityId: informeId,
    detail: "Informe enviado a comisión",
  });

  return NextResponse.json({ ok: true });
}
