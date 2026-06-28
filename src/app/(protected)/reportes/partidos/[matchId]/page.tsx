"use client";

import { useParams } from "next/navigation";
import { MatchDetailContent } from "@/components/matches/MatchDetailContent";

export default function ReporteMatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>();

  return (
    <MatchDetailContent
      matchId={matchId}
      backHref="/reportes/partidos"
      backLabel="← Reporte de Partidos"
      deleteRedirectHref="/reportes/partidos"
    />
  );
}
