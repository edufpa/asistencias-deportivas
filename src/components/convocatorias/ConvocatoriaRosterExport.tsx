"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  downloadConvocatoriaRosterXls,
  getConvocatoriaExportStatus,
  type RosterPlayer,
} from "@/lib/convocatoriaRoster";

interface Props {
  convocatoriaName: string;
  coachUserId: string | null;
  delegateUserId: string | null;
  players: RosterPlayer[];
  staffNames?: {
    coach?: string | null;
    assistant1?: string | null;
    assistant2?: string | null;
    delegate?: string | null;
  };
}

export function ConvocatoriaRosterExport({
  convocatoriaName,
  coachUserId,
  delegateUserId,
  players,
  staffNames,
}: Props) {
  const [downloading, setDownloading] = useState(false);
  const { ready, missing } = getConvocatoriaExportStatus({
    coachUserId,
    delegateUserId,
    players,
  });

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadConvocatoriaRosterXls(convocatoriaName, players, staffNames);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium">Descargar plantel</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Excel con gorro, nombres, apellidos, fecha de nacimiento y documento.
        </p>
      </div>

      {!ready && missing.length > 0 && (
        <ul className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 space-y-0.5">
          {missing.map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        onClick={handleDownload}
        disabled={!ready || downloading}
        className="w-full sm:w-auto"
      >
        {downloading ? "Generando..." : "Descargar XLS"}
      </Button>
    </div>
  );
}
