"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { canFinalizeInforme, type InformeStatus } from "@/lib/informeStatus";

export function InformeFinalizeButton({
  convocatoriaId,
  informeId,
  status,
  onFinalized,
  size = "sm",
}: {
  convocatoriaId: string;
  informeId: string;
  status: InformeStatus;
  onFinalized?: () => void;
  size?: "sm" | "default";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!canFinalizeInforme(status)) return null;

  async function handleFinalize() {
    if (!confirm("¿Marcar este informe como final? Podrás descargar el PDF y enviarlo a comisión.")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/convocatorias/${convocatoriaId}/informes/${informeId}/finalizar`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo finalizar");
        return;
      }
      onFinalized?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button size={size} variant="secondary" onClick={handleFinalize} disabled={loading}>
        <CheckCircle className="h-3.5 w-3.5 mr-1" />
        {loading ? "Finalizando..." : "Finalizar informe"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
