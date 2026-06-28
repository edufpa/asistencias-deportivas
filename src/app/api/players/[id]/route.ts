import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { formatPlayerName } from "@/lib/player";
import { parsePlayerBody } from "@/lib/parsePlayerBody";
import { getSessionRole, forbidden, getLinkedPlayerIds } from "@/lib/auth-session";
import { canEditPlayers, canDeletePlayers } from "@/lib/permissions";
import { stripPlayerSensitiveData } from "@/lib/playerSensitiveData";

async function assertParentAccess(userId: string, playerId: string) {
  const linked = await getLinkedPlayerIds(userId, "PARENT");
  return linked?.includes(playerId) ?? false;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  if (ctx.role === "PARENT" && !(await assertParentAccess(ctx.userId, id))) {
    return forbidden("No podés ver este jugador");
  }

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      convocatorias: {
        include: { convocatoria: { select: { id: true, name: true, status: true } } },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  if (!player) return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
  return NextResponse.json(stripPlayerSensitiveData(player, ctx.role));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canEditPlayers(ctx.role)) return forbidden("Los entrenadores no pueden editar jugadores");

  const { id } = await params;
  const parsed = parsePlayerBody(await req.json());
  if ("error" in parsed && parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { data } = parsed;
  const existing = await prisma.player.findFirst({
    where: { documentId: data.documentId, NOT: { id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Ya existe otro jugador con ese documento" }, { status: 409 });
  }

  const player = await prisma.player.update({ where: { id }, data });

  await log({
    userId: ctx.userId,
    action: "PLAYER_UPDATED",
    entity: "player",
    entityId: id,
    detail: `Jugador "${formatPlayerName(player)}" editado`,
  });

  return NextResponse.json(player);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canDeletePlayers(ctx.role)) return forbidden("Solo Comisión puede eliminar jugadores");

  const { id } = await params;
  const player = await prisma.player.findUnique({
    where: { id },
    select: { firstName: true, paternalLastName: true, maternalLastName: true },
  });
  await prisma.player.delete({ where: { id } });

  await log({
    userId: ctx.userId,
    action: "PLAYER_DELETED",
    entity: "player",
    entityId: id,
    detail: `Jugador "${player ? formatPlayerName(player) : id}" eliminado`,
  });

  return NextResponse.json({ success: true });
}
