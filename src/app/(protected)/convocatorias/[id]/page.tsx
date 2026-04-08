"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AddPlayersDialog } from "@/components/convocatorias/AddPlayersDialog";
import { CutPlayerDialog } from "@/components/convocatorias/CutPlayerDialog";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useParams, useRouter } from "next/navigation";

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string;
  club: string | null;
};

type ConvocatoriaPlayer = {
  id: string;
  status: "ACTIVE" | "CUT";
  cutDate: string | null;
  cutReason: string | null;
  joinedAt: string;
  player: Player;
  cutBy: { name: string } | null;
};

type Session = {
  id: string;
  sessionDate: string;
  sessionType: "TURNO_MANANA" | "TURNO_TARDE" | "PESAS";
  _count: { records: number };
};

type Convocatoria = {
  id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "CLOSED";
  startDate: string;
  creator: { id: string; name: string };
  players: ConvocatoriaPlayer[];
  sessions: Session[];
};

const SESSION_LABELS: Record<string, string> = {
  TURNO_MANANA: "Turno Mañana",
  TURNO_TARDE: "Turno Tarde",
  PESAS: "Pesas",
};

export default function ConvocatoriaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [convocatoria, setConvocatoria] = useState<Convocatoria | null>(null);
  const [loading, setLoading] = useState(true);
  const [addPlayersOpen, setAddPlayersOpen] = useState(false);
  const [cutTarget, setCutTarget] = useState<ConvocatoriaPlayer | null>(null);
  const [closingConv, setClosingConv] = useState(false);

  const fetchConvocatoria = useCallback(async () => {
    const res = await fetch(`/api/convocatorias/${id}`);
    if (res.ok) {
      const data = await res.json();
      setConvocatoria(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchConvocatoria();
  }, [fetchConvocatoria]);

  async function handleClose() {
    if (!confirm("¿Cerrar esta convocatoria? No se podrán registrar más asistencias.")) return;
    setClosingConv(true);
    await fetch(`/api/convocatorias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    });
    setClosingConv(false);
    fetchConvocatoria();
  }

  if (loading) return <div className="text-gray-400">Cargando...</div>;
  if (!convocatoria) return <div className="text-red-500">Convocatoria no encontrada</div>;

  const activePlayers = convocatoria.players.filter((p) => p.status === "ACTIVE");
  const cutPlayers = convocatoria.players.filter((p) => p.status === "CUT");

  const sessionsByDate = convocatoria.sessions.reduce(
    (acc, s) => {
      const dateKey = s.sessionDate.split("T")[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(s);
      return acc;
    },
    {} as Record<string, Session[]>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/convocatorias" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Convocatorias
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{convocatoria.name}</h1>
            <Badge variant={convocatoria.status === "ACTIVE" ? "default" : "secondary"}>
              {convocatoria.status === "ACTIVE" ? "Activa" : "Cerrada"}
            </Badge>
          </div>
          {convocatoria.description && (
            <p className="text-gray-500 mt-1">{convocatoria.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Creada por {convocatoria.creator.name} ·{" "}
            {format(new Date(convocatoria.startDate), "d MMM yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Link href={`/convocatorias/${id}/partidos`}>
            <Button variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50">
              Partidos
            </Button>
          </Link>
          {convocatoria.status === "ACTIVE" && (
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={closingConv}
              className="text-gray-600"
            >
              Cerrar convocatoria
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Columna izquierda: jugadores */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Jugadores Activos ({activePlayers.length})
                </CardTitle>
                {convocatoria.status === "ACTIVE" && (
                  <Button size="sm" variant="outline" onClick={() => setAddPlayersOpen(true)}>
                    + Agregar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {activePlayers.length === 0 ? (
                <p className="text-gray-400 text-sm px-4 pb-4">Sin jugadores activos</p>
              ) : (
                <div className="divide-y">
                  {activePlayers.map((cp) => (
                    <div
                      key={cp.id}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <div>
                        <Link
                          href={`/players/${cp.player.id}`}
                          className="text-sm font-medium hover:text-blue-600 hover:underline"
                        >
                          {cp.player.lastName}, {cp.player.firstName}
                        </Link>
                        {cp.player.club && (
                          <p className="text-xs text-gray-400">{cp.player.club}</p>
                        )}
                      </div>
                      {convocatoria.status === "ACTIVE" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 text-xs h-7 px-2"
                          onClick={() => setCutTarget(cp)}
                        >
                          Cortar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {cutPlayers.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-red-600">
                  Jugadores Cortados ({cutPlayers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {cutPlayers.map((cp) => (
                    <div key={cp.id} className="px-4 py-2.5">
                      <p className="text-sm font-medium text-gray-700">
                        {cp.player.lastName}, {cp.player.firstName}
                      </p>
                      {cp.cutDate && (
                        <p className="text-xs text-gray-400">
                          {format(new Date(cp.cutDate), "d MMM yyyy", { locale: es })}
                          {cp.cutBy ? ` · por ${cp.cutBy.name}` : ""}
                        </p>
                      )}
                      {cp.cutReason && (
                        <p className="text-xs text-gray-500 mt-0.5 italic">
                          &ldquo;{cp.cutReason}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Columna derecha: sesiones de asistencia */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Sesiones de Asistencia</h2>
            {convocatoria.status === "ACTIVE" && activePlayers.length > 0 && (
              <Button
                onClick={() => router.push(`/convocatorias/${id}/asistencia`)}
              >
                Registrar asistencia hoy
              </Button>
            )}
          </div>

          {Object.keys(sessionsByDate).length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-gray-400">
                No hay sesiones registradas.
                {convocatoria.status === "ACTIVE" &&
                  activePlayers.length > 0 &&
                  " Registrá la primera asistencia."}
              </CardContent>
            </Card>
          ) : (
            Object.entries(sessionsByDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([dateKey, sessions]) => (
                <Card key={dateKey}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">
                      {format(new Date(dateKey + "T12:00:00"), "EEEE d 'de' MMMM yyyy", {
                        locale: es,
                      })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {sessions.map((s) => (
                        <Link
                          key={s.id}
                          href={`/convocatorias/${id}/asistencia?sessionId=${s.id}`}
                        >
                          <div className="border rounded-lg px-4 py-3 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer">
                            <p className="text-sm font-medium">
                              {SESSION_LABELS[s.sessionType]}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {s._count.records} registro
                              {s._count.records !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      </div>

      <AddPlayersDialog
        open={addPlayersOpen}
        onOpenChange={setAddPlayersOpen}
        convocatoriaId={id}
        existingPlayerIds={convocatoria.players.map((p) => p.player.id)}
        onSuccess={fetchConvocatoria}
      />

      {cutTarget && (
        <CutPlayerDialog
          open={!!cutTarget}
          onOpenChange={(open) => !open && setCutTarget(null)}
          convocatoriaId={id}
          convocatoriaPlayer={cutTarget}
          onSuccess={fetchConvocatoria}
        />
      )}
    </div>
  );
}
