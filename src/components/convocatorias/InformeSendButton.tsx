"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { canSendInformeToComision, type InformeStatus } from "@/lib/informeStatus";

export function InformeSendButton({
  convocatoriaId,
  informeId,
  status,
  onSent,
  size = "sm",
}: {
  convocatoriaId: string;
  informeId: string;
  status: InformeStatus;
  onSent?: () => void;
  size?: "sm" | "default";
}) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!canSendInformeToComision(status)) {
    if (status === "DRAFT") {
      return (
        <Button
          size={size}
          disabled
          className="bg-blue-600/50 cursor-not-allowed"
          title="Finaliza el informe antes de enviar a comisión"
        >
          <Mail className="h-3.5 w-3.5 mr-1" />
          Enviar a comisión
        </Button>
      );
    }
    return null;
  }

  async function handleSend() {
    if (!confirm("¿Enviar este informe a comisión?")) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/convocatorias/${convocatoriaId}/informes/${informeId}/send`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo enviar");
        return;
      }
      onSent?.();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        size={size}
        onClick={handleSend}
        disabled={sending}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Mail className="h-3.5 w-3.5 mr-1" />
        {sending ? "Enviando..." : "Enviar a comisión"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
