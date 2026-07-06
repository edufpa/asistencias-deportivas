import type { PlayerRecord } from "@/components/asistencias/AttendancePlayerList";
import type { Category, PlayerGender } from "@/lib/player";
import { getPlayerCategory } from "@/lib/player";
import {
  ensureAttendanceSession,
  findExistingAttendanceSession,
  loadCategoryAttendanceRecords,
  loadCategoryPlayersOnly,
} from "@/lib/attendanceSession";

export type PesasFilterId = "SUB14" | "SUB16" | "SUB18" | "MAYORES" | "FEMENINO";

export const PESAS_FILTERS: { id: PesasFilterId; label: string }[] = [
  { id: "SUB14", label: "Sub 14" },
  { id: "SUB16", label: "Sub 16" },
  { id: "SUB18", label: "Sub 18" },
  { id: "MAYORES", label: "Mayores" },
  { id: "FEMENINO", label: "Femenino" },
];

const FEMALE_CATEGORIES: Category[] = ["SUB14", "SUB16", "SUB18", "OPEN"];

export function pesasFilterToCategoryGender(
  filter: PesasFilterId
): { category: Category; gender: PlayerGender } | null {
  switch (filter) {
    case "SUB14":
      return { category: "SUB14", gender: "MALE" };
    case "SUB16":
      return { category: "SUB16", gender: "MALE" };
    case "SUB18":
      return { category: "SUB18", gender: "MALE" };
    case "MAYORES":
      return { category: "OPEN", gender: "MALE" };
    default:
      return null;
  }
}

function dedupeRecords(records: PlayerRecord[]): PlayerRecord[] {
  const map = new Map<string, PlayerRecord>();
  for (const r of records) map.set(r.playerId, r);
  return Array.from(map.values()).sort((a, b) =>
    `${a.paternalLastName} ${a.firstName}`.localeCompare(`${b.paternalLastName} ${b.firstName}`)
  );
}

export async function loadPesasAttendance(
  filter: PesasFilterId,
  sessionDate: string
): Promise<{
  records: PlayerRecord[];
  sessionId: string | null;
  sessionIdsByCategory: Partial<Record<Category, string>>;
  error?: string;
}> {
  if (filter === "FEMENINO") {
    const sessionIdsByCategory: Partial<Record<Category, string>> = {};
    const merged: PlayerRecord[] = [];

    for (const category of FEMALE_CATEGORIES) {
      const existing = await findExistingAttendanceSession(category, sessionDate, "PESAS");
      if (existing) {
        sessionIdsByCategory[category] = existing.id;
        const { records, error } = await loadCategoryAttendanceRecords(
          category,
          existing.id,
          "FEMALE",
          sessionDate
        );
        if (error) return { records: [], sessionId: null, sessionIdsByCategory, error };
        merged.push(...records);
      } else {
        const { records, error } = await loadCategoryPlayersOnly(category, "FEMALE", sessionDate);
        if (error) return { records: [], sessionId: null, sessionIdsByCategory, error };
        merged.push(...records);
      }
    }

    return {
      records: dedupeRecords(merged),
      sessionId: null,
      sessionIdsByCategory,
    };
  }

  const params = pesasFilterToCategoryGender(filter);
  if (!params) {
    return { records: [], sessionId: null, sessionIdsByCategory: {}, error: "Filtro inválido" };
  }

  const { category, gender } = params;
  const existing = await findExistingAttendanceSession(category, sessionDate, "PESAS");
  if (existing) {
    const { records, error } = await loadCategoryAttendanceRecords(
      category,
      existing.id,
      gender,
      sessionDate
    );
    return {
      records,
      sessionId: existing.id,
      sessionIdsByCategory: { [category]: existing.id },
      error,
    };
  }

  const { records, error } = await loadCategoryPlayersOnly(category, gender, sessionDate);
  return {
    records,
    sessionId: null,
    sessionIdsByCategory: {},
    error,
  };
}

export function categoryForPesasRecord(
  record: PlayerRecord,
  sessionDate: string
): Category {
  const year = parseInt(sessionDate.slice(0, 4), 10);
  return getPlayerCategory(record.birthYear, year);
}

function payloadRecord(r: PlayerRecord) {
  return {
    playerId: r.playerId,
    status: r.status,
    performanceScore: null,
    absenceReason: null,
  };
}

async function persistSessionRecords(
  sessionId: string,
  records: PlayerRecord[],
  clearPlayerIds: string[]
): Promise<boolean> {
  const res = await fetch(`/api/asistencias/sessions/${sessionId}/records`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      records: records.map(payloadRecord),
      clearPlayerIds,
    }),
  });
  return res.ok;
}

