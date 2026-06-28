"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ROLE_LABELS, type AppRole } from "@/lib/permissions";

type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type StaffState = {
  coachUserId: string;
  assistant1UserId: string;
  assistant2UserId: string;
  delegateUserId: string;
};

interface Props {
  convocatoriaId: string;
  readOnly?: boolean;
  initial: StaffState;
  onSaved: () => void;
}

const STAFF_FIELDS = [
  { key: "coachUserId" as const, label: "Entrenador" },
  { key: "assistant1UserId" as const, label: "Asistente 1" },
  { key: "assistant2UserId" as const, label: "Asistente 2" },
  { key: "delegateUserId" as const, label: "Delegado" },
];

export function ConvocatoriaStaffCard({
  convocatoriaId,
  readOnly = false,
  initial,
  onSaved,
}: Props) {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [staff, setStaff] = useState<StaffState>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setStaff(initial);
  }, [initial]);

  useEffect(() => {
    fetch("/api/users/staff")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  async function saveField(key: keyof StaffState, value: string) {
    const next = { ...staff, [key]: value };
    setStaff(next);
    setSaving(key);
    setError("");

    const res = await fetch(`/api/convocatorias/${convocatoriaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value || null }),
    });

    setSaving(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar");
      setStaff(staff);
      return;
    }
    onSaved();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Cuerpo técnico</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Solo usuarios con cuenta aprobada en el sistema (entrenadores, comisión o admin).
        </p>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
        ) : (
          STAFF_FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={key} className="text-xs text-muted-foreground">
                {label}
              </Label>
              <select
                id={key}
                value={staff[key]}
                disabled={readOnly || saving === key}
                onChange={(e) => saveField(key, e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs disabled:opacity-50"
              >
                <option value="">— Sin asignar —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {ROLE_LABELS[u.role as AppRole] ?? u.role}
                  </option>
                ))}
              </select>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
