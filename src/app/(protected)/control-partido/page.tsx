"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  PageShell,
  PageHeader,
  EmptyState,
  LoadingState,
} from "@/components/layout";
import { useAppRole } from "@/hooks/useAppRole";
import { canAccessPartidos } from "@/lib/permissions";

type MatchRow = {
  id: string;
  matchDate: string;
  location: string | null;
  notes: string | null;
  blueScore: number;
  whiteScore: number;
  createdAt: string;
  createdBy: { id: string; name: string };
  eventCount: number;
};

export default function ControlPartidoListPage() {
  const role = useAppRole();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/control-partido");
    const data = await res.json();
    if (res.ok && Array.isArray(data.matches)) {
      setMatches(data.matches);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!canAccessPartidos(role)) return;
    void load();
  }, [role, load]);

  async function startControl() {
    setCreating(true);
    setError("");
    const res = await fetch("/api/control-partido", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location: location.trim() || undefined }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el control");
      return;
    }
    router.push(`/control-partido/${data.id}`);
  }

  if (!canAccessPartidos(role)) {
    return (
      <PageShell>
        <Alert variant="destructive">
          <AlertDescription>No tenés permiso para esta sección.</AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Control de partido"
        description="Azul vs Blanco · gorros 1–15 · goles, expulsiones y penales"
      />

      <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Elegí Gol / Expulsión / Penal (quedan visibles arriba) y tocá el
          número. Expulsión y penal suman falta; a las 3 el jugador queda fuera.
          El marcador se actualiza solo.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="location">Piscina / lugar (opcional)</Label>
            <Input
              id="location"
              placeholder="Ej. Regatas"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <Button onClick={() => void startControl()} disabled={creating}>
            {creating ? "Creando..." : "Nuevo control Azul vs Blanco"}
          </Button>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {loading ? (
        <LoadingState />
      ) : matches.length === 0 ? (
        <EmptyState message="Sin controles todavía. Creá un control Azul vs Blanco para empezar." />
      ) : (
        <ul className="space-y-2">
          {matches.map((m) => (
            <li key={m.id}>
              <Link
                href={`/control-partido/${m.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 transition hover:bg-muted/40"
              >
                <div>
                  <p className="font-semibold">
                    {format(new Date(`${m.matchDate}T12:00:00`), "dd MMM yyyy", {
                      locale: es,
                    })}
                    {m.location ? ` · ${m.location}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.eventCount} eventos · {m.createdBy.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black tabular-nums">
                    <span className="text-blue-700">{m.blueScore}</span>
                    <span className="mx-1 text-muted-foreground">-</span>
                    <span>{m.whiteScore}</span>
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Azul · Blanco
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