export async function savePesasPlayerStatus(input: {
  filter: PesasFilterId;
  sessionDate: string;
  record: PlayerRecord;
  currentSessionId: string | null;
  sessionIdsByCategory: Partial<Record<Category, string>>;
}): Promise<
  | { ok: true; sessionId: string | null; sessionIdsByCategory: Partial<Record<Category, string>> }
  | { ok: false; error: string }
> {
  const { record } = input;
  const toSave = record.status !== null ? [record] : [];
  const toClear = record.status === null ? [record.playerId] : [];

  if (input.filter === "FEMENINO") {
    const category = categoryForPesasRecord(record, input.sessionDate);
    let sessionId = input.sessionIdsByCategory[category] ?? null;

    if (!sessionId && toSave.length === 0) {
      return {
        ok: true,
        sessionId: input.currentSessionId,
        sessionIdsByCategory: input.sessionIdsByCategory,
      };
    }

    if (!sessionId) {
      const session = await ensureAttendanceSession(category, input.sessionDate, "PESAS");
      if (!("id" in session)) return { ok: false, error: session.error };
      sessionId = session.id;
    }

    const ok = await persistSessionRecords(sessionId, toSave, toClear);
    if (!ok) return { ok: false, error: "Error al guardar la asistencia" };

    return {
      ok: true,
      sessionId: input.currentSessionId,
      sessionIdsByCategory: { ...input.sessionIdsByCategory, [category]: sessionId },
    };
  }

  const params = pesasFilterToCategoryGender(input.filter);
  if (!params) return { ok: false, error: "Filtro inválido" };

  let sessionId = input.currentSessionId;
  if (!sessionId && toSave.length === 0) {
    return {
      ok: true,
      sessionId: null,
      sessionIdsByCategory: input.sessionIdsByCategory,
    };
  }

  if (!sessionId) {
    const session = await ensureAttendanceSession(
      params.category,
      input.sessionDate,
      "PESAS"
    );
    if (!("id" in session)) return { ok: false, error: session.error };
    sessionId = session.id;
  }

  const ok = await persistSessionRecords(sessionId, toSave, toClear);
  if (!ok) return { ok: false, error: "Error al guardar la asistencia" };

  return {
    ok: true,
    sessionId,
    sessionIdsByCategory: { ...input.sessionIdsByCategory, [params.category]: sessionId },
  };
}

export async function savePesasAttendanceRecords(input: {
  filter: PesasFilterId;
  sessionDate: string;
  records: PlayerRecord[];
  currentSessionId: string | null;
  sessionIdsByCategory: Partial<Record<Category, string>>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const toSave = input.records.filter((r) => r.status !== null);
  const toClear = input.records.filter((r) => r.status === null).map((r) => r.playerId);

  if (toSave.length === 0 && toClear.length === 0) {
    return { ok: false, error: "No hay cambios para guardar" };
  }

  if (input.filter === "FEMENINO") {
    const byCategory = new Map<Category, PlayerRecord[]>();
    for (const r of toSave) {
      const cat = categoryForPesasRecord(r, input.sessionDate);
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(r);
    }

    const clearByCategory = new Map<Category, string[]>();
    for (const playerId of toClear) {
      const record = input.records.find((r) => r.playerId === playerId);
      if (!record) continue;
      const cat = categoryForPesasRecord(record, input.sessionDate);
      if (!clearByCategory.has(cat)) clearByCategory.set(cat, []);
      clearByCategory.get(cat)!.push(playerId);
    }

    const categories = new Set<Category>([
      ...byCategory.keys(),
      ...clearByCategory.keys(),
    ]);

    for (const category of categories) {
      const group = byCategory.get(category) ?? [];
      const clearIds = clearByCategory.get(category) ?? [];
      if (group.length === 0 && clearIds.length === 0) continue;

      let sessionId = input.sessionIdsByCategory[category] ?? null;
      if (!sessionId) {
        const session = await ensureAttendanceSession(category, input.sessionDate, "PESAS");
        if (!("id" in session)) return { ok: false, error: session.error };
        sessionId = session.id;
      }

      const ok = await persistSessionRecords(sessionId, group, clearIds);
      if (!ok) return { ok: false, error: "Error al guardar la asistencia" };
    }

    return { ok: true };
  }

  const params = pesasFilterToCategoryGender(input.filter);
  if (!params) return { ok: false, error: "Filtro inválido" };

  let sessionId = input.currentSessionId;
  if (!sessionId && toSave.length === 0) {
    return { ok: false, error: "Marcá al menos una asistencia para guardar" };
  }

  if (!sessionId) {
    const session = await ensureAttendanceSession(
      params.category,
      input.sessionDate,
      "PESAS"
    );
    if (!("id" in session)) return { ok: false, error: session.error };
    sessionId = session.id;
  }

  const ok = await persistSessionRecords(sessionId, toSave, toClear);
  if (!ok) return { ok: false, error: "Error al guardar la asistencia" };
  return { ok: true };
}
