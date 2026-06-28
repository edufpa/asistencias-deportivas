import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionRole, forbidden } from "@/lib/auth-session";
import { formatPlayerName } from "@/lib/player";

export async function GET() {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const links = await prisma.userPlayer.findMany({
    where: { userId: ctx.userId },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          paternalLastName: true,
          maternalLastName: true,
          birthDate: true,
          gender: true,
          photoUrl: true,
        },
      },
    },
  });

  return NextResponse.json(
    links.map((l) => ({
      id: l.player.id,
      name: formatPlayerName(l.player),
      birthDate: l.player.birthDate,
      gender: l.player.gender,
      photoUrl: l.player.photoUrl,
    }))
  );
}
