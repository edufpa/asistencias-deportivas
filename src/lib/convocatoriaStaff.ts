import { prisma } from "@/lib/prisma";

export async function resolveStaffUserId(
  userId: unknown
): Promise<{ id: string | null } | { error: string }> {
  if (userId === null || userId === undefined || userId === "") {
    return { id: null };
  }

  const id = String(userId);
  const user = await prisma.user.findFirst({
    where: { id, accountStatus: "APPROVED", role: { not: "PARENT" } },
    select: { id: true },
  });

  if (!user) {
    return { error: "El usuario seleccionado no existe o no puede ser asignado al cuerpo técnico" };
  }

  return { id: user.id };
}

export function parseCapNumber(value: unknown): number | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 15) return "invalid";
  return n;
}
