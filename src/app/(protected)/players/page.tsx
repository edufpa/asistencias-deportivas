"use client";

import { useState, useEffect, useCallback } from "react";
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
import { PlayerFormDialog } from "@/components/players/PlayerFormDialog";
import { format, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string;
  club: string | null;
  birthDate: string;
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/players?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setPlayers(data);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(fetchPlayers, 300);
    return () => clearTimeout(timeout);
  }, [fetchPlayers]);

  function handleEdit(player: Player) {
    setEditingPlayer(player);
    setOpenForm(true);
  }

  function handleNew() {
    setEditingPlayer(null);
    setOpenForm(true);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/players/${id}`, { method: "DELETE" });
    fetchPlayers();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jugadores</h1>
          <p className="text-gray-500 mt-1">Base de datos de deportistas</p>
        </div>
        <Button onClick={handleNew}>+ Nuevo jugador</Button>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Buscar por nombre, apellido, documento o club..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Apellido y Nombre</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Club</TableHead>
              <TableHead>Edad</TableHead>
              <TableHead>Nacimiento</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : players.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                  {search ? "Sin resultados para la búsqueda" : "No hay jugadores cargados"}
                </TableCell>
              </TableRow>
            ) : (
              players.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/players/${p.id}`}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {p.lastName}, {p.firstName}
                    </Link>
                  </TableCell>
                  <TableCell>{p.documentId}</TableCell>
                  <TableCell>
                    {p.club ? (
                      <Badge variant="secondary">{p.club}</Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {differenceInYears(new Date(), new Date(p.birthDate))} años
                  </TableCell>
                  <TableCell>
                    {format(new Date(p.birthDate), "d MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(p)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(p.id, `${p.firstName} ${p.lastName}`)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PlayerFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        player={editingPlayer}
        onSuccess={fetchPlayers}
      />
    </div>
  );
}
