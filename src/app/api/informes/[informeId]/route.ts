import { NextResponse } from "next/server";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canViewCoachReports } from "@/lib/permissions";
import { canManageCoachReportForConvocatoria } from "@/lib/coachReportAccess";
import { getCoachReportContext } from "@/lib/coachReportContext";
import { refreshDynamicTablesInReportHtml } from "@/lib/coachReportStructuredHtml";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ informeId: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canViewCoachReports(ctx.role)) return forbidden();

  const { informeId } = await params;

  const report = await prisma.coachReport.findUnique({
    where: { id: informeId },
    include: {
      createdBy: { select: { name: true, email: true } },
      convocatoria: {
        select: {
          id: true,
          name: true,
          coachUserId: true,
          assistant1UserId: true,
          assistant2UserId: true,
          delegateUserId: true,
        },
      },
    },
  });

  if (!report) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });

  if (
    !canManageCoachReportForConvocatoria(ctx.role, ctx.userId, report.convocatoria)
  ) {
    return forbidden();
  }

  const context = await getCoachReportContext(report.convocatoria.id);
  const aiPreviewHtml = report.aiPreviewHtml
    ? refreshDynamicTablesInReportHtml(report.aiPreviewHtml, context)
    : null;

  return NextResponse.json({ ...report, aiPreviewHtml });
}
