"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { PageShell, PageHeader, LoadingState } from "@/components/layout";
import { CoachReportAiPreview } from "@/components/convocatorias/CoachReportAiPreview";
import { InformeStatusBadge } from "@/components/convocatorias/InformeStatusBadge";
import { InformePdfButton } from "@/components/convocatorias/InformePdfButton";
import { InformeSendButton } from "@/components/convocatorias/InformeSendButton";
import { InformeFinalizeButton } from "@/components/convocatorias/InformeFinalizeButton";
import { Pencil } from "lucide-react";
import type { InformeStatus } from "@/lib/informeStatus";

type ReportDetail = {
  id: string;
  wins: number;
  losses: number;
  draws: number;
  championshipPosition: string | null;
  coachPerception: string | null;
  sportsTopic: string | null;
  nonSportsTopic: string | null;
  aiPreviewHtml: string | null;
  status: InformeStatus;
  createdAt: string;
  createdBy: { name: string };
  convocatoria: { id: string; name: string };
};

export default function VerInformePage() {
  const params = useParams();
  const informeId = params.informeId as string;

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/informes/${informeId}`);
      const data = await res.json();
      if (res.ok) {
        setReport(data);
      } else {
        setError(data.error || "No se pudo cargar el informe");
      }
    } finally {
      setLoading(false);
    }
  }, [informeId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) return <LoadingState message="Cargando informe..." />;
  if (error || !report) {
    return (
      <PageShell width="sm">
        <p className="text-destructive text-sm">{error || "Informe no encontrado"}</p>
        <Link href="/informes" className="text-sm text-muted-foreground hover:text-foreground mt-4 inline-block">
          ← Volver a informes
        </Link>
      </PageShell>
    );
  }

  const convocatoriaId = report.convocatoria.id;

  return (
    <PageShell>
      <Link href="/informes" className="text-sm text-muted-foreground hover:text-foreground">
        ← Informes
      </Link>

      <PageHeader
        title={report.convocatoria.name}
        description={`${format(new Date(report.createdAt), "d MMMM yyyy, HH:mm", { locale: es })} · por ${report.createdBy.name}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <InformeStatusBadge status={report.status} />
            <InformeFinalizeButton
              convocatoriaId={convocatoriaId}
              informeId={informeId}
              status={report.status}
              onFinalized={fetchReport}
            />
            <InformePdfButton convocatoriaId={convocatoriaId} informeId={informeId} status={report.status} />
            <InformeSendButton
              convocatoriaId={convocatoriaId}
              informeId={informeId}
              status={report.status}
              onSent={fetchReport}
            />
            <Link href={`/convocatorias/${convocatoriaId}/informes/${informeId}`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
              </Button>
            </Link>
          </div>
        }
      />

      <div className="rounded-xl border bg-slate-50 p-4 text-sm mb-6">
        <span className="text-green-700 font-semibold">{report.wins}</span> ganados ·{" "}
        <span className="text-red-600 font-semibold">{report.losses}</span> perdidos ·{" "}
        <span className="text-amber-600 font-semibold">{report.draws}</span> empates
      </div>

      <CoachReportAiPreview html={report.aiPreviewHtml} />
    </PageShell>
  );
}
