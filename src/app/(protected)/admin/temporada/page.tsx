"use client";

import { useEffect, useMemo, useState } from "react";
import type { SessionType } from "@prisma/client";
import { CalendarRange, Pencil, Trash2 } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EmptyState,
  FilterChip,
  FilterChipGroup,
  LoadingState,
  PageHeader,
  PageShell,
} from "@/components/layout";
import { canAccessAdminPanel } from "@/lib/permissions";
import {
  buildSeasonSessionOptions,
  describeWeekdays,
  SESSION_SORT_ORDER,
  WEEKDAY_OPTIONS,
  type AttendanceSeasonPeriodDto,
} from "@/lib/attendanceSeasonShared";

type SessionDraft = Record<SessionType, { enabled: boolean; weekdays: number[] }>;
type FormState = {
  id: string | null;
  name: string;
  startDate: string;
  endDate: string;
  sessions: SessionDraft;
};

const SESSION_CHOICES: { value: SessionType; label: string; description: string }[] = [
  { value: "TURNO_MANANA", label: "Mañana", description: "Piscina 1 si hay dos turnos" },
  { value: "TURNO_TARDE", label: "Tarde", description: "Piscina o Piscina 2 según el periodo" },
  { value: "PESAS", label: "Pesas", description: "Entrenamiento de gimnasio" },
];

function todayDateOnly() {
  return new Date().toISOString().split("T")[0];
}

function emptyForm(): FormState {
  const today = todayDateOnly();
  return {
    id: null,
    name: "",
    startDate: today,
    endDate: today,
    sessions: {
      TURNO_MANANA: { enabled: true, weekdays: [] },
      TURNO_TARDE: { enabled: true, weekdays: [] },
      PESAS: { enabled: true, weekdays: [] },
    },
  };
}

function formFromPeriod(period: AttendanceSeasonPeriodDto): FormState {
  const form = emptyForm();
  form.id = period.id;
  form.name = period.name;
  form.startDate = period.startDate;
  form.endDate = period.endDate;
  for (const choice of SESSION_CHOICES) {
    const session = period.sessions.find((s) => s.sessionType === choice.value);
    form.sessions[choice.value] = {
      enabled: Boolean(session),
      weekdays: session?.weekdays ?? [],
    };
  }
  return form;
}

function payloadFromForm(form: FormState) {
  return {
    name: form.name,
    startDate: form.startDate,
    endDate: form.endDate,
    sessions: SESSION_CHOICES.filter((choice) => form.sessions[choice.value].enabled).map(
      (choice) => ({
        sessionType: choice.value,
        weekdays: form.sessions[choice.value].weekdays,
        sortOrder: SESSION_SORT_ORDER[choice.value],
      })
    ),
  };
}

function periodSessionLabels(period: AttendanceSeasonPeriodDto) {
  return buildSeasonSessionOptions(period.sessions).map((session) => ({
    ...session,
    weekdayText: describeWeekdays(session.weekdays),
  }));
}

