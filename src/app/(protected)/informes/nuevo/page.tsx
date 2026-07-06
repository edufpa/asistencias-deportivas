"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageShell, PageHeader, LoadingState } from "@/components/layout";
import { Trophy } from "lucide-react";

type PendingConv = {
  id: string;
  name: string;
  status: string;
  startDate: string;
};

export default function CrearInformePage() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingConv[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/informes/pendientes");
      const data = await res.json();
      const list: PendingConv[] = data.pending || [];
      setPending(list);
      if (list.length === 1) setSelectedId(list[0].id);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  function handleContinue() {
    if (!selectedId) return;
    router.push(`/convocatorias/${selectedId}/informes/nuevo`);
  }

  if (loading) return <LoadingState message="Cargando torneos pendientes..." />;

  return (
    <PageShell width="sm">
      <Link href="/informes" className="text-sm text-muted-foreground hover:text-foreground">
        ← Informes
      </Link>

      <PageHeader
        title="Crear informe"
        description="Selecciona el torneo pendiente de informe para el cual deseas redactar."
      />

      {pending.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground">
          <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay torneos pendientes de informe en este momento.</p>
          <Link href="/informes" className="inline-block mt-4">
            <Button variant="outline" size="sm">
              Volver al listado
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="torneo">Torneo pendiente de informe</Label>
            <select
              id="torneo"
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">— Seleccionar torneo —</option>
              {pending.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {format(new Date(c.startDate), "d MMM yyyy", { locale: es })}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={handleContinue} disabled={!selectedId} className="w-full sm:w-auto">
            Continuar con el informe
          </Button>
        </div>
      )}
    </PageShell>
  );
}
