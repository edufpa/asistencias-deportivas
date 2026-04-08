import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

async function getDashboardData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalPlayers,
    activeConvocatorias,
    recentCuts,
    recentMatches,
    attendanceStats,
    totalTests,
    recentEvals,
    topConvocatorias,
  ] = await Promise.all([
    prisma.player.count(),

    prisma.convocatoria.findMany({
      where: { status: "ACTIVE" },
      include: {
        _count: { select: { players: true } },
        players: { where: { status: "ACTIVE" }, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.convocatoriaPlayer.findMany({
      where: { status: "CUT", cutDate: { gte: thirtyDaysAgo } },
      orderBy: { cutDate: "desc" },
      take: 5,
      include: {
        player: { select: { id: true, firstName: true, lastName: true } },
        convocatoria: { select: { id: true, name: true } },
        cutBy: { select: { name: true } },
      },
    }),

    prisma.match.findMany({
      take: 5,
      orderBy: { matchDate: "desc" },
      include: { convocatoria: { select: { id: true, name: true } } },
    }),

    prisma.attendanceRecord.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { session: { sessionDate: { gte: thirtyDaysAgo } } },
    }),

    prisma.test.count(),

    prisma.testEvaluation.count({ where: { evalDate: { gte: thirtyDaysAgo } } }),

    prisma.convocatoria.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        _count: { select: { players: true, sessions: true } },
        players: { where: { status: "ACTIVE" }, select: { id: true } },
      },
    }),
  ]);

  const presentCount = attendanceStats.find((s) => s.status === "PRESENT")?._count._all ?? 0;
  const absentCount =
    (attendanceStats.find((s) => s.status === "ABSENT_JUSTIFIED")?._count._all ?? 0) +
    (attendanceStats.find((s) => s.status === "ABSENT_UNJUSTIFIED")?._count._all ?? 0);
  const totalAttendance = presentCount + absentCount;
  const attendancePct = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : null;

  return {
    totalPlayers,
    activeConvocatorias,
    recentCuts,
    recentMatches,
    attendancePct,
    presentCount,
    absentCount,
    totalTests,
    recentEvals,
    topConvocatorias,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const d = await getDashboardData();
  const now = new Date();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {session?.user?.name} 👋
        </h1>
        <p className="text-gray-500 mt-1 capitalize">
          {format(now, "EEEE d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href="/players">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
            <CardContent className="pt-5">
              <div className="text-3xl font-black text-blue-700">{d.totalPlayers}</div>
              <p className="text-sm text-gray-500 mt-1 font-medium">Jugadores</p>
              <p className="text-xs text-gray-400">en base de datos</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/convocatorias">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-500">
            <CardContent className="pt-5">
              <div className="text-3xl font-black text-green-600">{d.activeConvocatorias.length}</div>
              <p className="text-sm text-gray-500 mt-1 font-medium">Convocatorias</p>
              <p className="text-xs text-gray-400">activas ahora</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/reportes">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-orange-400">
            <CardContent className="pt-5">
              <div className="text-3xl font-black text-orange-500">
                {d.attendancePct !== null ? `${d.attendancePct}%` : "—"}
              </div>
              <p className="text-sm text-gray-500 mt-1 font-medium">Asistencia</p>
              <p className="text-xs text-gray-400">últimos 30 días</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/tests">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-purple-500">
            <CardContent className="pt-5">
              <div className="text-3xl font-black text-purple-600">{d.recentEvals}</div>
              <p className="text-sm text-gray-500 mt-1 font-medium">Evaluaciones</p>
              <p className="text-xs text-gray-400">últimos 30 días · {d.totalTests} tests</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Asistencia detalle */}
      {d.totalPlayers > 0 && d.attendancePct !== null && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">
              📋 Asistencia — Últimos 30 días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Presentes: {d.presentCount}</span>
                  <span>Ausentes: {d.absentCount}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-green-500 transition-all"
                    style={{ width: `${d.attendancePct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {d.presentCount + d.absentCount} registros totales
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-black text-green-600">{d.attendancePct}%</div>
                <Link href="/reportes" className="text-xs text-blue-500 hover:underline">Ver reporte →</Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Convocatorias activas */}
      {d.activeConvocatorias.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">🏊 Convocatorias Activas</CardTitle>
              <Link href="/convocatorias" className="text-xs text-blue-500 hover:underline">Ver todas →</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {d.activeConvocatorias.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <Link href={`/convocatorias/${c.id}`} className="font-medium text-gray-900 hover:text-blue-600 hover:underline">
                      {c.name}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.players.length} jugadores activos · {c._count.players} en total
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/convocatorias/${c.id}`}>
                      <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-blue-100">Ver</Badge>
                    </Link>
                    <Link href={`/convocatorias/${c.id}/asistencia`}>
                      <Badge variant="outline" className="text-xs cursor-pointer hover:bg-green-50 text-green-700 border-green-300">Asistencia</Badge>
                    </Link>
                    <Link href={`/convocatorias/${c.id}/partidos`}>
                      <Badge variant="outline" className="text-xs cursor-pointer hover:bg-orange-50 text-orange-700 border-orange-300">Partidos</Badge>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Últimos partidos */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">⚽ Últimos Partidos</CardTitle>
              <Link href="/reportes/partidos" className="text-xs text-blue-500 hover:underline">Ver reporte →</Link>
            </div>
          </CardHeader>
          <CardContent>
            {d.recentMatches.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Sin partidos registrados aún</p>
            ) : (
              <div className="divide-y">
                {d.recentMatches.map((m) => {
                  const result = m.homeScore !== null && m.awayScore !== null
                    ? m.homeScore > m.awayScore ? "W" : m.homeScore < m.awayScore ? "L" : "E"
                    : null;
                  return (
                    <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {m.opponent ? `vs ${m.opponent}` : "Sin rival"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(m.matchDate), "d MMM yyyy", { locale: es })} · {m.convocatoria.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {m.homeScore !== null && m.awayScore !== null && (
                          <span className="font-bold text-gray-700 text-sm">{m.homeScore}—{m.awayScore}</span>
                        )}
                        {result && (
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                            result === "W" ? "bg-green-100 text-green-700" :
                            result === "L" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>{result}</span>
                        )}
                        <Badge variant={m.matchType === "OFFICIAL" ? "default" : "secondary"} className="text-xs">
                          {m.matchType === "OFFICIAL" ? "Of." : "Prep."}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimos cortes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">✂️ Cortes Recientes (30 días)</CardTitle>
          </CardHeader>
          <CardContent>
            {d.recentCuts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Sin cortes en los últimos 30 días</p>
            ) : (
              <div className="divide-y">
                {d.recentCuts.map((cut) => (
                  <div key={cut.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/players/${cut.player.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline truncate block">
                        {cut.player.lastName}, {cut.player.firstName}
                      </Link>
                      <Link href={`/convocatorias/${cut.convocatoria.id}`} className="text-xs text-blue-500 hover:underline">
                        {cut.convocatoria.name}
                      </Link>
                      {cut.cutReason && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{cut.cutReason}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="destructive" className="text-xs">Cortado</Badge>
                      {cut.cutDate && (
                        <p className="text-xs text-gray-400 mt-1">
                          {format(cut.cutDate, "d MMM", { locale: es })}
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

      {/* Accesos rápidos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">⚡ Accesos Rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/players", label: "Nuevo Jugador", icon: "👤", color: "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200" },
              { href: "/convocatorias", label: "Convocatorias", icon: "📋", color: "bg-green-50 hover:bg-green-100 text-green-700 border-green-200" },
              { href: "/tests", label: "Tests", icon: "🏋️", color: "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200" },
              { href: "/reportes", label: "Reporte Asistencia", icon: "📊", color: "bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200" },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border cursor-pointer transition-colors ${item.color}`}>
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-sm font-medium text-center">{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
