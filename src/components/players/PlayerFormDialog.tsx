"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string;
  club: string | null;
  birthDate: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player?: Player | null;
  onSuccess: () => void;
}

export function PlayerFormDialog({ open, onOpenChange, player, onSuccess }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [club, setClub] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (player) {
      setFirstName(player.firstName);
      setLastName(player.lastName);
      setDocumentId(player.documentId);
      setClub(player.club ?? "");
      setBirthDate(format(new Date(player.birthDate), "yyyy-MM-dd"));
    } else {
      setFirstName("");
      setLastName("");
      setDocumentId("");
      setClub("");
      setBirthDate("");
    }
    setError("");
  }, [player, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = player ? `/api/players/${player.id}` : "/api/players";
    const method = player ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, documentId, club: club || null, birthDate }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar");
      return;
    }

    onSuccess();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{player ? "Editar jugador" : "Nuevo jugador"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lastName">Apellido *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="García"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="firstName">Nombre *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="Carlos"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="documentId">Documento de identidad *</Label>
            <Input
              id="documentId"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              required
              placeholder="12345678"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="club">Club</Label>
            <Input
              id="club"
              value={club}
              onChange={(e) => setClub(e.target.value)}
              placeholder="Club Atlético..."
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="birthDate">Fecha de nacimiento *</Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : player ? "Actualizar" : "Crear jugador"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