function TemporadaAdminContent() {
  const [periods, setPeriods] = useState<AttendanceSeasonPeriodDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sortedPeriods = useMemo(
    () => [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [periods]
  );

  async function fetchPeriods() {
    setLoading(true);
    const res = await fetch("/api/admin/attendance-season");
    if (res.ok) setPeriods(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchPeriods();
  }, []);

  function openCreate() {
    setForm(emptyForm());
    setError("");
    setDialogOpen(true);
  }

  function openEdit(period: AttendanceSeasonPeriodDto) {
    setForm(formFromPeriod(period));
    setError("");
    setDialogOpen(true);
  }

  function updateSession(
    sessionType: SessionType,
    next: Partial<{ enabled: boolean; weekdays: number[] }>
  ) {
    setForm((prev) => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [sessionType]: { ...prev.sessions[sessionType], ...next },
      },
    }));
  }

  function toggleWeekday(sessionType: SessionType, weekday: number) {
    const current = form.sessions[sessionType].weekdays;
    const next = current.includes(weekday)
      ? current.filter((d) => d !== weekday)
      : [...current, weekday];
    updateSession(sessionType, { weekdays: next });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const method = form.id ? "PUT" : "POST";
    const url = form.id ? `/api/admin/attendance-season/${form.id}` : "/api/admin/attendance-season";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadFromForm(form)),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError((body as { error?: string }).error ?? "Error al guardar el periodo");
      return;
    }
    setDialogOpen(false);
    fetchPeriods();
  }

  async function handleDelete(period: AttendanceSeasonPeriodDto) {
    if (!confirm(`¿Eliminar el periodo "${period.name}"?`)) return;
    await fetch(`/api/admin/attendance-season/${period.id}`, { method: "DELETE" });
    fetchPeriods();
  }

  return (
    <PageShell>
      <PageHeader
        title="Configurador de temporada"
        description="Define qué entrenamientos aparecen por rango de fechas y días de la semana."
        actions={<Button onClick={openCreate}>+ Nuevo periodo</Button>}
      />

      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          Si un día tiene un solo turno de piscina, se mostrará como <strong>Piscina</strong>.
          Si tiene mañana y tarde, se mostrará como <strong>Piscina 1</strong> y{" "}
          <strong>Piscina 2</strong>. Los reportes pueden elegir estos periodos directamente.
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-12">
          <LoadingState message="Cargando temporada..." />
        </div>
      ) : sortedPeriods.length === 0 ? (
        <EmptyState message="No hay periodos configurados todavía" />
      ) : (
        <div className="grid gap-3">
          {sortedPeriods.map((period) => (
            <Card key={period.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarRange className="h-4 w-4 text-blue-500" />
                      {period.name}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {period.startDate} → {period.endDate}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(period)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(period)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {periodSessionLabels(period).map((session) => (
                    <Badge key={session.value} variant="secondary" className="gap-1">
                      {session.label}
                      <span className="text-muted-foreground">· {session.weekdayText}</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar periodo" : "Nuevo periodo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 overflow-x-hidden py-2">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_11rem]">
              <div className="space-y-1">
                <Label>Nombre</Label>
                <Input
                  value={form.name}
                  placeholder="Ej: Enero-Febrero 2026"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Desde</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Hasta</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3">
              {SESSION_CHOICES.map((choice) => {
                const session = form.sessions[choice.value];
                return (
                  <div key={choice.value} className="rounded-lg border p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          checked={session.enabled}
                          onChange={(e) => updateSession(choice.value, { enabled: e.target.checked })}
                          className="mt-1"
                        />
                        <span>
                          <span className="block font-medium">{choice.label}</span>
                          <span className="block text-xs text-muted-foreground">
                            {choice.description}
                          </span>
                        </span>
                      </label>
                      <Badge variant="outline" className="w-fit">
                        {describeWeekdays(session.weekdays)}
                      </Badge>
                    </div>
                    {session.enabled && (
                      <FilterChipGroup label="Días" className="mt-3">
                        <FilterChip
                          active={session.weekdays.length === 0}
                          onClick={() => updateSession(choice.value, { weekdays: [] })}
                        >
                          Todos
                        </FilterChip>
                        {WEEKDAY_OPTIONS.map((day) => (
                          <FilterChip
                            key={day.value}
                            active={session.weekdays.includes(day.value)}
                            onClick={() => toggleWeekday(choice.value, day.value)}
                          >
                            {day.short}
                          </FilterChip>
                        ))}
                      </FilterChipGroup>
                    )}
                  </div>
                );
              })}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar periodo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

export default function TemporadaAdminPage() {
  return (
    <RoleGate allow={canAccessAdminPanel} message="Acceso restringido — solo administración.">
      <TemporadaAdminContent />
    </RoleGate>
  );
}
