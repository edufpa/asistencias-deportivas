"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatPlayerName } from "@/lib/player";
import { sortPlayersByCap, type RosterPlayer } from "@/lib/convocatoriaRoster";

type Player = RosterPlayer["player"] & {
  id: string;
};

export type ConvocatoriaPlayerRow = RosterPlayer & {
  id: string;
  status: "ACTIVE" | "CUT";
  player: Player;
};

interface Props {
  convocatoriaId: string;
  readOnly?: boolean;
  players: ConvocatoriaPlayerRow[];
  onCut: (player: ConvocatoriaPlayerRow) => void;
  onCapUpdated: () => void;
}

const CAP_OPTIONS = Array.from({ length: 15 }, (_, i) => i + 1);

export function ConvocatoriaPlayersCard({
  convocatoriaId,
  readOnly = false,
  players,
  onCut,
  onCapUpdated,
}: Props) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [localPlayers, setLocalPlayers] = useState(players);

  useEffect(() => {
    setLocalPlayers(sortPlayersByCap(players));
  }, [players]);

  const orderedPlayers = useMemo(() => sortPlayersByCap(localPlayers), [localPlayers]);

  const usedCaps = new Set(
    orderedPlayers.filter((p) => p.capNumber != null).map((p) => p.capNumber as number)
  );

  async function updateCap(playerId: string, value: string) {
    const capNumber = value === "" ? null : Number(value);
    setLocalPlayers((prev) =>
      sortPlayersByCap(
        prev.map((p) => (p.player.id === playerId ? { ...p, capNumber } : p))
      )
    );

    setSavingId(playerId);
    setError("");

    const res = await fetch(`/api/convocatorias/${convocatoriaId}/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capNumber }),
    });

    setSavingId(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar el gorro");
      setLocalPlayers(sortPlayersByCap(players));
      return;
    }
    onCapUpdated();
  }

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="divide-y border rounded-lg">
        {orderedPlayers.map((cp) => {
          const currentCap = cp.capNumber ?? "";
          return (
            <div
              key={cp.id}
              className="flex items-center gap-3 px-3 py-2.5 sm:px-4"
            >
              <div className="w-20 shrink-0 space-y-0.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Gorro
                </Label>
                <select
                  value={currentCap}
                  disabled={readOnly || savingId === cp.player.id}
                  onChange={(e) => updateCap(cp.player.id, e.target.value)}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
                >
                  <option value="">—</option>
                  {CAP_OPTIONS.map((n) => (
                    <option
                      key={n}
                      value={n}
                      disabled={usedCaps.has(n) && n !== cp.capNumber}
                    >
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/players/${cp.player.id}`}
                  className="text-sm font-medium hover:text-blue-600 hover:underline"
                >
                  {formatPlayerName(cp.player)}
                </Link>
                <p className="text-xs text-gray-400">{cp.player.documentId}</p>
              </div>
              {!readOnly && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 text-xs h-7 px-2 shrink-0"
                  onClick={() => onCut(cp)}
                >
                  Cortar
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
