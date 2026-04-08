import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      convocatorias: {
        include: {
          convocatoria: { select: { id: true, name: true, status: true } },
        },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  if (!player) notFound();

  const age = differenceInYears(new Date(), player.birthDate);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/players" className="text-gray-400 hover:text-gray-600">
          ← Volver
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {player.lastName}, {player.firstName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block">Documento</span>
              <span className="font-medium">{player.documentId}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Club</span>
              <span className="font-medium">{player.club ?? "—"}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Fecha de nacimiento</span>
              <span className="font-medium">
                {format(player.birthDate, "d 'de' MMMM 'de' yyyy", { locale: es })}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Edad</span>
              <span className="font-medium">{age} años</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de Convocatorias</CardTitle>
        </CardHeader>
        <CardContent>
          {player.convocatorias.length === 0 ? (
            <p className="text-gray-400 text-sm">Sin convocatorias registradas</p>
          ) : (
            <div className="divide-y">
              {player.convocatorias.map((cp) => (
                <div key={cp.id} className="py-3 flex items-center justify-between">
                  <div>
                    <Link
                      href={`/convocatorias/${cp.convocatoria.id}`}
                      className="font-medium hover:text-blue-600 hover:underline"
                    >
                      {cp.convocatoria.name}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Convocado:{" "}
                      {format(cp.joinedAt, "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cp.status === "CUT" ? (
                      <Badge variant="destructive">Cortado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        Activo
                      </Badge>
                    )}
                    <Badge
                      variant={cp.convocatoria.status === "ACTIVE" ? "default" : "secondary"}
                    >
                      {cp.convocatoria.status === "ACTIVE" ? "Activa" : "Cerrada"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
