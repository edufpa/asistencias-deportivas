"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EvaluationTimeInputs } from "@/components/tests/EvaluationTimeInputs";
import {
  formatSecondsAsMmSsCc,
  formatTestValue,
  isCompleteTimeParts,
  isTimeLikeUnit,
  secondsToTimePartsStrings,
  timePartsStringsToSeconds,
  type TimePartsStrings,
} from "@/lib/testTimeFormat";
import { formatPlayerName, CATEGORIES, CATEGORY_LABELS, PLAYER_GENDER_OPTIONS, getBirthYear, getPlayerCategory, matchesPlayerGender } from "@/lib/player";
import type { Category, PlayerGender } from "@/lib/player";
import {
  PageShell,
  PageHeader,
  FilterChip,
  FilterChipGroup,
  FilterPanel,
  SectionHeading,
  LoadingState,
  DataTableWrap,
  EmptyState,
} from "@/components/layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatSessionDate, todayDateOnly, isFutureDateOnly, toDateOnlyString } from "@/lib/sessionDate";

const IndividualLineChart = dynamic(
  () => import("@/components/charts/TestLineChart").then((m) => m.TestLineChart),
  { ssr: false, loading: () => <div className="h-52 animate-pulse bg-gray-100 rounded-lg" /> }
);

type Evaluation = {
  id: string;
  value: number;
  evalDate: string;
  createdAt?: string;
  notes: string | null;
  player: { id: string; firstName: string; paternalLastName: string; maternalLastName: string };
  recordedBy: { name: string };
};

type Test = {
  id: string;
  name: string;
  unit: string;
  description: string | null;
  higherIsBetter: boolean;
  evaluations: Evaluation[];
};

type Player = {
  id: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  birthDate: string;
  gender: string;
};

type CategoryFilter = Category | "ALL";
type GenderFilter = PlayerGender | "ALL";

function filterPlayersList(
  players: Player[],
  search: string,
  categoryFilter: CategoryFilter,
  genderFilter: GenderFilter,
  referenceYear: number
) {
  const q = search.trim().toLowerCase();
  return players.filter((p) => {
    if (categoryFilter !== "ALL") {
      const cat = getPlayerCategory(getBirthYear(p.birthDate), referenceYear);
      if (cat !== categoryFilter) return false;
    }
    if (genderFilter !== "ALL" && !matchesPlayerGender(p.gender, genderFilter)) {
      return false;
    }
    if (!q) return true;
    return formatPlayerName(p).toLowerCase().includes(q);
  });
}

