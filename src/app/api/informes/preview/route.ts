import { NextResponse } from "next/server";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canCreateCoachReport } from "@/lib/permissions";
import { assertCoachReportAccess } from "@/lib/coachReportAccess";
import { previewCoachReportHtml } from "@/lib/coachReportService";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canCreateCoachReport(ctx.role)) return forbidden();

  const body = await request.json();
  const {
    convocatoriaId,
    championshipObjective,
    championshipPosition,
    coachPerception,
    sportsTopic,
    nonSportsTopic,
    wins: winsOverride,
    losses: lossesOverride,
    draws: drawsOverride,
  } = body;

  if (!convocatoriaId) {
    return NextResponse.json({ error: "convocatoriaId requerido" }, { status: 400 });
  }

  const access = await assertCoachReportAccess(ctx.role, ctx.userId, convocatoriaId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true } });

  try {
    const result = await previewCoachReportHtml(convocatoriaId, access.conv.name, user?.name ?? "Entrenador", {
      championshipObjective,
      championshipPosition,
      coachPerception,
      sportsTopic,
      nonSportsTopic,
      wins: winsOverride,
      losses: lossesOverride,
      draws: drawsOverride,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al generar vista previa";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
