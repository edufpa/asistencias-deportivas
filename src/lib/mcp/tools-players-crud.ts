import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { formatPlayerName, getBirthYear, getPlayerCategory } from "@/lib/player";
import { parsePlayerBody } from "@/lib/parsePlayerBody";
import { linkPlayerToUserAccount } from "@/lib/playerUserLink";
import { stripPlayerSensitiveData, stripPlayersSensitiveData } from "@/lib/playerSensitiveData";
import type { McpAuthContext } from "@/lib/mcp/oauth";
import {
  assertCanCreatePlayer,
  assertCanDeletePlayer,
  assertCanEditPlayer,
  assertCanListPlayers,
  mcpForbidden,
} from "@/lib/mcp/authz";

async function getLinkedPlayerIds(userId: string): Promise<string[]> {
  const links = await prisma.userPlayer.findMany({
    where: { userId },
    select: { playerId: true },
  });
  return links.map((l) => l.playerId);
}

function summarizePlayer(p: {
  id: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  documentId: string;
  documentType: string;
  birthDate: Date;
  gender: string;
  playerStatus: string;
  membershipStatus: string;
}) {
  return {
    id: p.id,
    name: formatPlayerName(p),
    documentId: p.documentId,
    documentType: p.documentType,
    gender: p.gender,
    playerStatus: p.playerStatus,
    membershipStatus: p.membershipStatus,
    birthDate: p.birthDate.toISOString().split("T")[0],
    category: getPlayerCategory(getBirthYear(p.birthDate)),
  };
}

export async function listPlayers(
  ctx: McpAuthContext,
  args: { search?: string; includeConvocatorias?: boolean; limit?: number }
) {
  assertCanListPlayers(ctx);

  const linkedIds = ctx.role === "PARENT" ? await getLinkedPlayerIds(ctx.userId) : null;
  if (ctx.role === "PARENT" && linkedIds && linkedIds.length === 0) return [];

  const search = args.search?.trim();
  const players = await prisma.player.findMany({
    where: {
      AND: [
        linkedIds ? { id: { in: linkedIds } } : {},
        search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { paternalLastName: { contains: search, mode: "insensitive" } },
                { maternalLastName: { contains: search, mode: "insensitive" } },
                { documentId: { contains: search, mode: "insensitive" } },
                { membershipCardNumber: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    orderBy: [{ paternalLastName: "asc" }, { firstName: "asc" }],
    take: args.limit ?? 100,
    include: args.includeConvocatorias
      ? {
          convocatorias: {
            where: { status: "ACTIVE" },
            include: { convocatoria: { select: { id: true, name: true } } },
          },
        }
      : undefined,
  });

  return stripPlayersSensitiveData(players, ctx.role).map((p) => ({
    ...summarizePlayer(p),
    convocatorias: args.includeConvocatorias
      ? (
          p as typeof p & {
            convocatorias?: Array<{
              capNumber: number | null;
              convocatoria: { id: string; name: string };
            }>;
          }
        ).convocatorias?.map((cp) => ({
          id: cp.convocatoria.id,
          name: cp.convocatoria.name,
          capNumber: cp.capNumber,
        }))
      : undefined,
  }));
}

export async function getPlayerDetail(ctx: McpAuthContext, args: { playerId: string }) {
  assertCanListPlayers(ctx);

  if (ctx.role === "PARENT") {
    const linked = await getLinkedPlayerIds(ctx.userId);
    if (!linked.includes(args.playerId)) mcpForbidden("No podés ver este jugador");
  }

  const player = await prisma.player.findUnique({
    where: { id: args.playerId },
    include: {
      convocatorias: {
        include: { convocatoria: { select: { id: true, name: true, status: true, category: true } } },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  if (!player) throw new Error("Jugador no encontrado");

  const safe = stripPlayerSensitiveData(player, ctx.role);
  return {
    ...safe,
    birthDate: player.birthDate.toISOString().split("T")[0],
    teamJoinDate: player.teamJoinDate?.toISOString().split("T")[0] ?? null,
    name: formatPlayerName(player),
    category: getPlayerCategory(getBirthYear(player.birthDate)),
    convocatorias: player.convocatorias.map((cp) => ({
      id: cp.convocatoria.id,
      name: cp.convocatoria.name,
      status: cp.convocatoria.status,
      category: cp.convocatoria.category,
      capNumber: cp.capNumber,
      playerStatus: cp.status,
    })),
  };
}

export async function createPlayer(ctx: McpAuthContext, args: Record<string, unknown>) {
  assertCanCreatePlayer(ctx);

  const parsed = parsePlayerBody(args);
  if ("error" in parsed && parsed.error) throw new Error(parsed.error);

  const existing = await prisma.player.findUnique({
    where: { documentId: parsed.data.documentId },
  });
  if (existing) throw new Error("Ya existe un jugador con ese documento");

  const player = await prisma.player.create({ data: parsed.data });
  await linkPlayerToUserAccount(prisma, player, { createUserIfMissing: true });

  await log({
    userId: ctx.userId,
    action: "PLAYER_CREATED",
    entity: "player",
    entityId: player.id,
    detail: `Jugador "${formatPlayerName(player)}" creado vía MCP`,
  });

  return stripPlayerSensitiveData(player, ctx.role);
}

export async function updatePlayer(
  ctx: McpAuthContext,
  args: { playerId: string } & Record<string, unknown>
) {
  assertCanEditPlayer(ctx);

  const { playerId, ...body } = args;
  const parsed = parsePlayerBody(body);
  if ("error" in parsed && parsed.error) throw new Error(parsed.error);

  const existingDoc = await prisma.player.findFirst({
    where: { documentId: parsed.data.documentId, NOT: { id: playerId } },
  });
  if (existingDoc) throw new Error("Ya existe otro jugador con ese documento");

  const player = await prisma.player.update({ where: { id: playerId }, data: parsed.data });

  await log({
    userId: ctx.userId,
    action: "PLAYER_UPDATED",
    entity: "player",
    entityId: playerId,
    detail: `Jugador "${formatPlayerName(player)}" editado vía MCP`,
  });

  return stripPlayerSensitiveData(player, ctx.role);
}

export async function deletePlayer(ctx: McpAuthContext, args: { playerId: string }) {
  assertCanDeletePlayer(ctx);

  const player = await prisma.player.findUnique({
    where: { id: args.playerId },
    select: { firstName: true, paternalLastName: true, maternalLastName: true },
  });
  if (!player) throw new Error("Jugador no encontrado");

  await prisma.player.delete({ where: { id: args.playerId } });

  await log({
    userId: ctx.userId,
    action: "PLAYER_DELETED",
    entity: "player",
    entityId: args.playerId,
    detail: `Jugador "${formatPlayerName(player)}" eliminado vía MCP`,
  });

  return { ok: true, deletedId: args.playerId, name: formatPlayerName(player) };
}
