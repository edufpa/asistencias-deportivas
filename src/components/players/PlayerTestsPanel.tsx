"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { es } from "date-fns/locale";
import { formatSessionDate } from "@/lib/sessionDate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSecondsAsMmSsCc, formatTestValue, isTimeLikeUnit } from "@/lib/testTimeFormat";
import { groupTestsByCategory, type TestCategory } from "@/lib/testCategory";
import { LoadingState, EmptyState, PageTabs, DataTableWrap } from "@/components/layout";

const IndividualLineChart = dynamic(
  () => import("@/components/charts/TestLineChart").then((m) => m.TestLineChart),
  { ssr: false, loading: () => <div className="h-40 animate-pulse bg-gray-100 rounded-lg" /> }
);

type Evaluation = { id: string; value: number; evalDate: string; notes: string | null };

type TestGroup = {
  testId: string;
  testName: string;
  unit: string;
  higherIsBetter: boolean;
  category: TestCategory;
  evaluations: Evaluation[];
};

type TestSummary = {
  latest: Evaluation;
  record: Evaluation;
  avg: number;
  sorted: Evaluation[];
};

function summarizeTest(test: TestGroup): TestSummary {
  const sorted = [...test.evaluations].sort(
    (a, b) => new Date(a.evalDate).getTime() - new Date(b.evalDate).getTime()
  );
  const latest = sorted[sorted.length - 1];
  const record = test.higherIsBetter
    ? sorted.reduce((a, b) => (b.value > a.value ? b : a))
    : sorted.reduce((a, b) => (b.value < a.value ? b : a));
  const avg = sorted.reduce((s, e) => s + e.value, 0) / sorted.length;
  return { latest, record, avg, sorted };
}

