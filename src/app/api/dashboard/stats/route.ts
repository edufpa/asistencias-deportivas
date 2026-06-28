import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [totalPlayers, activeConvocatorias, totalConvocatorias, recentCuts] =
    await Promise.all([
      prisma.player.count(),
      prisma.convocatoria.count({ where: { status: "ACTIVE" } }),
      prisma.convocatoria.count(),
      prisma.convocatoriaPlayer.findMany({
        where: { status: "CUT" },
        orderBy: { cutDate: "desc" },
        take: 5,
        include: {
          player: { select: { firstName: true, paternalLastName: true, maternalLastName: true } },
          convocatoria: { select: { name: true } },
          cutBy: { select: { name: true } },
        },
      }),
    ]);

  return NextResponse.json({
    totalPlayers,
    activeConvocatorias,
    totalConvocatorias,
    recentCuts,
  });
}
