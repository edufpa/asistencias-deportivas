import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { differenceInYears } from "date-fns";
import { getSessionRole } from "@/lib/auth-session";
import { normalizeRole } from "@/lib/permissions";
import { stripPlayerSensitiveData } from "@/lib/playerSensitiveData";
import { PlayerDetailView } from "@/components/players/PlayerDetailView";
import { LoadingState } from "@/components/layout";

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getSessionRole();
  const role = normalizeRole(ctx?.role);

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      convocatorias: {
        include: {
          convocatoria: { select: { id: true, name: true, status: true } },
        },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  if (!player) notFound();

  const age = differenceInYears(new Date(), player.birthDate);
  const safePlayer = stripPlayerSensitiveData(player, role);

  return (
    <Suspense fallback={<LoadingState message="Cargando jugador..." />}>
      <PlayerDetailView player={safePlayer} age={age} />
    </Suspense>
  );
}
