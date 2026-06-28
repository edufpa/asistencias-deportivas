"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAppRole } from "@/hooks/useAppRole";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  canManageUsers,
  canAssignRole,
  type AppRole,
} from "@/lib/permissions";
import { RoleGate } from "@/components/RoleGate";
import { formatPlayerName, CATEGORIES, CATEGORY_LABELS, getBirthYear, getPlayerCategory, matchesPlayerGender } from "@/lib/player";
import type { Category, PlayerGender } from "@/lib/player";
import type { Gender } from "@prisma/client";
import { RegistrationLinkCard } from "@/components/admin/RegistrationLinkCard";
import {
  PageShell,
  PageHeader,
  FilterChip,
  FilterChipGroup,
  FilterPanel,
  LoadingState,
  EmptyState,
} from "@/components/layout";

type User = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  accountStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  linkedPlayerIds?: string[];
};

const ACCOUNT_STATUS_LABELS = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

function accountBadgeVariant(
  status: User["accountStatus"]
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "PENDING") return "secondary";
  if (status === "REJECTED") return "destructive";
  return "outline";
}

type PlayerOption = {
  id: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  birthDate: string;
  gender: Gender;
};

function roleBadgeVariant(role: AppRole): "default" | "secondary" | "outline" | "destructive" {
  if (role === "SUPER_ADMIN") return "default";
  if (role === "COMISION") return "secondary";
  if (role === "PARENT") return "outline";
  return "secondary";
}

function toggleLinkedId(ids: string[], playerId: string): string[] {
  return ids.includes(playerId) ? ids.filter((id) => id !== playerId) : [...ids, playerId];
}

