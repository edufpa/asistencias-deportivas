"use client";

import { useParams } from "next/navigation";
import { MatchDetailContent } from "@/components/matches/MatchDetailContent";

export default function ConvocatoriaMatchDetailPage() {
  const { id: convocatoriaId, matchId } = useParams<{ id: string; matchId: string }>();

  return (
    <MatchDetailContent
      matchId={matchId}
      backHref={`/convocatorias/${convocatoriaId}/partidos`}
      backLabel="← Partidos"
      deleteRedirectHref={`/convocatorias/${convocatoriaId}/partidos`}
    />
  );
}
