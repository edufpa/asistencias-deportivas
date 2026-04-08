import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

async function getStats() {
  const [totalPlayers, activeConvocatorias, totalConvocatorias, recentCuts] =
    await Promise.all([
      prisma.player.count(),
      prisma.convocatoria.count({ where: { status: "ACTIVE" } }),
      prisma.convocatoria.count(),
      prisma.convocatoriaPlayer.findMany({
        where: { status: "CUT" },
        orderBy: { cutDate: "desc" },
        take: 5,
        include: {
          player: { select: { firstName: true, lastName: true } },
          convocatoria: { select: { id: true, name: true } },
          cutBy: { select: { name: true } },
        },
      }),
    ]);

  return { totalPlayers, activeConvocatorias, totalConvocatorias, recentCuts };
}

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {session?.user?.name}
        </h1>
        <p className="text-gray-500 mt-1">Resumen del sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Jugadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{stats.totalPlayers}</div>
            <Link
              href="/players"
              className="text-sm text-blue-500 hover:underline mt-1 block"
            >
              Ver todos →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Convocatorias Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.activeConvocatorias}
            </div>
            <Link
              href="/convocatorias"
              className="text-sm text-blue-500 hover:underline mt-1 block"
            >
              Ver todas →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Convocatorias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-700">
              {stats.totalConvocatorias}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos Cortes Realizados</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentCuts.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay cortes registrados aún.</p>
          ) : (
            <div className="divide-y">
              {stats.recentCuts.map((cut) => (
                <div key={cut.id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {cut.player.lastName}, {cut.player.firstName}
                    </p>
                    <Link
                      href={`/convocatorias/${cut.convocatoria.id}`}
                      className="text-sm text-blue-500 hover:underline"
                    >
                      {cut.convocatoria.name}
                    </Link>
                    {cut.cutReason && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        Motivo: {cut.cutReason}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="destructive">Cortado</Badge>
                    {cut.cutDate && (
                      <p className="text-xs text-gray-400 mt-1">
                        {format(cut.cutDate, "d MMM yyyy", { locale: es })}
                      </p>
                    )}
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
