"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AddPlayersDialog } from "@/components/convocatorias/AddPlayersDialog";
import { CutPlayerDialog } from "@/components/convocatorias/CutPlayerDialog";
import { ConvocatoriaStaffCard } from "@/components/convocatorias/ConvocatoriaStaffCard";
import { ConvocatoriaPlayersCard, type ConvocatoriaPlayerRow } from "@/components/convocatorias/ConvocatoriaPlayersCard";
import { ConvocatoriaRosterExport } from "@/components/convocatorias/ConvocatoriaRosterExport";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useParams, useRouter } from "next/navigation";
import { formatPlayerName, CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/player";
import { sortPlayersByCap } from "@/lib/convocatoriaRoster";
import { PageShell, PageHeader, LoadingState } from "@/components/layout";
import type { DocumentType } from "@prisma/client";

type Player = {
  id: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  documentId: string;
  documentType: DocumentType;
  birthDate: string;
};

type ConvocatoriaPlayer = {
  id: string;
  status: "ACTIVE" | "CUT";
  capNumber: number | null;
  cutDate: string | null;
  cutReason: string | null;
  joinedAt: string;
  player: Player;
  cutBy: { name: string } | null;
};

type StaffUserRef = { id: string; name: string; email: string; role: string } | null;

type Convocatoria = {
  id: string;
  name: string;
  description: string | null;
  gender: "MALE" | "FEMALE" | "MIXED";
  category: Category;
  status: "ACTIVE" | "CLOSED";
  startDate: string;
  creator: { id: string; name: string };
  coachUserId: string | null;
  assistant1UserId: string | null;
  assistant2UserId: string | null;
  delegateUserId: string | null;
  coachUser: StaffUserRef;
  assistant1User: StaffUserRef;
  assistant2User: StaffUserRef;
  delegateUser: StaffUserRef;
  players: ConvocatoriaPlayer[];
};

const GENDER_OPTIONS = [
  { value: "MALE", label: "Varones" },
  { value: "FEMALE", label: "Damas" },
  { value: "MIXED", label: "Mixto" },
] as const;

export default function ConvocatoriaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [convocatoria, setConvocatoria] = useState<Convocatoria | null>(null);
  const [loading, setLoading] = useState(true);
  const [addPlayersOpen, setAddPlayersOpen] = useState(false);
  const [cutTarget, setCutTarget] = useState<ConvocatoriaPlayerRow | null>(null);
  const [closingConv, setClosingConv] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editGender, setEditGender] = useState<"MALE" | "FEMALE" | "MIXED">("MIXED");
  const [editCategory, setEditCategory] = useState<Category>("SUB16");
  const [editSaving, setEditSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const fetchConvocatoria = useCallback(async () => {
    setLoadError("");
    const res = await fetch(`/api/convocatorias/${id}`);
    if (res.ok) {
      const data = await res.json();
      setConvocatoria(data);
    } else if (res.status === 401) {
      setLoadError("Tu sesión expiró. Cerrá sesión e ingresá de nuevo.");
    } else {
      const data = await res.json().catch(() => ({}));
      setLoadError((data as { error?: string }).error ?? "No se pudo cargar la convocatoria");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchConvocatoria();
  }, [fetchConvocatoria]);

  function openEdit() {
    if (!convocatoria) return;
    setEditName(convocatoria.name);
    setEditDesc(convocatoria.description ?? "");
    setEditGender(convocatoria.gender ?? "MIXED");
    setEditCategory(convocatoria.category ?? "SUB16");
    setEditOpen(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true);
    await fetch(`/api/convocatorias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        description: editDesc || null,
        gender: editGender,
        category: editCategory,
      }),
    });
    setEditSaving(false);
    setEditOpen(false);
    fetchConvocatoria();
  }

  async function handleDeleteConv() {
    if (!confirm(`¿Eliminar la convocatoria "${convocatoria?.name}"? Se borrarán todos sus datos.`)) return;
    await fetch(`/api/convocatorias/${id}`, { method: "DELETE" });
    router.push("/convocatorias");
  }

  async function handleClose() {
    if (!confirm("¿Cerrar esta convocatoria? No se podrán agregar más jugadores.")) return;
    setClosingConv(true);
    await fetch(`/api/convocatorias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    });
    setClosingConv(false);
    fetchConvocatoria();
  }

  if (loading) return <LoadingState message="Cargando..." />;
  if (loadError) return <div className="text-destructive px-4 py-8">{loadError}</div>;
  if (!convocatoria) return <div className="text-destructive px-4 py-8">Convocatoria no encontrada</div>;

  const activePlayers = sortPlayersByCap(
    convocatoria.players.filter((p) => p.status === "ACTIVE")
  );
  const cutPlayers = convocatoria.players.filter((p) => p.status === "CUT");
  const isClosed = convocatoria.status === "CLOSED";

  return (
    <PageShell>
      <Link href="/convocatorias" className="text-sm text-muted-foreground hover:text-foreground">
        ← Convocatorias
      </Link>

      <PageHeader
        title={convocatoria.name}
        description={
          [
            convocatoria.description,
            `Creada por ${convocatoria.creator.name} · ${format(new Date(convocatoria.startDate), "d MMM yyyy", { locale: es })}`,
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        actions={
          <>
            <Badge variant="outline">{CATEGORY_LABELS[convocatoria.category ?? "SUB16"]}</Badge>
            <Badge variant={convocatoria.status === "ACTIVE" ? "default" : "secondary"}>
              {convocatoria.status === "ACTIVE" ? "Activa" : "Cerrada"}
            </Badge>
            <Button type="button" variant="secondary" size="sm" onClick={openEdit}>
              Editar convocatoria
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Link href={`/convocatorias/${id}/partidos`}>
            <Button variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50">
              Partidos
            </Button>
          </Link>
          <Button type="button" variant="outline" onClick={openEdit}>
            Editar datos
          </Button>
          {convocatoria.status === "ACTIVE" && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={closingConv}
              className="text-gray-600"
            >
              Cerrar convocatoria
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleDeleteConv}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            Eliminar convocatoria
          </Button>
        </div>
      </div>

      <div className="max-w-xl space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Jugadores Activos ({activePlayers.length})
                </CardTitle>
                {!isClosed && (
                  <Button size="sm" variant="outline" onClick={() => setAddPlayersOpen(true)}>
                    + Agregar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {activePlayers.length === 0 ? (
                <p className="text-gray-400 text-sm">Sin jugadores activos</p>
              ) : (
                <ConvocatoriaPlayersCard
                  convocatoriaId={id}
                  readOnly={isClosed}
                  players={activePlayers}
                  onCut={setCutTarget}
                  onCapUpdated={fetchConvocatoria}
                />
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
                        {formatPlayerName(cp.player)}
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

          <ConvocatoriaStaffCard
            convocatoriaId={id}
            readOnly={isClosed}
            initial={{
              coachUserId: convocatoria.coachUserId ?? "",
              assistant1UserId: convocatoria.assistant1UserId ?? "",
              assistant2UserId: convocatoria.assistant2UserId ?? "",
              delegateUserId: convocatoria.delegateUserId ?? "",
            }}
            onSaved={fetchConvocatoria}
          />

          <ConvocatoriaRosterExport
            convocatoriaName={convocatoria.name}
            coachUserId={convocatoria.coachUserId}
            delegateUserId={convocatoria.delegateUserId}
            players={convocatoria.players}
            staffNames={{
              coach: convocatoria.coachUser?.name,
              assistant1: convocatoria.assistant1User?.name,
              assistant2: convocatoria.assistant2User?.name,
              delegate: convocatoria.delegateUser?.name,
            }}
          />
      </div>

      <p className="text-sm text-gray-500">
        La asistencia se registra de forma general en{" "}
        <Link href="/asistencias" className="text-blue-600 hover:underline font-medium">
          Asistencias
        </Link>
        , no por convocatoria.
      </p>

      <AddPlayersDialog
        open={addPlayersOpen}
        onOpenChange={setAddPlayersOpen}
        convocatoriaId={id}
        convocatoriaGender={convocatoria.gender ?? "MIXED"}
        convocatoriaCategory={convocatoria.category ?? "SUB16"}
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Convocatoria</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setEditCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      editCategory === cat
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Género</Label>
              <div className="flex gap-2">
                {GENDER_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setEditGender(opt.value)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${editGender === opt.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-gray-400"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={editSaving}>{editSaving ? "Guardando..." : "Guardar cambios"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
