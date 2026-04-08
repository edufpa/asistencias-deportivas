"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Log = { id: string; action: string; entity: string; entityId: string | null; detail: string | null; createdAt: string; user: { name: string; email: string } };
type User = { id: string; name: string; email: string };

const ACTION_COLOR: Record<string, string> = {
  PLAYER_CREATED: "bg-green-100 text-green-800",
  PLAYER_UPDATED: "bg-blue-100 text-blue-800",
  PLAYER_DELETED: "bg-red-100 text-red-800",
  PLAYER_CUT: "bg-orange-100 text-orange-800",
  CONV_CREATED: "bg-purple-100 text-purple-800",
  MATCH_CREATED: "bg-yellow-100 text-yellow-800",
  ATTENDANCE_SAVED: "bg-teal-100 text-teal-800",
  USER_CREATED: "bg-indigo-100 text-indigo-800",
  USER_DELETED: "bg-red-100 text-red-800",
};

const ACTION_LABEL: Record<string, string> = {
  PLAYER_CREATED: "Jugador creado",
  PLAYER_UPDATED: "Jugador editado",
  PLAYER_DELETED: "Jugador eliminado",
  PLAYER_CUT: "Corte",
  CONV_CREATED: "Convocatoria creada",
  MATCH_CREATED: "Partido creado",
  ATTENDANCE_SAVED: "Asistencia guardada",
  USER_CREATED: "Usuario creado",
  USER_DELETED: "Usuario eliminado",
};

export default function LogsAdminPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;

  const [logs, setLogs] = useState<Log[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [entity, setEntity] = useState("");
  const [userId, setUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (role === "ADMIN") {
      fetch("/api/users").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setUsers(d); });
    }
  }, [role]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ take: "200" });
    if (entity) params.set("entity", entity);
    if (userId) params.set("userId", userId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`/api/logs?${params}`);
    if (res.ok) setLogs(await res.json());
    setLoading(false);
  }, [entity, userId, dateFrom, dateTo]);

  useEffect(() => { if (role === "ADMIN") fetchLogs(); }, [fetchLogs, role]);

  if (role !== "ADMIN") {
    return <div className="text-red-600 py-8 text-center">Acceso restringido — solo administradores</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📋 Registro de Actividad</h1>
        <p className="text-gray-500 mt-1">Historial de cambios y acciones realizadas en el sistema</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <Label>Módulo</Label>
              <select value={entity} onChange={(e) => setEntity(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                <option value="player">Jugadores</option>
                <option value="convocatoria">Convocatorias</option>
                <option value="match">Partidos</option>
                <option value="attendance">Asistencia</option>
                <option value="test">Tests</option>
                <option value="user">Usuarios</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Usuario</Label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Desde</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Hasta</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={fetchLogs} disabled={loading}>{loading ? "Cargando..." : "Filtrar"}</Button>
            {(entity || userId || dateFrom || dateTo) && (
              <Button variant="outline" onClick={() => { setEntity(""); setUserId(""); setDateFrom(""); setDateTo(""); }}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de logs */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center text-gray-400 py-10">Cargando logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center text-gray-400 py-10 border rounded-lg">No hay registros para los filtros seleccionados</div>
        ) : (
          <>
            <p className="text-xs text-gray-400">{logs.length} registro{logs.length !== 1 ? "s" : ""}</p>
            {logs.map((l) => (
              <div key={l.id} className="flex items-start gap-3 px-4 py-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                <div className="shrink-0 mt-0.5">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-md ${ACTION_COLOR[l.action] ?? "bg-gray-100 text-gray-700"}`}>
                    {ACTION_LABEL[l.action] ?? l.action}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{l.detail ?? "—"}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span className="font-medium text-gray-600">{l.user.name}</span>
                    {" · "}
                    {format(new Date(l.createdAt), "d MMM yyyy HH:mm", { locale: es })}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0 capitalize">{l.entity}</Badge>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
