import { prisma } from "@/lib/prisma";

export async function log(params: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  detail?: string;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        detail: params.detail ?? null,
      },
    });
  } catch {
    // Logging should never break the main flow
  }
}