export default function TestDetailPage() {
  const { id: testId } = useParams<{ id: string }>();
  const [test, setTest] = useState<Test | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [evalDate, setEvalDate] = useState(todayDateOnly());
  const todayMax = todayDateOnly();
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [timeEntries, setTimeEntries] = useState<Record<string, TimePartsStrings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [playerHistory, setPlayerHistory] = useState<Evaluation[]>([]);
  const [editEval, setEditEval] = useState<Evaluation | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editTimeParts, setEditTimeParts] = useState<TimePartsStrings>({ min: "", sec: "", cs: "" });
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [evalFormError, setEvalFormError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("ALL");
  const [histCategoryFilter, setHistCategoryFilter] = useState<CategoryFilter>("ALL");
  const [histGenderFilter, setHistGenderFilter] = useState<GenderFilter>("ALL");

  const referenceYear = new Date().getFullYear();

  const filteredPlayers = useMemo(
    () => filterPlayersList(players, search, categoryFilter, genderFilter, referenceYear),
    [players, search, categoryFilter, genderFilter, referenceYear]
  );

  const filteredPlayersHist = useMemo(
    () => filterPlayersList(players, "", histCategoryFilter, histGenderFilter, referenceYear),
    [players, histCategoryFilter, histGenderFilter, referenceYear]
  );

  useEffect(() => {
    if (selectedPlayer && !filteredPlayersHist.some((p) => p.id === selectedPlayer)) {
      setSelectedPlayer(null);
      setPlayerHistory([]);
    }
  }, [filteredPlayersHist, selectedPlayer]);

  const fetchTest = useCallback(async () => {
    const res = await fetch(`/api/tests/${testId}`);
    if (res.ok) setTest(await res.json());
  }, [testId]);

  useEffect(() => {
    fetchTest();
    fetch("/api/players").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setPlayers(d);
    });
  }, [fetchTest]);

  async function fetchPlayerHistory(pid: string) {
    const res = await fetch(`/api/tests/${testId}/evaluations?playerId=${pid}`);
    if (res.ok) setPlayerHistory(await res.json());
  }

  function openEditEval(ev: Evaluation) {
    setEditEval(ev);
    setEvalFormError("");
    if (test && isTimeLikeUnit(test.unit)) {
      setEditTimeParts(secondsToTimePartsStrings(ev.value));
      setEditValue("");
    } else {
      setEditValue(String(ev.value));
      setEditTimeParts({ min: "", sec: "", cs: "" });
    }
    setEditDate(toDateOnlyString(ev.evalDate) ?? "");
    setEditNotes(ev.notes ?? "");
  }

  async function handleSaveEval() {
    if (!editEval || !test) return;
    setEvalFormError("");
    let valueNum: number;
    if (isTimeLikeUnit(test.unit)) {
      if (!isCompleteTimeParts(editTimeParts)) {
        setEvalFormError("Completá minutos, segundos (0–59) y centésimas (0–99).");
        return;
      }
      const s = timePartsStringsToSeconds(editTimeParts);
      if (s === null) {
        setEvalFormError("Valores de tiempo inválidos.");
        return;
      }
      valueNum = s;
    } else {
      valueNum = Number(editValue);
      if (Number.isNaN(valueNum)) {
        setEvalFormError("Ingresá un número válido.");
        return;
      }
    }
    if (isFutureDateOnly(editDate)) {
      setEvalFormError("La fecha no puede ser futura.");
      return;
    }
    setEditSaving(true);
    await fetch(`/api/tests/${testId}/evaluations/${editEval.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: valueNum, evalDate: editDate, notes: editNotes || null }),
    });
    setEditSaving(false);
    setEditEval(null);
    fetchTest();
    if (selectedPlayer) fetchPlayerHistory(selectedPlayer);
  }

  async function handleDeleteEval(evalId: string) {
    if (!confirm("¿Eliminar esta evaluación?")) return;
    await fetch(`/api/tests/${testId}/evaluations/${evalId}`, { method: "DELETE" });
    fetchTest();
    if (selectedPlayer) fetchPlayerHistory(selectedPlayer);
  }

  async function handleSave() {
    if (!test) return;
    let toSave: { playerId: string; value: number; evalDate: string }[] = [];
    if (isTimeLikeUnit(test.unit)) {
      for (const p of players) {
        const parts = timeEntries[p.id];
        if (!parts || !isCompleteTimeParts(parts)) continue;
        const sec = timePartsStringsToSeconds(parts);
        if (sec === null) continue;
        toSave.push({ playerId: p.id, value: sec, evalDate });
      }
    } else {
      toSave = Object.entries(entries)
        .filter(([, v]) => v !== "" && !isNaN(Number(v)))
        .map(([playerId, value]) => ({ playerId, value: Number(value), evalDate }));
    }

    if (toSave.length === 0) {
      setError(isTimeLikeUnit(test.unit) ? "Ingresá al menos una marca con min : seg . cs completa" : "Ingresá al menos una marca");
      return;
    }
    if (isFutureDateOnly(evalDate)) {
      setError("La fecha de evaluación no puede ser futura");
      return;
    }
    setError(""); setSaving(true);

    const res = await fetch(`/api/tests/${testId}/evaluations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evaluations: toSave }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al guardar");
      return;
    }
    setSaved(true);
    setEntries({});
    setTimeEntries({});
    fetchTest();
    if (selectedPlayer) fetchPlayerHistory(selectedPlayer);
  }

  // Ranking: récord y última marca por jugador (respeta filtros de registro)
  const teamRanking = useMemo(() => {
    if (!test) return [];
    const filteredIds = new Set(filteredPlayers.map((p) => p.id));
    const playerById = new Map(players.map((p) => [p.id, p]));
    const byPlayer = new Map<
      string,
      {
        player: Evaluation["player"];
        best: { value: number; evalDate: string };
        latest: { value: number; evalDate: string; createdAt: number };
      }
    >();

    for (const ev of test.evaluations) {
      if (!filteredIds.has(ev.player.id)) continue;
      const date = toDateOnlyString(ev.evalDate) ?? ev.evalDate;
      const createdAt = ev.createdAt ? new Date(ev.createdAt).getTime() : 0;
      const current = byPlayer.get(ev.player.id);

      if (!current) {
        byPlayer.set(ev.player.id, {
          player: ev.player,
          best: { value: ev.value, evalDate: date },
          latest: { value: ev.value, evalDate: date, createdAt },
        });
        continue;
      }

      const isBetter = test.higherIsBetter
        ? ev.value > current.best.value
        : ev.value < current.best.value;
      if (isBetter) {
        current.best = { value: ev.value, evalDate: date };
      }

      if (
        date > current.latest.evalDate ||
        (date === current.latest.evalDate && createdAt >= current.latest.createdAt)
      ) {
        current.latest = { value: ev.value, evalDate: date, createdAt };
      }
    }

    return Array.from(byPlayer.values())
      .map((row) => {
        const p = playerById.get(row.player.id);
        const cat = p
          ? getPlayerCategory(getBirthYear(p.birthDate), referenceYear)
          : ("OPEN" as Category);
        return {
          name: formatPlayerName(row.player),
          categoryLabel: CATEGORY_LABELS[cat],
          best: row.best,
          latest: row.latest,
        };
      })
      .sort((a, b) =>
        test.higherIsBetter ? b.best.value - a.best.value : a.best.value - b.best.value
      );
  }, [test, filteredPlayers, players, referenceYear]);

  // Build individual chart
  const individualChartData = playerHistory.map((ev) => ({
    date: formatSessionDate(ev.evalDate, "d MMM", { locale: es }),
    value: ev.value,
  }));

  if (!test) return <LoadingState message="Cargando..." />;

  const timeMode = isTimeLikeUnit(test.unit);
  const chartFormatValue = timeMode ? (n: number) => formatSecondsAsMmSsCc(n) : undefined;

  const editEvalDialog = (
    <Dialog
      open={!!editEval}
      onOpenChange={(o) => {
        if (!o) {
          setEditEval(null);
          setEvalFormError("");
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Editar Evaluación</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Fecha</Label>
            <Input type="date" value={editDate} max={todayMax} onChange={(e) => setEditDate(e.target.value)} />
          </div>
          {timeMode ? (
            <div className="space-y-1">
              <Label>Tiempo (min : seg . centésimas)</Label>
              <p className="text-xs text-gray-500">Segundos 0–59, centésimas 0–99</p>
              <EvaluationTimeInputs
                value={editTimeParts}
                onChange={(next) => {
                  setEvalFormError("");
                  setEditTimeParts(next);
                }}
              />
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Marca ({test.unit})</Label>
              <Input type="number" step="any" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
            </div>
          )}
          {evalFormError && (
            <Alert variant="destructive"><AlertDescription>{evalFormError}</AlertDescription></Alert>
          )}
          <div className="space-y-1">
            <Label>Notas</Label>
            <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Observaciones..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditEval(null)}>Cancelar</Button>
          <Button onClick={handleSaveEval} disabled={editSaving}>{editSaving ? "Guardando..." : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <PageShell>
      {editEvalDialog}
      <Link href="/tests" className="text-sm text-muted-foreground hover:text-foreground">
        ← Tests
      </Link>

      <PageHeader
        title={test.name}
        description={test.description ?? undefined}
        actions={
          <>
            <Badge variant="outline">{test.unit}</Badge>
            <Badge variant="secondary">{test.higherIsBetter ? "Mayor = mejor" : "Menor = mejor"}</Badge>
          </>
        }
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Registro de marcas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Registrar Evaluación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FilterPanel className="space-y-3 p-3 bg-muted/40 rounded-lg border">
              <div className="space-y-1">
                <Label htmlFor="playerSearch" className="text-xs">Buscar jugador</Label>
                <Input
                  id="playerSearch"
                  placeholder="Nombre o apellido..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9"
                />
              </div>
              <FilterChipGroup label="Categoría" className="flex-wrap">
                <FilterChip active={categoryFilter === "ALL"} onClick={() => setCategoryFilter("ALL")}>
                  Todas
                </FilterChip>
                {CATEGORIES.map((cat) => (
                  <FilterChip
                    key={cat}
                    active={categoryFilter === cat}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {CATEGORY_LABELS[cat]}
                  </FilterChip>
                ))}
              </FilterChipGroup>
              <FilterChipGroup label="Género" className="flex-wrap">
                <FilterChip active={genderFilter === "ALL"} onClick={() => setGenderFilter("ALL")}>
                  Todos
                </FilterChip>
                {PLAYER_GENDER_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt.value}
                    active={genderFilter === opt.value}
                    onClick={() => setGenderFilter(opt.value)}
                  >
                    {opt.label}
                  </FilterChip>
                ))}
              </FilterChipGroup>
              <p className="text-xs text-muted-foreground">
                {filteredPlayers.length} de {players.length} jugador{players.length !== 1 ? "es" : ""}
              </p>
            </FilterPanel>
            <div className="space-y-1">
              <Label>Fecha de evaluación</Label>
              <Input type="date" value={evalDate} max={todayMax} onChange={(e) => setEvalDate(e.target.value)} />
            </div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {saved && <Alert><AlertDescription className="text-green-700">✓ Marcas guardadas correctamente</AlertDescription></Alert>}
            {timeMode && (
              <p className="text-xs text-gray-500">
                Tiempo: <span className="font-mono">min : seg . cs</span> (ej. 1:05.37 = 1 min 5 seg 37 centésimas)
              </p>
            )}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {filteredPlayers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Ningún jugador coincide con los filtros
                </p>
              ) : (
              filteredPlayers.map((p) => (
                <div key={p.id} className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{formatPlayerName(p)}</p>
                  </div>
                  {timeMode ? (
                    <EvaluationTimeInputs
                      value={timeEntries[p.id] ?? { min: "", sec: "", cs: "" }}
                      onChange={(next) => {
                        setSaved(false);
                        setTimeEntries((prev) => ({ ...prev, [p.id]: next }));
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="—"
                        value={entries[p.id] ?? ""}
                        onChange={(e) => {
                          setSaved(false);
                          setEntries((prev) => ({ ...prev, [p.id]: e.target.value }));
                        }}
                        className="w-24 text-right"
                      />
                      <span className="text-xs text-gray-500 w-8">{test.unit}</span>
                    </div>
                  )}
                </div>
              ))
              )}
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Guardando..." : "Guardar marcas"}
            </Button>
          </CardContent>
        </Card>

        {/* Ranking equipo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ranking del Equipo</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {teamRanking.length === 0 ? (
              <EmptyState message="Sin datos aún" className="py-8" />
            ) : (
              <DataTableWrap className="border-0 rounded-none max-h-[420px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Nombre</TableHead>
                      <TableHead className="font-semibold w-16">Cat.</TableHead>
                      <TableHead className="font-semibold text-right">Récord</TableHead>
                      <TableHead className="font-semibold">Fecha réc.</TableHead>
                      <TableHead className="font-semibold text-right">Última</TableHead>
                      <TableHead className="font-semibold">Fecha últ.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamRanking.map((row, i) => (
                      <TableRow key={`${row.name}-${i}`}>
                        <TableCell className="text-sm font-medium">{row.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.categoryLabel}</TableCell>
                        <TableCell className="text-sm text-right font-bold text-green-700 font-mono">
                          {formatTestValue(row.best.value, test.unit)}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                          {formatSessionDate(row.best.evalDate, "d MMM yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="text-sm text-right font-bold text-primary font-mono">
                          {formatTestValue(row.latest.value, test.unit)}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                          {formatSessionDate(row.latest.evalDate, "d MMM yyyy", { locale: es })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTableWrap>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="space-y-4">
        <SectionHeading title="Historial Individual" />

        <FilterPanel className="space-y-3 p-4 bg-muted/40 rounded-lg border">
          <FilterChipGroup label="Categoría" className="flex-wrap">
            <FilterChip active={histCategoryFilter === "ALL"} onClick={() => setHistCategoryFilter("ALL")}>
              Todas
            </FilterChip>
            {CATEGORIES.map((cat) => (
              <FilterChip
                key={cat}
                active={histCategoryFilter === cat}
                onClick={() => setHistCategoryFilter(cat)}
              >
                {CATEGORY_LABELS[cat]}
              </FilterChip>
            ))}
          </FilterChipGroup>
          <FilterChipGroup label="Género" className="flex-wrap">
            <FilterChip active={histGenderFilter === "ALL"} onClick={() => setHistGenderFilter("ALL")}>
              Todos
            </FilterChip>
            {PLAYER_GENDER_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                active={histGenderFilter === opt.value}
                onClick={() => setHistGenderFilter(opt.value)}
              >
                {opt.label}
              </FilterChip>
            ))}
          </FilterChipGroup>
          <div className="space-y-1 max-w-md">
            <Label htmlFor="histPlayer" className="text-xs">Jugador</Label>
            {filteredPlayersHist.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Ningún jugador coincide con los filtros
              </p>
            ) : (
              <Select
                value={selectedPlayer}
                onValueChange={(v) => {
                  setSelectedPlayer(v);
                  if (v) fetchPlayerHistory(v);
                }}
                itemToStringLabel={(id) => {
                  const p = players.find((x) => x.id === id);
                  return p ? formatPlayerName(p) : "";
                }}
              >
                <SelectTrigger id="histPlayer" className="w-full h-9">
                  <SelectValue placeholder="Seleccioná un jugador..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredPlayersHist.map((p) => {
                    const hasData = test.evaluations.some((e) => e.player.id === p.id);
                    const cat = getPlayerCategory(getBirthYear(p.birthDate), referenceYear);
                    const name = formatPlayerName(p);
                    return (
                      <SelectItem key={p.id} value={p.id} label={name}>
                        {name}
                        {" · "}
                        {CATEGORY_LABELS[cat]}
                        {!hasData ? " (sin datos)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {filteredPlayersHist.length} jugador{filteredPlayersHist.length !== 1 ? "es" : ""} disponible{filteredPlayersHist.length !== 1 ? "s" : ""}
          </p>
        </FilterPanel>

        {selectedPlayer && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {formatPlayerName(players.find((p) => p.id === selectedPlayer)!)}
                {" — "}
                <span className="font-normal text-gray-500">Evolución en {test.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {individualChartData.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Sin evaluaciones para este jugador</p>
              ) : (
                <IndividualLineChart data={individualChartData} unit={test.unit} testName={test.name} formatValue={chartFormatValue} />
              )}
              {playerHistory.length > 0 && (
                <div className="mt-3 border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Fecha</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Marca</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Notas</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[...playerHistory].reverse().map((ev) => (
                        <tr key={ev.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-700">{formatSessionDate(ev.evalDate, "d MMM yyyy", { locale: es })}</td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-700 font-mono">
                            {formatTestValue(ev.value, test.unit)}
                          </td>
                          <td className="px-3 py-2 text-gray-500 italic text-xs">{ev.notes ?? "—"}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button onClick={() => openEditEval(ev)} className="text-xs text-blue-500 hover:text-blue-700 font-medium">Editar</button>
                              <button onClick={() => handleDeleteEval(ev.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Borrar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
