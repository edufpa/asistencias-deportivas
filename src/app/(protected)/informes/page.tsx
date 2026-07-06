"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { PageShell, PageHeader, LoadingState } from "@/components/layout";
import { FileText, Plus, Eye } from "lucide-react";
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
  status: InformeStatus;
  createdAt: string;
  createdBy: { name: string };
  convocatoria: { id: string; name: string; startDate: string };
};

export default function InformesGlobalPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/informes");
      const data = await res.json();
      setReports(data.reports || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingState message="Cargando informes..." />;

  return (
    <PageShell>
      <PageHeader
        title="Informes"
        description="Listado de informes del entrenador por torneo y fecha."
        actions={
          <Link href="/informes/nuevo">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> Crear informe
            </Button>
          </Link>
        }
      />

      {reports.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aún no hay informes registrados.</p>
          <Link href="/informes/nuevo" className="inline-block mt-4">
            <Button size="sm">Crear primer informe</Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-3 bg-slate-50 border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Fecha</span>
            <span>Torneo</span>
            <span>Estado</span>
            <span className="text-right">Acción</span>
          </div>
          <div className="divide-y">
            {reports.map((r) => (
              <div
                key={r.id}
                className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center px-4 py-4"
              >
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(r.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                  </p>
                  <p className="text-xs text-muted-foreground sm:hidden">{r.convocatoria.name}</p>
                </div>
                <p className="text-sm text-slate-700 hidden sm:block">{r.convocatoria.name}</p>
                <InformeStatusBadge status={r.status} />
                <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                  <InformeFinalizeButton
                    convocatoriaId={r.convocatoria.id}
                    informeId={r.id}
                    status={r.status}
                    onFinalized={fetchData}
                  />
                  <InformePdfButton
                    convocatoriaId={r.convocatoria.id}
                    informeId={r.id}
                    status={r.status}
                  />
                  <InformeSendButton
                    convocatoriaId={r.convocatoria.id}
                    informeId={r.id}
                    status={r.status}
                    onSent={fetchData}
                  />
                  <Link href={`/informes/${r.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-3.5 w-3.5 mr-1" /> Ver informe
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
