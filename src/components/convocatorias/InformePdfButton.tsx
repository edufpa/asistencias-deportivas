"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { canDownloadInformePdf, type InformeStatus } from "@/lib/informeStatus";

export function InformePdfButton({
  convocatoriaId,
  informeId,
  status,
  size = "sm",
}: {
  convocatoriaId: string;
  informeId: string;
  status: InformeStatus;
  size?: "sm" | "default";
}) {
  const enabled = canDownloadInformePdf(status);
  const href = `/api/convocatorias/${convocatoriaId}/informes/${informeId}/pdf`;

  if (!enabled) {
    return (
      <Button size={size} variant="outline" disabled title="Disponible cuando el informe esté finalizado">
        <Download className="h-3.5 w-3.5 mr-1" /> PDF
      </Button>
    );
  }

  return (
    <a href={href} download>
      <Button size={size} variant="outline" type="button">
        <Download className="h-3.5 w-3.5 mr-1" /> PDF
      </Button>
    </a>
  );
}
