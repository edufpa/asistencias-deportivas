import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionRole, forbidden, parentCanAccessPlayer } from "@/lib/auth-session";
import { parsePlayerSelfBody } from "@/lib/parsePlayerSelfBody";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (ctx.role !== "PARENT") return forbidden("Solo el jugador puede editar su ficha desde aquí");

  const { id } = await params;
  if (!(await parentCanAccessPlayer(ctx.userId, ctx.role, id))) {
    return forbidden("No tenés acceso a este jugador");
  }

  const parsed = parsePlayerSelfBody(await req.json());
  if ("error" in parsed && parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const player = await prisma.player.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(player);
}
