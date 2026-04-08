"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConvocatoriaFormDialog } from "@/components/convocatorias/ConvocatoriaFormDialog";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const GENDER_LABEL: Record<string, string> = { MALE: "Varones", FEMALE: "Damas", MIXED: "Mixto" };
const GENDER_COLOR: Record<string, string> = { MALE: "bg-blue-100 text-blue-700", FEMALE: "bg-pink-100 text-pink-700", MIXED: "bg-purple-100 text-purple-700" };

type Convocatoria = {
  id: string;
  name: string;
  description: string | null;
  gender: string;
  status: "ACTIVE" | "CLOSED";
  startDate: string;
  creator: { name: string };
  _count: { players: number };
};

export default function ConvocatoriasPage() {
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);

  async function fetchConvocatorias() {
    setLoading(true);
    const res = await fetch("/api/convocatorias");
    const data = await res.json();
    setConvocatorias(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchConvocatorias();
  }, []);

  const active = convocatorias.filter((c) => c.status === "ACTIVE");
  const closed = convocatorias.filter((c) => c.status === "CLOSED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Convocatorias</h1>
          <p className="text-gray-500 mt-1">Administración de convocatorias y cortes</p>
        </div>
        <Button onClick={() => setOpenForm(true)}>+ Nueva convocatoria</Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Activas
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((c) => (
                  <ConvocatoriaCard key={c.id} convocatoria={c} />
                ))}
              </div>
            </div>
          )}

          {closed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Cerradas
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {closed.map((c) => (
                  <ConvocatoriaCard key={c.id} convocatoria={c} />
                ))}
              </div>
            </div>
          )}

          {convocatorias.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">
                No hay convocatorias. Creá la primera.
              </CardContent>
            </Card>
          )}
        </>
      )}

      <ConvocatoriaFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        onSuccess={fetchConvocatorias}
      />
    </div>
  );
}

function ConvocatoriaCard({ convocatoria: c }: { convocatoria: Convocatoria }) {
  return (
    <Link href={`/convocatorias/${c.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">{c.name}</CardTitle>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge variant={c.status === "ACTIVE" ? "default" : "secondary"}>
                {c.status === "ACTIVE" ? "Activa" : "Cerrada"}
              </Badge>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${GENDER_COLOR[c.gender ?? "MIXED"]}`}>
                {GENDER_LABEL[c.gender ?? "MIXED"]}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {c.description && (
            <p className="text-sm text-gray-500 line-clamp-2">{c.description}</p>
          )}
          <p className="text-xs text-gray-400">
            {c._count.players} jugador{c._count.players !== 1 ? "es" : ""} activo
            {c._count.players !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-gray-400">
            Creada por {c.creator.name} · {format(new Date(c.startDate), "d MMM yyyy", { locale: es })}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