function PlayerLinkSelector({
  players,
  selected,
  onChange,
}: {
  players: PlayerOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  if (players.length === 0) {
    return <p className="text-xs text-muted-foreground">No hay jugadores cargados</p>;
  }
  return (
    <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
      {players.map((p) => (
        <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1">
          <input
            type="checkbox"
            checked={selected.includes(p.id)}
            onChange={() => onChange(toggleLinkedId(selected, p.id))}
            className="rounded"
          />
          <span className="truncate">{formatPlayerName(p)}</span>
        </label>
      ))}
    </div>
  );
}

type RoleFilter = "ALL" | "PARENT" | "COMISION" | "COACH";

function UsuariosAdminContent() {
  const actorRole = useAppRole();
  const { data: session } = useSession();
  const assignableRoles = useMemo(
    () => ASSIGNABLE_ROLES.filter((r) => canAssignRole(actorRole, r)),
    [actorRole]
  );

  const [users, setUsers] = useState<User[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<RoleFilter>("ALL");
  const [filterCategory, setFilterCategory] = useState<Category | "ALL">("ALL");
  const [filterGender, setFilterGender] = useState<PlayerGender | "ALL">("ALL");
  const referenceYear = new Date().getFullYear();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "COACH" as AppRole,
    linkedPlayerIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<AppRole>("COACH");
  const [editPassword, setEditPassword] = useState("");
  const [editLinkedIds, setEditLinkedIds] = useState<string[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [linkingPlayers, setLinkingPlayers] = useState(false);
  const [linkMessage, setLinkMessage] = useState("");

  const playersById = useMemo(
    () => new Map(allPlayers.map((p) => [p.id, p])),
    [allPlayers]
  );

  const sortedUsers = useMemo(() => {
    const order = { PENDING: 0, REJECTED: 1, APPROVED: 2 };
    return [...users].sort(
      (a, b) => order[a.accountStatus] - order[b.accountStatus] || b.createdAt.localeCompare(a.createdAt)
    );
  }, [users]);

  const filteredUsers = useMemo(() => {
    let list = sortedUsers;

    if (filterRole !== "ALL") {
      list = list.filter((u) =>
        filterRole === "COMISION"
          ? u.role === "COMISION" || u.role === "SUPER_ADMIN"
          : u.role === filterRole
      );
    }

    const applyPlayerFilters =
      (filterRole === "ALL" || filterRole === "PARENT") &&
      (filterCategory !== "ALL" || filterGender !== "ALL");

    if (!applyPlayerFilters) return list;

    return list.filter((u) => {
      if (u.role !== "PARENT") return false;
      const linkedIds = u.linkedPlayerIds ?? [];
      if (linkedIds.length === 0) return false;

      return linkedIds.some((playerId) => {
        const player = playersById.get(playerId);
        if (!player) return false;
        if (filterGender !== "ALL" && !matchesPlayerGender(player.gender, filterGender)) return false;
        if (filterCategory !== "ALL") {
          const cat = getPlayerCategory(getBirthYear(player.birthDate), referenceYear);
          if (cat !== filterCategory) return false;
        }
        return true;
      });
    });
  }, [sortedUsers, filterRole, filterCategory, filterGender, playersById, referenceYear]);

  const hasActiveFilters =
    filterRole !== "ALL" || filterCategory !== "ALL" || filterGender !== "ALL";

  const pendingCount = users.filter((u) => u.accountStatus === "PENDING").length;

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  async function fetchPlayers() {
    const res = await fetch("/api/players");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setAllPlayers(data);
    }
  }

  useEffect(() => {
    fetchUsers();
    fetchPlayers();
  }, []);

  async function handleCreate() {
    if (!form.name || !form.email || !form.password) {
      setError("Todos los campos son requeridos");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "COACH", linkedPlayerIds: [] });
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

  async function handleAccountStatus(id: string, action: "approve" | "reject") {
    setStatusUpdating(id);
    await fetch(`/api/users/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setStatusUpdating(null);
    fetchUsers();
  }

  function openEdit(u: User) {
    setEditTarget(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditPassword("");
    setEditLinkedIds(u.linkedPlayerIds ?? []);
    setEditError("");
    setEditOpen(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditSaving(true);
    setEditError("");
    const body: Record<string, unknown> = {
      name: editName,
      role: editRole,
      linkedPlayerIds: editRole === "PARENT" ? editLinkedIds : [],
    };
    if (editPassword) body.newPassword = editPassword;
    const res = await fetch(`/api/users/${editTarget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEditSaving(false);
    if (res.ok) {
      setEditOpen(false);
      setEditTarget(null);
      fetchUsers();
    } else {
      const d = await res.json();
      setEditError(d.error ?? "Error al guardar");
    }
  }

  async function handleSyncPlayerLinks() {
    setLinkingPlayers(true);
    setLinkMessage("");
    const res = await fetch("/api/admin/link-users-players", { method: "POST" });
    const data = await res.json();
    setLinkingPlayers(false);
    if (res.ok) {
      setLinkMessage(data.message ?? "Vínculos actualizados");
      fetchUsers();
    } else {
      setLinkMessage(data.error ?? "Error al vincular");
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Gestión de Usuarios"
        description="Roles del sistema, aprobaciones y vínculos jugador"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleSyncPlayerLinks}
              disabled={linkingPlayers}
            >
              {linkingPlayers ? "Vinculando..." : "Vincular usuarios ↔ jugadores"}
            </Button>
            <Button onClick={() => { setError(""); setShowForm(true); }}>+ Nuevo usuario</Button>
          </div>
        }
      />

      {linkMessage && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">{linkMessage}</div>
      )}

      {pendingCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {pendingCount} solicitud{pendingCount !== 1 ? "es" : ""} de acceso pendiente{pendingCount !== 1 ? "s" : ""} de aprobación
        </div>
      )}

      <RegistrationLinkCard />

      <FilterPanel className="flex-col lg:flex-col gap-4">
        <FilterChipGroup label="Rol">
          <FilterChip active={filterRole === "ALL"} onClick={() => setFilterRole("ALL")}>
            Todos
          </FilterChip>
          <FilterChip active={filterRole === "PARENT"} onClick={() => setFilterRole("PARENT")}>
            Jugador
          </FilterChip>
          <FilterChip active={filterRole === "COMISION"} onClick={() => setFilterRole("COMISION")}>
            Comisión
          </FilterChip>
          <FilterChip active={filterRole === "COACH"} onClick={() => setFilterRole("COACH")}>
            Entrenador
          </FilterChip>
        </FilterChipGroup>
        {(filterRole === "ALL" || filterRole === "PARENT") && (
          <div className="flex w-full flex-col gap-4 md:flex-row md:items-start">
            <FilterChipGroup label={`Categoría (${referenceYear})`} className="min-w-0 flex-1">
              <FilterChip active={filterCategory === "ALL"} onClick={() => setFilterCategory("ALL")}>
                Todas
              </FilterChip>
              {CATEGORIES.map((cat) => (
                <FilterChip
                  key={cat}
                  active={filterCategory === cat}
                  onClick={() => setFilterCategory(cat)}
                >
                  {CATEGORY_LABELS[cat]}
                </FilterChip>
              ))}
            </FilterChipGroup>
            <FilterChipGroup label="Género" className="shrink-0">
              <FilterChip active={filterGender === "ALL"} onClick={() => setFilterGender("ALL")}>
                Todos
              </FilterChip>
              <FilterChip active={filterGender === "MALE"} onClick={() => setFilterGender("MALE")}>
                Varones
              </FilterChip>
              <FilterChip active={filterGender === "FEMALE"} onClick={() => setFilterGender("FEMALE")}>
                Damas
              </FilterChip>
            </FilterChipGroup>
          </div>
        )}
      </FilterPanel>

      <div className="grid gap-3">
        {loading ? (
          <div className="text-center py-8">
            <LoadingState />
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            message={
              hasActiveFilters
                ? "Sin usuarios para los filtros seleccionados"
                : "No hay usuarios registrados"
            }
          />
        ) : filteredUsers.map((u) => (
          <Card key={u.id}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{u.name}</p>
                    <Badge variant={roleBadgeVariant(u.role)}>{ROLE_LABELS[u.role]}</Badge>
                    <Badge variant={accountBadgeVariant(u.accountStatus)}>
                      {ACCOUNT_STATUS_LABELS[u.accountStatus]}
                    </Badge>
                    {u.id === session?.user?.id && (
                      <span className="text-xs text-blue-500 font-medium">(vos)</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                  {u.role === "PARENT" && (u.linkedPlayerIds?.length ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {u.linkedPlayerIds!.length} jugador(es) vinculado(s)
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Creado: {format(new Date(u.createdAt), "d MMM yyyy", { locale: es })}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {u.accountStatus === "PENDING" && canAssignRole(actorRole, u.role) && (
                    <>
                      <Button
                        size="sm"
                        disabled={statusUpdating === u.id}
                        onClick={() => handleAccountStatus(u.id, "approve")}
                      >
                        Aprobar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={statusUpdating === u.id}
                        onClick={() => handleAccountStatus(u.id, "reject")}
                      >
                        Rechazar
                      </Button>
                    </>
                  )}
                  {canAssignRole(actorRole, u.role) && (
                    <Button variant="outline" size="sm" onClick={() => openEdit(u)}>Editar</Button>
                  )}
                  {u.id !== session?.user?.id && canAssignRole(actorRole, u.role) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(u.id, u.name)}
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
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
            <FilterChipGroup label="Rol">
              {assignableRoles.map((r) => (
                <FilterChip
                  key={r}
                  size="md"
                  active={form.role === r}
                  onClick={() =>
                    setForm({
                      ...form,
                      role: r,
                      linkedPlayerIds: r === "PARENT" ? form.linkedPlayerIds : [],
                    })
                  }
                >
                  {ROLE_LABELS[r]}
                </FilterChip>
              ))}
            </FilterChipGroup>
            {form.role === "PARENT" && (
              <div className="space-y-1">
                <Label>Jugadores vinculados</Label>
                <PlayerLinkSelector
                  players={allPlayers}
                  selected={form.linkedPlayerIds}
                  onChange={(ids) => setForm({ ...form, linkedPlayerIds: ids })}
                />
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Creando..." : "Crear usuario"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Usuario</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <FilterChipGroup label="Rol">
              {assignableRoles.map((r) => (
                <FilterChip
                  key={r}
                  size="md"
                  active={editRole === r}
                  onClick={() => {
                    setEditRole(r);
                    if (r !== "PARENT") setEditLinkedIds([]);
                  }}
                >
                  {ROLE_LABELS[r]}
                </FilterChip>
              ))}
            </FilterChipGroup>
            {editRole === "PARENT" && (
              <div className="space-y-1">
                <Label>Jugadores vinculados</Label>
                <PlayerLinkSelector players={allPlayers} selected={editLinkedIds} onChange={setEditLinkedIds} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Nueva contraseña <span className="text-muted-foreground text-xs">(dejar vacío para no cambiar)</span></Label>
              <Input type="password" placeholder="Nueva contraseña..." value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
            </div>
            {editError && <p className="text-sm text-red-600">{editError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setEditOpen(false); setEditTarget(null); }}>Cancelar</Button>
              <Button type="submit" disabled={editSaving}>{editSaving ? "Guardando..." : "Guardar cambios"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

export default function UsuariosAdminPage() {
  return (
    <RoleGate allow={canManageUsers} message="Acceso restringido — solo administradores y comisión.">
      <UsuariosAdminContent />
    </RoleGate>
  );
}
