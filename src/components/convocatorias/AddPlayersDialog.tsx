"use client";

import { useState, useEffect, useMemo } from "react";
import {
  formatPlayerName,
  CATEGORY_LABELS,
  getConvocatoriaEligibleCategories,
  getBirthYear,
  getPlayerCategory,
  playerEligibleForConvocatoria,
  type Category,
} from "@/lib/player";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type Player = {
  id: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  documentId: string;
  birthDate: string;
  gender: string;
  convocatorias?: { convocatoria: { id: string; name: string } }[];
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convocatoriaId: string;
  convocatoriaGender: "MALE" | "FEMALE" | "MIXED";
  convocatoriaCategory: Category;
  existingPlayerIds: string[];
  onSuccess: () => void;
}

const GENDER_LABEL: Record<string, string> = {
  MALE: "Varones",
  FEMALE: "Damas",
  MIXED: "Mixto",
};

export function AddPlayersDialog({
  open,
  onOpenChange,
  convocatoriaId,
  convocatoriaGender,
  convocatoriaCategory,
  existingPlayerIds,
  onSuccess,
}: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const referenceYear = new Date().getFullYear();
  const eligibleCategories = useMemo(
    () => getConvocatoriaEligibleCategories(convocatoriaCategory),
    [convocatoriaCategory]
  );

  const filterHint = useMemo(() => {
    const cats = eligibleCategories.map((c) => CATEGORY_LABELS[c]).join(", ");
    const gender =
      convocatoriaGender === "MIXED"
        ? "todos los géneros"
        : GENDER_LABEL[convocatoriaGender].toLowerCase();
    return `Mostrando ${gender} de ${cats}.`;
  }, [convocatoriaGender, eligibleCategories]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelected(new Set());
      setError("");
      return;
    }
    const fetch_ = async () => {
      setLoading(true);
      const res = await fetch(`/api/players?search=${encodeURIComponent(search)}&includeConvocatorias=true`);
      const data = await res.json();
      setPlayers(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    const t = setTimeout(fetch_, 300);
    return () => clearTimeout(t);
  }, [search, open]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/convocatorias/${convocatoriaId}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerIds: Array.from(selected) }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al agregar");
      return;
    }
    onSuccess();
    onOpenChange(false);
  }

  const available = useMemo(() => {
    return players.filter((p) => {
      if (existingPlayerIds.includes(p.id)) return false;
      return playerEligibleForConvocatoria(
        p.birthDate,
        p.gender,
        convocatoriaGender,
        convocatoriaCategory,
        referenceYear
      );
    });
  }, [players, existingPlayerIds, convocatoriaGender, convocatoriaCategory, referenceYear]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar Jugadores a la Convocatoria</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">{filterHint}</p>
          <Input
            placeholder="Buscar jugador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {selected.size > 0 && (
            <p className="text-sm text-blue-600">{selected.size} seleccionado(s)</p>
          )}
          <div className="max-h-72 overflow-y-auto border rounded-lg divide-y">
            {loading ? (
              <p className="text-center py-6 text-gray-400 text-sm">Cargando...</p>
            ) : available.length === 0 ? (
              <p className="text-center py-6 text-gray-400 text-sm">
                {search
                  ? "Sin resultados para esta búsqueda y filtros"
                  : "No hay jugadores elegibles o ya están en la convocatoria"}
              </p>
            ) : (
              available.map((p) => {
                const playerCat = getPlayerCategory(getBirthYear(p.birthDate), referenceYear);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selected.has(p.id) ? "bg-blue-50" : ""
                    }`}
                    onClick={() => toggle(p.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{formatPlayerName(p)}</p>
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {CATEGORY_LABELS[playerCat]}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400">{p.documentId}</p>
                      {p.convocatorias && p.convocatorias.length > 0 && (
                        <p className="text-xs text-blue-500 mt-0.5">
                          También en: {p.convocatorias.map((c) => c.convocatoria.name).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAdd} disabled={selected.size === 0 || saving}>
            {saving ? "Agregando..." : `Agregar ${selected.size > 0 ? `(${selected.size})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
