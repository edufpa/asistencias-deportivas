"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type User = { id: string; name: string; email: string; role: "ADMIN" | "COACH"; createdAt: string };

export default function UsuariosAdminPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "COACH" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  if (role !== "ADMIN") {
    return <div className="text-red-600 py-8 text-center">Acceso restringido — solo administradores</div>;
  }

  async function handleCreate() {
    if (!form.name || !form.email || !form.password) { setError("Todos los campos son requeridos"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "COACH" });
      fetchUsers();
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al crear usuario");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar al usuario "${name}"? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    fetchUsers();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👥 Gestión de Usuarios</h1>
          <p className="text-gray-500 mt-1">Administradores y entrenadores del sistema</p>
        </div>
        <Button onClick={() => { setError(""); setShowForm(true); }}>+ Nuevo usuario</Button>
      </div>

      <div className="grid gap-3">
        {loading ? (
          <div className="text-gray-400 text-center py-8">Cargando...</div>
        ) : users.map((u) => (
          <Card key={u.id}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{u.name}</p>
                    <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                      {u.role === "ADMIN" ? "Admin" : "Entrenador"}
                    </Badge>
                    {u.id === session?.user?.id && (
                      <span className="text-xs text-blue-500 font-medium">(vos)</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{u.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Creado: {format(new Date(u.createdAt), "d MMM yyyy", { locale: es })}
                  </p>
                </div>
                {u.id !== session?.user?.id && (
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(u.id, u.name)}>
                    Eliminar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuevo Usuario</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre completo *</Label>
              <Input placeholder="Ej: Juan Pérez" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" placeholder="juan@ejemplo.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Contraseña *</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <div className="flex gap-2">
                {[{ v: "COACH", l: "Entrenador" }, { v: "ADMIN", l: "Administrador" }].map((opt) => (
                  <button key={opt.v} type="button" onClick={() => setForm({ ...form, role: opt.v })}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      form.role === opt.v
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                    }`}>{opt.l}</button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Creando..." : "Crear usuario"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
