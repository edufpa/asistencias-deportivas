import { hasComisionLikeRole, type AppRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { buildCoachReportPdfFromHtml } from "@/lib/coachReportPdf";
import { sendCoachReportEmail } from "@/lib/email";
import { getConvocatoriaMatchSummary } from "@/lib/coachReportSummary";
import { getCoachReportContext } from "@/lib/coachReportContext";
import { generateFullCoachReportHtml } from "@/lib/coachReportAi";
import { buildStructuredReportHtml, refreshDynamicTablesInReportHtml } from "@/lib/coachReportStructuredHtml";

export async function getCommissionEmails(): Promise<string[]> {
  const override = process.env.COMISION_REPORT_EMAIL?.trim();
  if (override) return override.split(",").map((e) => e.trim()).filter(Boolean);

  const users = await prisma.user.findMany({
    where: {
      accountStatus: "APPROVED",
      role: { in: ["COMISION", "DELEGADO", "SUPER_ADMIN"] },
    },
    select: { email: true },
  });
  return users.map((u) => u.email);
}

type ReportFields = {
  wins: number;
  losses: number;
  draws: number;
  championshipObjective?: number | null;
  championshipPosition?: string | null;
  coachPerception?: string | null;
  sportsTopic?: string | null;
  nonSportsTopic?: string | null;
};

async function buildAiPreview(
  convocatoriaId: string,
  convocatoriaName: string,
  coachName: string,
  data: ReportFields,
  reportDate: Date = new Date()
): Promise<string | null> {
  try {
    const context = await getCoachReportContext(convocatoriaId);
    return await generateFullCoachReportHtml({
      convocatoriaName,
      coachName,
      reportDate,
      wins: data.wins,
      losses: data.losses,
      draws: data.draws,
      championshipObjective: data.championshipObjective,
      championshipPosition: data.championshipPosition,
      coachPerception: data.coachPerception,
      sportsTopic: data.sportsTopic,
      nonSportsTopic: data.nonSportsTopic,
      context,
    });
  } catch (err) {
    console.error("[coachReport] AI preview failed:", err);
    try {
      const context = await getCoachReportContext(convocatoriaId);
      return buildStructuredReportHtml(
        {
          convocatoriaName,
          coachName,
          reportDate,
          ...data,
        },
        context
      );
    } catch {
      return null;
    }
  }
}

export async function loadCoachReportForPdf(informeId: string, convocatoriaId: string) {
  const [report, context] = await Promise.all([
    prisma.coachReport.findFirst({
      where: { id: informeId, convocatoriaId },
      include: {
        convocatoria: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    }),
    getCoachReportContext(convocatoriaId),
  ]);
  if (!report) return null;

  let htmlForPdf = report.aiPreviewHtml;
  if (!htmlForPdf?.trim()) {
    htmlForPdf = buildStructuredReportHtml(
      {
        convocatoriaName: report.convocatoria.name,
        coachName: report.createdBy.name,
        reportDate: report.createdAt,
        wins: report.wins,
        losses: report.losses,
        draws: report.draws,
        championshipObjective: report.championshipObjective,
        championshipPosition: report.championshipPosition,
        coachPerception: report.coachPerception,
        sportsTopic: report.sportsTopic,
        nonSportsTopic: report.nonSportsTopic,
      },
      context
    );
  } else {
    htmlForPdf = refreshDynamicTablesInReportHtml(htmlForPdf, context);
  }

  const pdfBytes = await buildCoachReportPdfFromHtml(htmlForPdf);

  return { report, pdfBytes };
}

export async function sendCoachReportToComision(informeId: string, convocatoriaId: string) {
  const loaded = await loadCoachReportForPdf(informeId, convocatoriaId);
  if (!loaded) return { ok: false as const, error: "Informe no encontrado" };

  const { report, pdfBytes } = loaded;
  const recipients = await getCommissionEmails();
  const subject = `Informe del entrenador — ${report.convocatoria.name}`;
  const previewBlock = report.aiPreviewHtml
    ? `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">${report.aiPreviewHtml}</div>`
    : "";
  const html = `
    <p>Se adjunta el informe del entrenador para la convocatoria <strong>${report.convocatoria.name}</strong>.</p>
    <p><strong>Resumen:</strong> ${report.wins} ganados, ${report.losses} perdidos, ${report.draws} empates.</p>
    ${previewBlock}
    <p style="color:#64748b;font-size:12px;">Regatas Lima — Asistencias Deportivas</p>
  `.trim();

  const filename = `informe-${report.convocatoria.name.replace(/\s+/g, "-").slice(0, 40)}.pdf`;
  const result = await sendCoachReportEmail(recipients, subject, html, pdfBytes, filename);

  if (result.sent) {
    await prisma.coachReport.update({
      where: { id: informeId },
      data: { status: "SENT", sentAt: new Date() },
    });
  }

  return { ok: result.sent, emailResult: result };
}

function parseObjective(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function createCoachReport(
  convocatoriaId: string,
  userId: string,
  data: {
    championshipObjective?: number | string | null;
    championshipPosition?: string;
    coachPerception?: string;
    sportsTopic?: string;
    nonSportsTopic?: string;
  },
  opts?: { skipAi?: boolean }
) {
  const [summary, conv, user] = await Promise.all([
    getConvocatoriaMatchSummary(convocatoriaId),
    prisma.convocatoria.findUnique({ where: { id: convocatoriaId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);

  const fields: ReportFields = {
    wins: summary.wins,
    losses: summary.losses,
    draws: summary.draws,
    championshipObjective: parseObjective(data.championshipObjective),
    championshipPosition: data.championshipPosition?.trim() || null,
    coachPerception: data.coachPerception?.trim() || null,
    sportsTopic: data.sportsTopic?.trim() || null,
    nonSportsTopic: data.nonSportsTopic?.trim() || null,
  };

  let aiPreviewHtml: string | null = null;
  if (!opts?.skipAi && conv && user) {
    aiPreviewHtml = await buildAiPreview(convocatoriaId, conv.name, user.name, fields, new Date());
  }

  return prisma.coachReport.create({
    data: {
      convocatoriaId,
      createdById: userId,
      ...fields,
      aiPreviewHtml,
    },
    include: {
      createdBy: { select: { name: true, email: true } },
      convocatoria: { select: { id: true, name: true } },
    },
  });
}

export async function updateCoachReportWithAi(
  informeId: string,
  convocatoriaId: string,
  data: {
    championshipObjective?: number | string | null;
    championshipPosition?: string;
    coachPerception?: string;
    sportsTopic?: string;
    nonSportsTopic?: string;
  },
  opts?: { skipAi?: boolean; refreshSummary?: boolean }
) {
  if (opts?.refreshSummary) {
    await refreshCoachReportMatchSummary(informeId, convocatoriaId);
  }

  const existing = await prisma.coachReport.findFirst({
    where: { id: informeId, convocatoriaId },
    include: {
      convocatoria: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!existing) return null;

  const fresh = opts?.refreshSummary
    ? await prisma.coachReport.findUnique({ where: { id: informeId } })
    : existing;

  const fields: ReportFields = {
    wins: fresh?.wins ?? existing.wins,
    losses: fresh?.losses ?? existing.losses,
    draws: fresh?.draws ?? existing.draws,
    championshipObjective:
      data.championshipObjective !== undefined
        ? parseObjective(data.championshipObjective)
        : existing.championshipObjective,
    championshipPosition:
      data.championshipPosition !== undefined
        ? data.championshipPosition?.trim() || null
        : existing.championshipPosition,
    coachPerception:
      data.coachPerception !== undefined
        ? data.coachPerception?.trim() || null
        : existing.coachPerception,
    sportsTopic:
      data.sportsTopic !== undefined ? data.sportsTopic?.trim() || null : existing.sportsTopic,
    nonSportsTopic:
      data.nonSportsTopic !== undefined
        ? data.nonSportsTopic?.trim() || null
        : existing.nonSportsTopic,
  };

  let aiPreviewHtml = existing.aiPreviewHtml;
  if (!opts?.skipAi) {
    aiPreviewHtml = await buildAiPreview(
      convocatoriaId,
      existing.convocatoria.name,
      existing.createdBy.name,
      fields,
      new Date()
    );
  }

  return prisma.coachReport.update({
    where: { id: informeId },
    data: {
      ...fields,
      aiPreviewHtml,
      status: "DRAFT",
      sentAt: null,
    },
    include: {
      createdBy: { select: { name: true, email: true } },
      convocatoria: { select: { id: true, name: true } },
    },
  });
}

export async function refreshCoachReportMatchSummary(informeId: string, convocatoriaId: string) {
  const summary = await getConvocatoriaMatchSummary(convocatoriaId);
  return prisma.coachReport.update({
    where: { id: informeId },
    data: { wins: summary.wins, losses: summary.losses, draws: summary.draws },
  });
}

export async function listAllCoachReports(role: AppRole, userId: string) {
  const where =
    role === "SUPER_ADMIN" || hasComisionLikeRole(role)
      ? {}
      : {
          convocatoria: {
            OR: [
              { coachUserId: userId },
              { assistant1UserId: userId },
              { assistant2UserId: userId },
              { delegateUserId: userId },
            ],
          },
        };

  return prisma.coachReport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      convocatoria: { select: { id: true, name: true, startDate: true } },
    },
  });
}

export async function previewCoachReportHtml(
  convocatoriaId: string,
  convocatoriaName: string,
  coachName: string,
  data: {
    championshipObjective?: number | string | null;
    championshipPosition?: string | null;
    coachPerception?: string | null;
    sportsTopic?: string | null;
    nonSportsTopic?: string | null;
    wins?: number;
    losses?: number;
    draws?: number;
  }
) {
  const [summary, context] = await Promise.all([
    getConvocatoriaMatchSummary(convocatoriaId),
    getCoachReportContext(convocatoriaId),
  ]);

  const fields: ReportFields = {
    wins: data.wins ?? summary.wins,
    losses: data.losses ?? summary.losses,
    draws: data.draws ?? summary.draws,
    championshipObjective: parseObjective(data.championshipObjective),
    championshipPosition: data.championshipPosition?.trim() || null,
    coachPerception: data.coachPerception?.trim() || null,
    sportsTopic: data.sportsTopic?.trim() || null,
    nonSportsTopic: data.nonSportsTopic?.trim() || null,
  };

  const html = await buildAiPreview(convocatoriaId, convocatoriaName, coachName, fields, new Date());
  return { html, summary, context };
}
