"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

type Test = {
  id: string;
  name: string;
  unit: string;
  description: string | null;
  higherIsBetter: boolean;
  createdBy: { name: string };
  _count: { evaluations: number };
};

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [description, setDescription] = useState("");
  const [higherIsBetter, setHigherIsBetter] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchTests() {
    setLoading(true);
    const res = await fetch("/api/tests");
    setTests(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchTests(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, unit, description: description || null, higherIsBetter }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Error al crear");
      return;
    }
    setName(""); setUnit(""); setDescription(""); setHigherIsBetter(true);
    setOpenForm(false);
    fetchTests();
  }

  async function handleDelete(id: string, testName: string) {
    if (!confirm(`¿Eliminar el test "${testName}"? Se borrarán todas sus evaluaciones.`)) return;
    await fetch(`/api/tests/${id}`, { method: "DELETE" });
    fetchTests();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tests de Evaluación</h1>
          <p className="text-gray-500 mt-1">Fuerza, velocidad, natación y más</p>
        </div>
        <Button onClick={() => setOpenForm(true)}>+ Nuevo test</Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : tests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            No hay tests creados. Creá el primero.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant="outline" className="shrink-0 text-xs">{t.unit}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {t.description && (
                  <p className="text-sm text-gray-500">{t.description}</p>
                )}
                <p className="text-xs text-gray-400">
                  {t.higherIsBetter ? "Mayor valor = mejor" : "Menor valor = mejor"} ·{" "}
                  {t._count.evaluations} evaluación{t._count.evaluations !== 1 ? "es" : ""}
                </p>
                <p className="text-xs text-gray-400">Creado por {t.createdBy.name}</p>
                <div className="flex gap-2 pt-1">
                  <Link href={`/tests/${t.id}`} className="flex-1">
                    <Button size="sm" className="w-full">Evaluar jugadores</Button>
                  </Link>
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
          ))}
        </div>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Test de Evaluación</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="space-y-1">
              <Label>Nombre del test *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej: Test de fuerza, Test de natación 100m..." />
            </div>
            <div className="space-y-1">
              <Label>Unidad de medida *</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} required placeholder="kg, seg, m, rep, puntos..." />
            </div>
            <div className="space-y-1">
              <Label>Descripción (opcional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Protocolo o descripción del test..." />
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
                    className={`flex-1 rounded-lg border p-3 text-left transition-colors ${
                      higherIsBetter === opt.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Creando..." : "Crear test"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
