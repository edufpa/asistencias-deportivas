"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import {
  TEST_CATEGORY_OPTIONS,
  groupTestsByCategory,
  type TestCategory,
} from "@/lib/testCategory";
import { cn } from "@/lib/utils";
import {
  PageShell,
  PageHeader,
  SectionHeading,
  LoadingState,
  EmptyState,
} from "@/components/layout";

type Test = {
  id: string;
  name: string;
  unit: string;
  category: TestCategory;
  description: string | null;
  higherIsBetter: boolean;
  createdBy: { name: string };
  _count: { evaluations: number };
};

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Test | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState<TestCategory>("NATACION");
  const [description, setDescription] = useState("");
  const [higherIsBetter, setHigherIsBetter] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchTests() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tests");
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setError("Error al cargar tests. Reiniciá el servidor (npm run dev).");
        setTests([]);
        return;
      }
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Error al cargar tests");
        setTests([]);
        return;
      }
      const list = Array.isArray(data) ? data : [];
      setTests(
        list.map((t) => ({
          ...t,
          category: (t.category ?? "NATACION") as TestCategory,
        }))
      );
    } catch {
      setError("Error al cargar tests. Reiniciá el servidor de desarrollo.");
      setTests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTests();
  }, []);

  const groupedTests = useMemo(() => groupTestsByCategory(tests), [tests]);

  function openNew() {
    setEditTarget(null);
    setName("");
    setUnit("");
    setCategory("NATACION");
    setDescription("");
    setHigherIsBetter(true);
    setError("");
    setOpenForm(true);
  }

  function openEdit(t: Test) {
    setEditTarget(t);
    setName(t.name);
    setUnit(t.unit);
    setCategory(t.category ?? "NATACION");
    setDescription(t.description ?? "");
    setHigherIsBetter(t.higherIsBetter);
    setError("");
    setOpenForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const method = editTarget ? "PUT" : "POST";
    const url = editTarget ? `/api/tests/${editTarget.id}` : "/api/tests";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        unit,
        category,
        description: description || null,
        higherIsBetter,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Error");
      return;
    }
    setOpenForm(false);
    fetchTests();
  }

  async function handleDelete(id: string, testName: string) {
    if (!confirm(`¿Eliminar el test "${testName}"? Se borrarán todas sus evaluaciones.`)) return;
    await fetch(`/api/tests/${id}`, { method: "DELETE" });
    fetchTests();
  }

  function TestCard({ t }: { t: Test }) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{t.name}</CardTitle>
            <Badge variant="outline" className="shrink-0 text-xs">
              {t.unit}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
          <p className="text-xs text-muted-foreground">
            {t.higherIsBetter ? "Mayor valor = mejor" : "Menor valor = mejor"} ·{" "}
            {t._count.evaluations} evaluación{t._count.evaluations !== 1 ? "es" : ""}
          </p>
          <p className="text-xs text-muted-foreground">Creado por {t.createdBy.name}</p>
          <div className="flex gap-2 pt-1">
            <Link href={`/tests/${t.id}`} className="flex-1">
              <Button size="sm" className="w-full">
                Evaluar
              </Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
              Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-500 hover:text-red-700"
              onClick={() => handleDelete(t.id, t.name)}
            >
              Eliminar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Tests de Evaluación"
        description="Fuerza, natación y antropometría"
        actions={<Button onClick={openNew}>+ Nuevo test</Button>}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <LoadingState />
      ) : tests.length === 0 ? (
        <EmptyState message="No hay tests creados. Creá el primero." />
      ) : (
        <div className="space-y-8">
          {groupedTests.map((group) => (
            <section key={group.category}>
              <SectionHeading
                title={group.label}
                description={`${group.tests.length} test${group.tests.length !== 1 ? "s" : ""}`}
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.tests.map((t) => (
                  <TestCard key={t.id} t={t} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Test" : "Nuevo Test de Evaluación"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Categoría *</Label>
              <div className="grid gap-2">
                {TEST_CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      category === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Nombre del test *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ej: Pesas arranque, 100 m libre, % grasa..."
              />
            </div>
            <div className="space-y-1">
              <Label>Unidad de medida *</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
                placeholder="kg, seg, m, rep, %..."
              />
            </div>
            <div className="space-y-1">
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Protocolo o descripción del test..."
              />
            </div>
            <div className="space-y-2">
              <Label>Criterio de rendimiento</Label>
              <div className="flex gap-3">
                {[
                  { value: true, label: "Mayor es mejor", sub: "Fuerza, distancia, repeticiones" },
                  { value: false, label: "Menor es mejor", sub: "Velocidad, tiempo" },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setHigherIsBetter(opt.value)}
                    className={cn(
                      "flex-1 rounded-lg border p-3 text-left transition-colors",
                      higherIsBetter === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : editTarget ? "Guardar cambios" : "Crear test"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
