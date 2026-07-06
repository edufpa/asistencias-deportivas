import { NextResponse } from "next/server";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canCreateCoachReport } from "@/lib/permissions";
import { loadCoachReportForPdf } from "@/lib/coachReportService";
import { canDownloadInformePdf } from "@/lib/informeStatus";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; informeId: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canCreateCoachReport(ctx.role)) return forbidden();

  const { id: convocatoriaId, informeId } = await params;

  const loaded = await loadCoachReportForPdf(informeId, convocatoriaId);
  if (!loaded) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });

  if (!canDownloadInformePdf(loaded.report.status)) {
    return NextResponse.json(
      { error: "El PDF solo está disponible para informes finalizados o enviados" },
      { status: 403 }
    );
  }

  const filename = `informe-${loaded.report.convocatoria.name.replace(/\s+/g, "-").slice(0, 40)}.pdf`;

  return new NextResponse(Buffer.from(loaded.pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
