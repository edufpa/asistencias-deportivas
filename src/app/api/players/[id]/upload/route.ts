import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { playerImageDbField, savePlayerImage, type PlayerImageKind } from "@/lib/playerUpload";
import { getSessionRole, forbidden, parentCanAccessPlayer } from "@/lib/auth-session";
import { canEditPlayers } from "@/lib/permissions";
import { stripPlayerSensitiveData } from "@/lib/playerSensitiveData";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const exists = await prisma.player.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });

  if (
    ctx.role === "PARENT" &&
    !(await parentCanAccessPlayer(ctx.userId, ctx.role, id))
  ) {
    return forbidden("No tenés acceso a este jugador");
  }
  if (!canEditPlayers(ctx.role) && ctx.role !== "PARENT") {
    return forbidden("No tenés permiso para subir archivos de este jugador");
  }

  const formData = await req.formData();
  const kind = String(formData.get("kind") ?? "");
  const file = formData.get("file");

  const validKinds = ["photo", "documentFront", "documentBack"];
  if (!validKinds.includes(kind)) {
    return NextResponse.json({ error: "Tipo de imagen inválido" }, { status: 400 });
  }
  if (!canEditPlayers(ctx.role) && (kind === "documentFront" || kind === "documentBack")) {
    return forbidden("No tenés permiso para subir documentos");
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Seleccioná una imagen" }, { status: 400 });
  }

  try {
    const url = await savePlayerImage(id, kind as PlayerImageKind, file);
    const field = playerImageDbField(kind as PlayerImageKind);
    const player = await prisma.player.update({
      where: { id },
      data: { [field]: url },
    });
    return NextResponse.json({ url, player: stripPlayerSensitiveData(player, ctx.role) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al subir imagen";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
