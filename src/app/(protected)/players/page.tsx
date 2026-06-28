"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlayerFormDialog, type PlayerFormData } from "@/components/players/PlayerFormDialog";
import { format, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import Image from "next/image";
import {
  formatPlayerName,
  DOCUMENT_TYPE_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  PLAYER_GENDER_LABELS,
  PLAYER_STATUS_LABELS,
  CATEGORIES,
  CATEGORY_LABELS,
  getBirthYear,
  getPlayerCategory,
  matchesPlayerGender,
} from "@/lib/player";
import type { Category, PlayerGender } from "@/lib/player";
import type { PlayerStatus } from "@prisma/client";
import { useAppRole } from "@/hooks/useAppRole";
import {
  PageShell,
  PageHeader,
  FilterChip,
  FilterChipGroup,
  FilterPanel,
  LoadingState,
  EmptyState,
  DataTableWrap,
} from "@/components/layout";
import { canEditPlayers, canAccessPlayersList } from "@/lib/permissions";
import { RoleGate } from "@/components/RoleGate";

type Player = PlayerFormData;

function PlayerStatusBadge({ status }: { status: PlayerStatus }) {
  const variant =
    status === "SUSPENDED" ? "destructive" : status === "INACTIVE" ? "secondary" : "default";
  return <Badge variant={variant}>{PLAYER_STATUS_LABELS[status]}</Badge>;
}

export default function PlayersPage() {
  const router = useRouter();
  const role = useAppRole();
  const canEdit = canEditPlayers(role);
  const referenceYear = new Date().getFullYear();
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<Category | "ALL">("ALL");
  const [filterGender, setFilterGender] = useState<PlayerGender | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (role === "PARENT") {
      router.replace("/mi-perfil");
    }
  }, [role, router]);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/players?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setPlayers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(fetchPlayers, 300);
    return () => clearTimeout(timeout);
  }, [fetchPlayers]);

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (filterGender !== "ALL" && !matchesPlayerGender(p.gender, filterGender)) {
        return false;
      }
      if (filterCategory !== "ALL") {
        const cat = getPlayerCategory(getBirthYear(p.birthDate), referenceYear);
        if (cat !== filterCategory) return false;
      }
      return true;
    });
  }, [players, filterCategory, filterGender, referenceYear]);

  function handleNew() {
    setEditingPlayer(null);
    setOpenForm(true);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/players/${id}`, { method: "DELETE" });
    fetchPlayers();
  }

  const hasActiveFilters = filterCategory !== "ALL" || filterGender !== "ALL";

  if (role === "PARENT") {
    return null;
  }

  return (
    <RoleGate allow={canAccessPlayersList}>
    <PageShell>
      <PageHeader
        title="Jugadores"
        description="Datos personales del plantel"
        actions={canEdit ? <Button onClick={handleNew}>+ Nuevo jugador</Button> : undefined}
      />

      <div className="space-y-3">
        <Input
          placeholder="Buscar por nombre, apellidos, documento o carnet..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />

        <FilterPanel>
          <FilterChipGroup label={`Categoría (${referenceYear})`} className="flex-1 min-w-0">
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
        </FilterPanel>
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <LoadingState />
        </div>
      ) : filteredPlayers.length === 0 ? (
        <EmptyState
          message={
            search || hasActiveFilters
              ? "Sin resultados para la búsqueda o filtros"
              : "No hay jugadores cargados"
          }
        />
      ) : (
      <DataTableWrap>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14" />
              <TableHead>Apellidos y nombres</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Género</TableHead>
              <TableHead>Asociado</TableHead>
              <TableHead>Situación</TableHead>
              <TableHead>Edad</TableHead>
              <TableHead>Incorporación</TableHead>
              {canEdit && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
              {filteredPlayers.map((p) => {
                const category = getPlayerCategory(getBirthYear(p.birthDate), referenceYear);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="py-2">
                      <div className="relative w-10 h-10 rounded-full border bg-gray-50 overflow-hidden shrink-0">
                        {p.photoUrl ? (
                          <Image src={p.photoUrl} alt="" fill className="object-cover" unoptimized />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400">
                            —
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/players/${p.id}`}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {formatPlayerName(p)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {CATEGORY_LABELS[category]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{DOCUMENT_TYPE_LABELS[p.documentType]}</span>
                      <br />
                      {p.documentId}
                    </TableCell>
                    <TableCell>
                      {PLAYER_GENDER_LABELS[p.gender === "FEMALE" ? "FEMALE" : "MALE"]}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.membershipStatus === "ASOCIADO" ? "default" : "secondary"}>
                        {MEMBERSHIP_STATUS_LABELS[p.membershipStatus]}
                      </Badge>
                      {p.membershipCardNumber && (
                        <p className="text-xs text-gray-400 mt-0.5">Carnet {p.membershipCardNumber}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <PlayerStatusBadge status={p.playerStatus ?? "ACTIVE"} />
                    </TableCell>
                    <TableCell>
                      {differenceInYears(new Date(), new Date(p.birthDate))} años
                    </TableCell>
                    <TableCell>
                      {p.teamJoinDate
                        ? format(new Date(p.teamJoinDate), "d MMM yyyy", { locale: es })
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 text-xs"
                          onClick={() => handleDelete(p.id, formatPlayerName(p))}
                        >
                          Eliminar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </DataTableWrap>
      )}

      <PlayerFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        player={editingPlayer}
        onSuccess={fetchPlayers}
      />
    </PageShell>
    </RoleGate>
  );
}
