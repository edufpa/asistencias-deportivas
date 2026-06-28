import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canManageUsers } from "@/lib/permissions";
import { syncAllPlayerUserLinks } from "@/lib/playerUserLink";
import { log } from "@/lib/logger";

export async function POST() {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageUsers(ctx.role)) return forbidden("Solo administradores");

  try {
    const result = await syncAllPlayerUserLinks(prisma, { createUserIfMissing: true });

    await log({
      userId: ctx.userId,
      action: "USER_PLAYER_LINKS_SYNC",
      entity: "user",
      detail: `Vínculos usuario-jugador: ${result.linked}/${result.players} jugadores`,
    });

    return NextResponse.json({
      ok: true,
      message: `Vinculados ${result.linked} de ${result.players} jugadores`,
      ...result,
    });
  } catch (error) {
    console.error("[link-users-players] error:", error);
    return NextResponse.json({ error: "No se pudieron vincular usuarios y jugadores" }, { status: 500 });
  }
}
