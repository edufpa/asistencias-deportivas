"use client";

import { use } from "react";
import { PageShell } from "@/components/layout";
import { MatchLiveControlBoard } from "@/components/matches/MatchLiveControlBoard";
import { useAppRole } from "@/hooks/useAppRole";
import { canAccessPartidos } from "@/lib/permissions";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ControlPartidoDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const role = useAppRole();

  if (!canAccessPartidos(role)) {
    return (
      <PageShell>
        <Alert variant="destructive">
          <AlertDescription>No tenés permiso para esta sección.</AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <MatchLiveControlBoard matchId={matchId} />
    </PageShell>
  );
}
