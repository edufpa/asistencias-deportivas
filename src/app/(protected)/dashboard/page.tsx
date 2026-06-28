import Link from "next/link";
import { requireServerRole } from "@/lib/require-role";
import { canAccessDashboard } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getDashboardKpis } from "@/lib/dashboardStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { DashboardKpiCards } from "@/components/dashboard/DashboardKpiCards";
import { PageHeader, PageShell, SectionHeading } from "@/components/layout";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  getBirthYear,
  getPlayerCategory,
  type Category,
} from "@/lib/player";

type CategoryGenderCounts = Record<Category, { male: number; female: number }>;

function emptyCounts(): CategoryGenderCounts {
  return CATEGORIES.reduce((acc, cat) => {
    acc[cat] = { male: 0, female: 0 };
    return acc;
  }, {} as CategoryGenderCounts);
}

async function getPlayersByCategoryAndGender() {
  const referenceYear = new Date().getFullYear();
  const players = await prisma.player.findMany({
    where: { playerStatus: "ACTIVE" },
    select: { birthDate: true, gender: true },
  });

  const counts = emptyCounts();

  for (const p of players) {
    const category = getPlayerCategory(getBirthYear(p.birthDate), referenceYear);
    if (p.gender === "FEMALE") {
      counts[category].female += 1;
    } else {
      counts[category].male += 1;
    }
  }

  const totals = players.length;
  const totalMale = CATEGORIES.reduce((s, c) => s + counts[c].male, 0);
  const totalFemale = CATEGORIES.reduce((s, c) => s + counts[c].female, 0);

  return { counts, totals: { all: totals, male: totalMale, female: totalFemale }, referenceYear };
}

export default async function DashboardPage() {
  const { session, role } = await requireServerRole(canAccessDashboard, "/mi-perfil");
  const [{ counts, totals, referenceYear }, kpis] = await Promise.all([
    getPlayersByCategoryAndGender(),
    getDashboardKpis(),
  ]);
  const now = new Date();

  return (
    <PageShell>
      <PageHeader
        title={`Bienvenido, ${session?.user?.name}`}
        description={format(now, "EEEE d 'de' MMMM yyyy", { locale: es })}
      />

      <section className="space-y-3">
        <SectionHeading title="Acciones rápidas" />
        <DashboardQuickActions role={role} pendingUsers={kpis.pendingUsers} />
      </section>

      <DashboardKpiCards kpis={kpis} />

      <Card>
        <CardHeader>
          <CardTitle>Cantidad de jugadores por categoría</CardTitle>
          <CardDescription>
            Plantel activo {referenceYear} — varones y damas. Clic en una fila para ver el reporte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totals.all === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No hay jugadores activos registrados
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Categoría</TableHead>
                    <TableHead className="text-center font-semibold text-blue-800">Varones</TableHead>
                    <TableHead className="text-center font-semibold text-pink-700">Damas</TableHead>
                    <TableHead className="text-center font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CATEGORIES.map((cat) => {
                    const row = counts[cat];
                    const rowTotal = row.male + row.female;
                    const href = `/reportes?category=${cat}&period=30`;
                    return (
                      <TableRow
                        key={cat}
                        className="cursor-pointer transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="p-0 font-medium">
                          <Link href={href} className="block px-4 py-2">
                            {CATEGORY_LABELS[cat]}
                          </Link>
                        </TableCell>
                        <TableCell className="p-0 text-center tabular-nums">
                          <Link href={`${href}&gender=MALE`} className="block px-4 py-2">
                            {row.male}
                          </Link>
                        </TableCell>
                        <TableCell className="p-0 text-center tabular-nums">
                          <Link href={`${href}&gender=FEMALE`} className="block px-4 py-2">
                            {row.female}
                          </Link>
                        </TableCell>
                        <TableCell className="p-0 text-center tabular-nums font-semibold">
                          <Link href={href} className="block px-4 py-2">
                            {rowTotal}
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Total general</TableCell>
                    <TableCell className="text-center tabular-nums text-blue-800">{totals.male}</TableCell>
                    <TableCell className="text-center tabular-nums text-pink-700">{totals.female}</TableCell>
                    <TableCell className="text-center tabular-nums">{totals.all}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
