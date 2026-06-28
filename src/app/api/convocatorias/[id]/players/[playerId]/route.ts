import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { canAccessTorneos } from "@/lib/permissions";
import { parseCapNumber } from "@/lib/convocatoriaStaff";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canAccessTorneos(ctx.role)) return forbidden();

  const { id: convocatoriaId, playerId } = await params;
  const body = await req.json();

  if (body.capNumber === undefined) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const capNumber = parseCapNumber(body.capNumber);
  if (capNumber === "invalid") {
    return NextResponse.json({ error: "El gorro debe ser un número del 1 al 15" }, { status: 400 });
  }

  const entry = await prisma.convocatoriaPlayer.findUnique({
    where: { convocatoriaId_playerId: { convocatoriaId, playerId } },
  });

  if (!entry) {
    return NextResponse.json({ error: "Jugador no encontrado en la convocatoria" }, { status: 404 });
  }

  if (capNumber !== null) {
    const conflict = await prisma.convocatoriaPlayer.findFirst({
      where: {
        convocatoriaId,
        capNumber,
        status: "ACTIVE",
        NOT: { playerId },
      },
    });
    if (conflict) {
      return NextResponse.json(
        { error: `El gorro ${capNumber} ya está asignado a otro jugador` },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.convocatoriaPlayer.update({
    where: { convocatoriaId_playerId: { convocatoriaId, playerId } },
    data: { capNumber },
    include: { player: true },
  });

  return NextResponse.json(updated);
}
