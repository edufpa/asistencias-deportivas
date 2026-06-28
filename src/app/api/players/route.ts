import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { formatPlayerName } from "@/lib/player";
import { parsePlayerBody } from "@/lib/parsePlayerBody";
import { getSessionRole, forbidden, getLinkedPlayerIds } from "@/lib/auth-session";
import { canCreatePlayers, canAccessPlayersList } from "@/lib/permissions";
import { stripPlayersSensitiveData } from "@/lib/playerSensitiveData";

export async function GET(req: NextRequest) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canAccessPlayersList(ctx.role) && ctx.role !== "PARENT") {
    return forbidden();
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const includeConvocatorias = searchParams.get("includeConvocatorias") === "true";
  const linkedIds =
    ctx.role === "PARENT" ? await getLinkedPlayerIds(ctx.userId, ctx.role) : null;

  if (ctx.role === "PARENT" && linkedIds && linkedIds.length === 0) {
    return NextResponse.json([]);
  }

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
    include: includeConvocatorias
      ? {
          convocatorias: {
            where: { status: "ACTIVE" },
            include: { convocatoria: { select: { id: true, name: true } } },
          },
        }
      : undefined,
  });

  return NextResponse.json(stripPlayersSensitiveData(players, ctx.role));
}

export async function POST(req: NextRequest) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canCreatePlayers(ctx.role)) return forbidden("Solo Comisión puede crear jugadores");

  const parsed = parsePlayerBody(await req.json());
  if ("error" in parsed && parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { data } = parsed;
  const existing = await prisma.player.findUnique({ where: { documentId: data.documentId } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe un jugador con ese documento" }, { status: 409 });
  }

  const player = await prisma.player.create({ data });

  await log({
    userId: ctx.userId,
    action: "PLAYER_CREATED",
    entity: "player",
    entityId: player.id,
    detail: `Jugador "${formatPlayerName(player)}" creado (${data.documentType}: ${data.documentId})`,
  });

  return NextResponse.json(player, { status: 201 });
}
