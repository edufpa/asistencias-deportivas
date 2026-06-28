"use client";

import { useState, useEffect, useMemo } from "react";
import {
  formatPlayerName,
  CATEGORIES,
  CATEGORY_LABELS,
  getBirthYear,
  getPlayerCategory,
  matchesPlayerGender,
  type Category,
  type PlayerGender,
} from "@/lib/player";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FilterChip, FilterChipGroup, FilterPanel } from "@/components/layout";

type RosterPlayer = {
  id: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  birthDate: string;
  gender: string;
  playerStatus: string;
};

export function MatchRosterSelector({
  selected,
  onChange,
}: {
  selected: Set<string>;
  onChange: (ids: Set<string>) => void;
}) {
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<Category | "ALL">("ALL");
  const [filterGender, setFilterGender] = useState<PlayerGender | "ALL">("ALL");
  const [loading, setLoading] = useState(true);

  const referenceYear = new Date().getFullYear();

  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((data) => {
        setPlayers(Array.isArray(data) ? data.filter((p: RosterPlayer) => p.playerStatus === "ACTIVE") : []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return players.filter((p) => {
      if (filterGender !== "ALL" && !matchesPlayerGender(p.gender, filterGender)) return false;
      if (filterCategory !== "ALL") {
        const cat = getPlayerCategory(getBirthYear(p.birthDate), referenceYear);
        if (cat !== filterCategory) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = formatPlayerName(p).toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [players, filterCategory, filterGender, search, referenceYear]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function addAllFiltered() {
    const next = new Set(selected);
    filtered.forEach((p) => next.add(p.id));
    onChange(next);
  }

  function removeAllFiltered() {
    const next = new Set(selected);
    filtered.forEach((p) => next.delete(p.id));
    onChange(next);
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-sm font-semibold">Plantel del partido *</Label>
        <Badge variant="secondary">{selected.size} seleccionado{selected.size !== 1 ? "s" : ""}</Badge>
      </div>

      <Input
        placeholder="Buscar jugador..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-9 text-sm"
      />

      <FilterPanel className="p-0 bg-transparent border-0 shadow-none">
        <FilterChipGroup label={`Categoría (${referenceYear})`} className="flex-1 min-w-0">
          <FilterChip active={filterCategory === "ALL"} onClick={() => setFilterCategory("ALL")}>
            Todas
          </FilterChip>
          {CATEGORIES.map((cat) => (
            <FilterChip key={cat} active={filterCategory === cat} onClick={() => setFilterCategory(cat)}>
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
      </FilterPanel>

      <div className="flex gap-2 flex-wrap">
        <Button type="button" variant="outline" size="sm" onClick={addAllFiltered} disabled={filtered.length === 0}>
          Agregar filtrados ({filtered.length})
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={removeAllFiltered} disabled={filtered.length === 0}>
          Quitar filtrados
        </Button>
      </div>

      <div className="max-h-48 overflow-y-auto border rounded-md bg-background divide-y">
        {loading ? (
          <p className="text-sm text-muted-foreground p-3 text-center">Cargando jugadores...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground p-3 text-center">Sin jugadores para estos filtros</p>
        ) : (
          filtered.map((p) => {
            const cat = getPlayerCategory(getBirthYear(p.birthDate), referenceYear);
            const isSelected = selected.has(p.id);
            return (
              <label
                key={p.id}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 ${isSelected ? "bg-blue-50/80" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(p.id)}
                  className="rounded"
                />
                <span className="text-sm flex-1 min-w-0 truncate">{formatPlayerName(p)}</span>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {CATEGORY_LABELS[cat]}
                </Badge>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
