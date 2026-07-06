"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { PageShell, PageHeader, LoadingState } from "@/components/layout";
import { FileText, Plus, Pencil, Trash2, Eye } from "lucide-react";
import { InformeSendButton } from "@/components/convocatorias/InformeSendButton";
import { InformeFinalizeButton } from "@/components/convocatorias/InformeFinalizeButton";
import { InformePdfButton } from "@/components/convocatorias/InformePdfButton";
import { InformeStatusBadge } from "@/components/convocatorias/InformeStatusBadge";
import type { InformeStatus } from "@/lib/informeStatus";

type ReportRow = {
  id: string;
  wins: number;
  losses: number;
  draws: number;
  championshipPosition: string | null;
  status: InformeStatus;
  sentAt: string | null;
  createdAt: string;
  createdBy: { name: string };
};

export default function InformesListPage() {
  const params = useParams();
  const convocatoriaId = params.id as string;

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState({ wins: 0, losses: 0, draws: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/convocatorias/${convocatoriaId}/informes`);
      const data = await res.json();
      setReports(data.reports || []);
      setSummary(data.summary || { wins: 0, losses: 0, draws: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [convocatoriaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este informe?")) return;
    await fetch(`/api/convocatorias/${convocatoriaId}/informes/${id}`, { method: "DELETE" });
    fetchData();
  }

  if (loading) return <LoadingState message="Cargando informes..." />;

  return (
    <PageShell>
      <Link href={`/convocatorias/${convocatoriaId}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← Volver a convocatoria
      </Link>

      <PageHeader
        title="Informes del entrenador"
        description={`Resumen actual: ${summary.wins} ganados · ${summary.losses} perdidos · ${summary.draws} empates (${summary.total} partidos)`}
        actions={
          <Link href={`/convocatorias/${convocatoriaId}/informes/nuevo`}>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> Crear informe
            </Button>
          </Link>
        }
      />

      {reports.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aún no hay informes para esta convocatoria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-xl border bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {format(new Date(r.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                  </span>
                  <InformeStatusBadge status={r.status} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {r.wins}G · {r.losses}P · {r.draws}E
                  {r.championshipPosition ? ` · ${r.championshipPosition}` : ""}
                  {" · "}por {r.createdBy.name}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <InformeFinalizeButton
                  convocatoriaId={convocatoriaId}
                  informeId={r.id}
                  status={r.status}
                  onFinalized={fetchData}
                />
                <InformePdfButton convocatoriaId={convocatoriaId} informeId={r.id} status={r.status} />
                <InformeSendButton
                  convocatoriaId={convocatoriaId}
                  informeId={r.id}
                  status={r.status}
                  onSent={fetchData}
                />
                <Link href={`/informes/${r.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="h-3.5 w-3.5 mr-1" /> Ver informe
                  </Button>
                </Link>
                <Link href={`/convocatorias/${convocatoriaId}/informes/${r.id}`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                </Link>
                <Button variant="outline" size="sm" className="text-destructive border-red-200" onClick={() => handleDelete(r.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
