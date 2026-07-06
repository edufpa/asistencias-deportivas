import { prisma } from "@/lib/prisma";
import { hasComisionLikeRole, type AppRole } from "@/lib/permissions";

type ConvocatoriaStaff = {
  coachUserId: string | null;
  assistant1UserId: string | null;
  assistant2UserId: string | null;
  delegateUserId: string | null;
};

export function isConvocatoriaStaff(userId: string, conv: ConvocatoriaStaff): boolean {
  return (
    conv.coachUserId === userId ||
    conv.assistant1UserId === userId ||
    conv.assistant2UserId === userId ||
    conv.delegateUserId === userId
  );
}

export function canManageCoachReportForConvocatoria(
  role: AppRole,
  userId: string,
  conv: ConvocatoriaStaff
): boolean {
  if (role === "SUPER_ADMIN" || hasComisionLikeRole(role)) return true;
  if (role === "COACH") return isConvocatoriaStaff(userId, conv);
  return false;
}

export async function loadConvocatoriaStaff(convocatoriaId: string) {
  return prisma.convocatoria.findUnique({
    where: { id: convocatoriaId },
    select: {
      id: true,
      name: true,
      status: true,
      coachUserId: true,
      assistant1UserId: true,
      assistant2UserId: true,
      delegateUserId: true,
    },
  });
}

export async function assertCoachReportAccess(
  role: AppRole,
  userId: string,
  convocatoriaId: string
) {
  const conv = await loadConvocatoriaStaff(convocatoriaId);
  if (!conv) return { ok: false as const, error: "Convocatoria no encontrada", status: 404 };
  if (!canManageCoachReportForConvocatoria(role, userId, conv)) {
    return { ok: false as const, error: "No autorizado para esta convocatoria", status: 403 };
  }
  return { ok: true as const, conv };
}

/** Convocatorias sin informe enviado, filtradas por rol del usuario. */
export async function listPendingConvocatoriasForReports(role: AppRole, userId: string) {
  const all = await prisma.convocatoria.findMany({
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      coachUserId: true,
      assistant1UserId: true,
      assistant2UserId: true,
      delegateUserId: true,
      coachReports: { select: { id: true, status: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return all
    .filter((c) => {
      const hasSent = c.coachReports.some((r) => r.status === "SENT");
      if (hasSent) return false;
      if (role === "SUPER_ADMIN" || hasComisionLikeRole(role)) return true;
      if (role === "COACH") return isConvocatoriaStaff(userId, c);
      return false;
    })
    .map(({ coachReports: _reports, ...rest }) => rest);
}
