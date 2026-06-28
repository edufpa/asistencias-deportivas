"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MatchRosterSelector } from "@/components/matches/MatchRosterSelector";
import { PageShell, PageHeader, FilterChip, FilterChipGroup } from "@/components/layout";
import { cn } from "@/lib/utils";

type Convocatoria = { id: string; name: string; status: "ACTIVE" | "CLOSED" };

export function NewMatchForm() {
  const router = useRouter();
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [matchScope, setMatchScope] = useState<"convocatoria" | "amistoso">("convocatoria");
  const [newConv, setNewConv] = useState("");
  const [form, setForm] = useState({
    matchDate: new Date().toISOString().split("T")[0],
    matchType: "OFFICIAL" as "OFFICIAL" | "PRACTICE",
    opponent: "",
    location: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [rosterPlayerIds, setRosterPlayerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/convocatorias")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setConvocatorias(d.filter((c: Convocatoria) => c.status === "ACTIVE"));
      });
  }, []);

  async function handleSaveMatch() {
    if (matchScope === "convocatoria" && !newConv) {
      setSaveError("Seleccioná una convocatoria activa");
      return;
    }
    if (matchScope === "amistoso" && rosterPlayerIds.size === 0) {
      setSaveError("Seleccioná al menos un jugador para el plantel");
      return;
    }
    if (!form.matchDate) {
      setSaveError("Ingresá la fecha del partido");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/reportes/partidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          convocatoriaId: matchScope === "amistoso" ? null : newConv,
          playerIds: matchScope === "amistoso" ? Array.from(rosterPlayerIds) : undefined,
          matchDate: form.matchDate,
          matchType: form.matchType,
          opponent: form.opponent || null,
          location: form.location || null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        if (matchScope === "amistoso") {
          router.push(`/reportes/partidos/${created.id}`);
        } else {
          router.push(`/convocatorias/${newConv}/partidos/${created.id}`);
        }
      } else {
        const text = await res.text();
        let message = "Error al crear el partido";
        if (text) {
          try {
            const d = JSON.parse(text);
            message = d.error ?? message;
          } catch {
            message = text.slice(0, 200) || message;
          }
        }
        setSaveError(message);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error de conexión");
    }
    setSaving(false);
  }

  return (
    <PageShell width="sm">
      <Link href="/reportes/partidos" className="text-sm text-muted-foreground hover:text-foreground">
        ← Reporte de Partidos
      </Link>

      <PageHeader
        title="Nuevo Partido"
        description="Datos básicos del encuentro. Marcador, calificaciones y observaciones se cargan en el detalle."
      />

      <Card>
        <CardContent className="pt-6 space-y-5">
          <FilterChipGroup label="Modalidad">
            <FilterChip
              size="md"
              active={matchScope === "convocatoria"}
              onClick={() => {
                setMatchScope("convocatoria");
                setSaveError("");
              }}
            >
              Convocatoria
            </FilterChip>
            <FilterChip
              size="md"
              active={matchScope === "amistoso"}
              onClick={() => {
                setMatchScope("amistoso");
                setNewConv("");
                setSaveError("");
              }}
            >
              Amistoso
            </FilterChip>
          </FilterChipGroup>

          {matchScope === "convocatoria" ? (
            <div className="space-y-1">
              <Label>Convocatoria activa *</Label>
              <select
                value={newConv}
                onChange={(e) => setNewConv(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccioná una convocatoria</option>
                {convocatorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {convocatorias.length === 0 && (
                <p className="text-xs text-amber-600">No hay convocatorias activas. Creá una o usá Amistoso.</p>
              )}
            </div>
          ) : (
            <MatchRosterSelector selected={rosterPlayerIds} onChange={setRosterPlayerIds} />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={form.matchDate}
                onChange={(e) => setForm({ ...form, matchDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <select
                value={form.matchType}
                onChange={(e) => setForm({ ...form, matchType: e.target.value as "OFFICIAL" | "PRACTICE" })}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="OFFICIAL">Oficial</option>
                <option value="PRACTICE">Preparación</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Rival</Label>
              <Input
                placeholder="Ej: Bolivia"
                value={form.opponent}
                onChange={(e) => setForm({ ...form, opponent: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Sede</Label>
              <Input
                placeholder="Ej: Lima"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
          </div>

          {saveError && <p className="text-sm text-red-600">{saveError}</p>}

          <div className="flex gap-3 pt-2">
            <Link href="/reportes/partidos" className={cn(buttonVariants({ variant: "outline" }))}>
              Cancelar
            </Link>
            <Button onClick={handleSaveMatch} disabled={saving}>
              {saving ? "Guardando..." : "Crear partido"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
