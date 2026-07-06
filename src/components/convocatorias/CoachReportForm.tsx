"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageShell, PageHeader, LoadingState } from "@/components/layout";
import { CoachReportAiPreview } from "@/components/convocatorias/CoachReportAiPreview";
import { Save, Sparkles } from "lucide-react";
import { InformePdfButton } from "@/components/convocatorias/InformePdfButton";
import type { InformeStatus } from "@/lib/informeStatus";
import { objectiveStatusLabel } from "@/lib/coachReportObjective";

type Summary = { wins: number; losses: number; draws: number; total: number };
type ContextMeta = { convocados: number; partidos: number; conEstadisticas: number };

type ReportData = {
  championshipObjective: string;
  championshipPosition: string;
  coachPerception: string;
  sportsTopic: string;
  nonSportsTopic: string;
  wins: number;
  losses: number;
  draws: number;
  status: InformeStatus;
  aiPreviewHtml: string | null;
};

const EMPTY: ReportData = {
  championshipObjective: "",
  championshipPosition: "",
  coachPerception: "",
  sportsTopic: "",
  nonSportsTopic: "",
  wins: 0,
  losses: 0,
  draws: 0,
  status: "DRAFT",
  aiPreviewHtml: null,
};

export function CoachReportForm({ mode, informeId }: { mode: "create" | "edit"; informeId?: string }) {
  const params = useParams();
  const router = useRouter();
  const convocatoriaId = params.id as string;

  const [form, setForm] = useState<ReportData>(EMPTY);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [convocatoriaName, setConvocatoriaName] = useState("");
  const [contextMeta, setContextMeta] = useState<ContextMeta | null>(null);
  const [summary, setSummary] = useState<Summary>({ wins: 0, losses: 0, draws: 0, total: 0 });
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [message, setMessage] = useState("");

  const formPayload = () => ({
    convocatoriaId,
    championshipObjective: form.championshipObjective ? Number(form.championshipObjective) : null,
    championshipPosition: form.championshipPosition,
    coachPerception: form.coachPerception,
    sportsTopic: form.sportsTopic,
    nonSportsTopic: form.nonSportsTopic,
    wins: form.wins,
    losses: form.losses,
    draws: form.draws,
  });

  const fetchSummary = useCallback(async () => {
    const res = await fetch(`/api/convocatorias/${convocatoriaId}/informes`);
    const data = await res.json();
    setSummary(data.summary || { wins: 0, losses: 0, draws: 0, total: 0 });
    setConvocatoriaName(data.convocatoriaName || "");
    setContextMeta(data.contextMeta ?? null);
    if (mode === "create") {
      setForm((f) => ({
        ...f,
        wins: data.summary?.wins ?? 0,
        losses: data.summary?.losses ?? 0,
        draws: data.summary?.draws ?? 0,
      }));
    }
  }, [convocatoriaId, mode]);

  const fetchReport = useCallback(async () => {
    if (!informeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/convocatorias/${convocatoriaId}/informes/${informeId}`);
      const data = await res.json();
      if (res.ok) {
        setForm({
          championshipObjective: data.championshipObjective != null ? String(data.championshipObjective) : "",
          championshipPosition: data.championshipPosition ?? "",
          coachPerception: data.coachPerception ?? "",
          sportsTopic: data.sportsTopic ?? "",
          nonSportsTopic: data.nonSportsTopic ?? "",
          wins: data.wins,
          losses: data.losses,
          draws: data.draws,
          status: data.status,
          aiPreviewHtml: data.aiPreviewHtml ?? null,
        });
        setPreviewHtml(data.aiPreviewHtml ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [convocatoriaId, informeId]);

  useEffect(() => {
    fetchSummary();
    if (mode === "edit") fetchReport();
  }, [fetchSummary, fetchReport, mode]);

  async function handleGeneratePreview() {
    setPreviewing(true);
    setMessage("");
    try {
      const res = await fetch("/api/informes/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formPayload()),
      });
      const data = await res.json();
      if (res.ok) {
        setPreviewHtml(data.html);
      } else {
        setMessage(data.error || "No se pudo generar la vista previa");
      }
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        championshipObjective: form.championshipObjective ? Number(form.championshipObjective) : null,
        championshipPosition: form.championshipPosition,
        coachPerception: form.coachPerception,
        sportsTopic: form.sportsTopic,
        nonSportsTopic: form.nonSportsTopic,
        refreshSummary: true,
      };

      if (mode === "create") {
        const res = await fetch(`/api/convocatorias/${convocatoriaId}/informes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, sendToComision: false }),
        });
        const data = await res.json();
        if (res.ok) {
          setPreviewHtml(data.aiPreviewHtml ?? previewHtml);
          setMessage(mode === "create" ? "Informe creado" : "Informe guardado");
          if (mode === "create") {
            router.push(`/convocatorias/${convocatoriaId}/informes/${data.id}`);
          }
        } else {
          setMessage(data.error || "Error al guardar");
        }
      } else if (informeId) {
        const res = await fetch(`/api/convocatorias/${convocatoriaId}/informes/${informeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          setForm((f) => ({
            ...f,
            wins: data.wins,
            losses: data.losses,
            draws: data.draws,
            status: data.status,
            aiPreviewHtml: data.aiPreviewHtml ?? null,
          }));
          setPreviewHtml(data.aiPreviewHtml ?? previewHtml);
          setMessage("Informe guardado con vista previa IA");
        } else {
          setMessage(data.error || "Error al guardar");
        }
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState message="Cargando informe..." />;

  return (
    <PageShell>
      <Link href={`/convocatorias/${convocatoriaId}/informes`} className="text-sm text-muted-foreground hover:text-foreground">
        ← Informes
      </Link>

      <PageHeader
        title={mode === "create" ? "Nuevo informe" : "Editar informe"}
        description="Los datos de partidos y convocados se cargan automáticamente desde el torneo."
      />

      <div className="grid gap-8 lg:grid-cols-2 mt-4">
        <div className="space-y-4">
          <div className="rounded-xl border bg-slate-50 p-4 text-sm space-y-2">
            <p className="font-medium text-slate-800">Datos del torneo (automático)</p>
            <p className="text-slate-600">
              <span className="text-green-700 font-semibold">{form.wins}</span> ganados ·{" "}
              <span className="text-red-600 font-semibold">{form.losses}</span> perdidos ·{" "}
              <span className="text-amber-600 font-semibold">{form.draws}</span> empates
              <span className="text-muted-foreground"> ({summary.total} partidos)</span>
            </p>
            {contextMeta && (
              <p className="text-xs text-muted-foreground">
                {contextMeta.convocados} convocados · {contextMeta.partidos} partidos con resultado ·{" "}
                {contextMeta.conEstadisticas} jugadores con estadísticas
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="championshipObjective">Objetivo en campeonato (puesto)</Label>
              <Input
                id="championshipObjective"
                type="number"
                min={1}
                value={form.championshipObjective}
                onChange={(e) => setForm((f) => ({ ...f, championshipObjective: e.target.value }))}
                placeholder="Ej: 8"
              />
              <p className="text-xs text-muted-foreground mt-1">Meta: quedar entre los N primeros</p>
            </div>
            <div>
              <Label htmlFor="championshipPosition">Puesto alcanzado</Label>
              <Input
                id="championshipPosition"
                value={form.championshipPosition}
                onChange={(e) => setForm((f) => ({ ...f, championshipPosition: e.target.value }))}
                placeholder="Ej: 6to lugar"
              />
            </div>
          </div>

          {(form.championshipObjective || form.championshipPosition) && (
            <p className="text-sm rounded-lg border bg-white px-3 py-2 text-slate-700">
              {objectiveStatusLabel(
                form.championshipObjective ? Number(form.championshipObjective) : null,
                form.championshipPosition
              )}
            </p>
          )}

          <div>
            <Label htmlFor="coachPerception">Percepción del entrenador sobre el equipo</Label>
            <Textarea
              id="coachPerception"
              value={form.coachPerception}
              onChange={(e) => setForm((f) => ({ ...f, coachPerception: e.target.value }))}
              placeholder="Cómo ves al equipo en este momento..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="sportsTopic">Tema adicional deportivo</Label>
            <Textarea
              id="sportsTopic"
              value={form.sportsTopic}
              onChange={(e) => setForm((f) => ({ ...f, sportsTopic: e.target.value }))}
              placeholder="Aspectos técnicos, tácticos, lesiones, etc."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="nonSportsTopic">Tema adicional no deportivo</Label>
            <Textarea
              id="nonSportsTopic"
              value={form.nonSportsTopic}
              onChange={(e) => setForm((f) => ({ ...f, nonSportsTopic: e.target.value }))}
              placeholder="Logística, convivencia, apoderados, etc."
              rows={3}
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={handleGeneratePreview}
            disabled={previewing || saving}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            {previewing ? "Generando vista previa..." : "Generar vista previa con IA"}
          </Button>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-3">Vista previa del informe</p>
          <CoachReportAiPreview html={previewHtml} loading={previewing} />
        </div>
      </div>

      {message && (
        <p className={`text-sm mt-4 ${message.includes("Error") || message.includes("No se") ? "text-destructive" : "text-green-700"}`}>
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
        <Button variant="outline" onClick={() => router.push(`/convocatorias/${convocatoriaId}/informes`)}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving || previewing}>
          <Save className="h-4 w-4 mr-1.5" />
          {saving ? "Guardando..." : mode === "create" ? "Crear informe" : "Guardar cambios"}
        </Button>
        {informeId && (
          <InformePdfButton
            convocatoriaId={convocatoriaId}
            informeId={informeId}
            status={form.status}
          />
        )}
      </div>
    </PageShell>
  );
}