function TestDetail({ test, onBack }: { test: TestGroup; onBack?: () => void }) {
  const { latest, record, avg, sorted } = summarizeTest(test);
  const timeU = isTimeLikeUnit(test.unit);
  const chartData = sorted.map((ev) => ({
    date: formatSessionDate(ev.evalDate, "d MMM", { locale: es }),
    value: ev.value,
  }));
  const chartFmt = timeU ? (n: number) => formatSecondsAsMmSsCc(n) : undefined;

  return (
    <div className="space-y-3">
      {onBack && (
        <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" onClick={onBack}>
          ← Volver al listado
        </Button>
      )}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">
              <Link href={`/tests/${test.testId}`} className="hover:text-blue-600 hover:underline">
                {test.testName}
              </Link>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{test.unit}</Badge>
              <Badge variant="secondary">{test.higherIsBetter ? "Mayor = mejor" : "Menor = mejor"}</Badge>
              <span className="text-xs text-gray-400">
                {test.evaluations.length} eval{test.evaluations.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div className="text-center bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-700 font-mono">
                {formatTestValue(latest.value, test.unit)}
              </div>
              <p className="text-xs text-gray-500">{test.unit} — Último</p>
              <p className="text-xs text-gray-400">
                {formatSessionDate(latest.evalDate, "d MMM yyyy", { locale: es })}
              </p>
            </div>
            <div className="text-center bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600 font-mono">
                {formatTestValue(record.value, test.unit)}
              </div>
              <p className="text-xs text-gray-500">{test.unit} — Récord</p>
              <p className="text-xs text-gray-400">
                {formatSessionDate(record.evalDate, "d MMM yyyy", { locale: es })}
              </p>
            </div>
            <div className="text-center bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-700 font-mono">
                {timeU ? formatSecondsAsMmSsCc(avg) : avg.toFixed(1)}
              </div>
              <p className="text-xs text-gray-500">{test.unit} — Promedio</p>
            </div>
          </div>
          {sorted.length > 1 && (
            <IndividualLineChart
              data={chartData}
              unit={test.unit}
              testName={test.testName}
              formatValue={chartFmt}
            />
          )}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-1.5 font-medium text-gray-600">Fecha</th>
                  <th className="px-3 py-1.5 font-medium text-gray-600 text-right">Marca</th>
                  <th className="px-3 py-1.5 font-medium text-gray-600">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...sorted].reverse().map((ev) => (
                  <tr key={ev.id}>
                    <td className="px-3 py-1.5 text-gray-600">
                      {formatSessionDate(ev.evalDate, "d MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-3 py-1.5 text-right font-bold text-blue-700 font-mono">
                      {formatTestValue(ev.value, test.unit)}
                    </td>
                    <td className="px-3 py-1.5 text-gray-400 italic text-xs">{ev.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TestListSummary({
  tests,
  onSelect,
}: {
  tests: TestGroup[];
  onSelect: (testId: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <DataTableWrap className="border-0 rounded-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Prueba</TableHead>
                <TableHead className="font-semibold text-right">Récord</TableHead>
                <TableHead className="font-semibold">Fecha réc.</TableHead>
                <TableHead className="font-semibold text-right">Última</TableHead>
                <TableHead className="font-semibold">Fecha últ.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => {
                const { latest, record } = summarizeTest(test);
                return (
                  <TableRow
                    key={test.testId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onSelect(test.testId)}
                  >
                    <TableCell className="font-medium text-sm">{test.testName}</TableCell>
                    <TableCell className="text-right font-bold text-green-700 font-mono text-sm">
                      {formatTestValue(record.value, test.unit)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatSessionDate(record.evalDate, "d MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary font-mono text-sm">
                      {formatTestValue(latest.value, test.unit)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatSessionDate(latest.evalDate, "d MMM yyyy", { locale: es })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableWrap>
      </CardContent>
    </Card>
  );
}

export function PlayerTestsPanel({ playerId }: { playerId: string }) {
  const [tests, setTests] = useState<TestGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<TestCategory | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/players/${playerId}/tests`)
      .then((r) => r.json())
      .then((t) => {
        const list: TestGroup[] = Array.isArray(t)
          ? t.map((item) => ({
              ...item,
              category: (item.category ?? "NATACION") as TestCategory,
            }))
          : [];
        setTests(list);
        if (list.length > 0) {
          const groups = groupTestsByCategory(
            list.map((x) => ({ ...x, name: x.testName, category: x.category }))
          );
          const firstGroup = groups[0];
          if (firstGroup) {
            setActiveCategory(firstGroup.category);
            setSelectedTestId(firstGroup.tests.length === 1 ? firstGroup.tests[0].testId : null);
          }
        }
        setLoading(false);
      });
  }, [playerId]);

  const categoryGroups = useMemo(
    () =>
      groupTestsByCategory(
        tests.map((t) => ({ ...t, name: t.testName, category: t.category }))
      ),
    [tests]
  );

  const activeGroup = categoryGroups.find((g) => g.category === activeCategory) ?? categoryGroups[0];
  const testsInCategory = (activeGroup?.tests ?? []) as TestGroup[];
  const singleTestInCategory = testsInCategory.length === 1;
  const showingList = !singleTestInCategory && selectedTestId === null;

  const detailTest = singleTestInCategory
    ? testsInCategory[0]
    : selectedTestId
      ? testsInCategory.find((t) => t.testId === selectedTestId)
      : null;

  function handleCategoryChange(category: TestCategory) {
    setActiveCategory(category);
    const group = categoryGroups.find((g) => g.category === category);
    if (!group) return;
    setSelectedTestId(group.tests.length === 1 ? group.tests[0].testId : null);
  }

  if (loading) return <LoadingState message="Cargando tests..." />;

  if (tests.length === 0) {
    return <EmptyState message="Sin evaluaciones registradas para este jugador" />;
  }

  if (!activeGroup || testsInCategory.length === 0) {
    return <EmptyState message="Sin evaluaciones registradas para este jugador" />;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto -mx-1 px-1">
        <PageTabs
          tabs={categoryGroups.map((g) => ({ id: g.category, label: g.label }))}
          value={activeGroup.category}
          onChange={handleCategoryChange}
          className="min-w-max"
        />
      </div>

      {showingList ? (
        <TestListSummary tests={testsInCategory} onSelect={setSelectedTestId} />
      ) : detailTest ? (
        <TestDetail
          test={detailTest}
          onBack={singleTestInCategory ? undefined : () => setSelectedTestId(null)}
        />
      ) : null}
    </div>
  );
}
