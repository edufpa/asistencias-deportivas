"use client";

import { useState } from "react";
import { formatPlayerName } from "@/lib/player";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ConvocatoriaPlayer = {
  id: string;
  player: {
    id: string;
    firstName: string;
    paternalLastName: string;
    maternalLastName: string;
  };
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convocatoriaId: string;
  convocatoriaPlayer: ConvocatoriaPlayer;
  onSuccess: () => void;
}

export function CutPlayerDialog({
  open,
  onOpenChange,
  convocatoriaId,
  convocatoriaPlayer,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCut(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("El motivo del corte es obligatorio");
      return;
    }
    setError("");
    setLoading(true);

    const res = await fetch(
      `/api/convocatorias/${convocatoriaId}/players/${convocatoriaPlayer.player.id}/cut`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cutReason: reason }),
      }
    );

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al realizar el corte");
      return;
    }

    setReason("");
    onSuccess();
    onOpenChange(false);
  }

  const playerName = formatPlayerName(convocatoriaPlayer.player);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setReason("");
        setError("");
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Realizar Corte</DialogTitle>
          <DialogDescription>
            Estás por cortar a <strong>{playerName}</strong> de la convocatoria.
            Esta acción registrará la salida del jugador.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCut} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1">
            <Label htmlFor="reason">Motivo del corte *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describí el motivo por el cual el jugador es cortado de la convocatoria..."
              rows={4}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReason("");
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? "Cortando..." : "Confirmar corte"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
