import type { SessionType } from "@/lib/attendance";
import type { Category, PlayerGender } from "@/lib/player";
import type { PlayerRecord } from "@/components/asistencias/AttendancePlayerList";

export async function findExistingAttendanceSession(
  category: Category,
  sessionDate: string,
  sessionType: SessionType
): Promise<{ id: string } | null> {
  const res = await fetch(`/api/asistencias/sessions?category=${category}`);
  if (!res.ok) return null;
  const sessions: { id: string; sessionDate: string; sessionType: SessionType }[] =
    await res.json();
  if (!Array.isArray(sessions)) return null;
  const match = sessions.find(
    (s) =>
      String(s.sessionDate).split("T")[0] === sessionDate && s.sessionType === sessionType
  );
  return match ? { id: match.id } : null;
}

export async function ensureAttendanceSession(
  category: Category,
  sessionDate: string,
  sessionType: SessionType
): Promise<{ id: string } | { error: string }> {
  const res = await fetch("/api/asistencias/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionDate, sessionType, category }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error;
    if (res.status === 401) {
      return { error: "Tu sesión expiró. Cerrá sesión e ingresá de nuevo." };
    }
    return { error: message ?? "No se pudo crear la sesión de asistencia" };
  }
  return data as { id: string };
}

export async function updateAttendanceSession(
  sessionId: string,
  sessionDate: string,
  sessionType: SessionType
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`/api/asistencias/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionDate, sessionType }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return {
      ok: false,
      error: (data as { error?: string }).error ?? "Error al actualizar la sesión",
    };
  }
  return { ok: true };
}

export async function loadCategoryPlayersOnly(
  category: Category,
  gender: PlayerGender,
  sessionDate: string
): Promise<{ records: PlayerRecord[]; error?: string }> {
  const params = new URLSearchParams({
    category,
    gender,
    referenceDate: sessionDate,
  });

  const playersRes = await fetch(`/api/asistencias/players?${params}`);
  if (!playersRes.ok) {
    const data = await playersRes.json().catch(() => ({}));
    return {
      records: [],
      error: (data as { error?: string }).error ?? "Error al cargar jugadores",
    };
  }

  const categoryPlayers = await playersRes.json();
  if (!Array.isArray(categoryPlayers)) {
    return { records: [], error: "Respuesta inválida al cargar jugadores" };
  }

  const records = categoryPlayers.map(
    (p: {
      id: string;
      firstName: string;
      paternalLastName: string;
      maternalLastName: string;
      birthDate: string;
    }) => {
      const birthYear = parseInt(String(p.birthDate).split("T")[0].slice(0, 4), 10);
      return {
        playerId: p.id,
        firstName: p.firstName,
        paternalLastName: p.paternalLastName,
        maternalLastName: p.maternalLastName,
        birthYear: Number.isNaN(birthYear) ? 0 : birthYear,
        status: null,
        performanceScore: null,
        absenceReason: "",
      };
    }
  );

  return { records };
}

export async function loadCategoryAttendanceRecords(
  category: Category,
  sessionId: string,
  gender: PlayerGender,
  sessionDate: string
): Promise<{ records: PlayerRecord[]; error?: string }> {
  const params = new URLSearchParams({
    category,
    gender,
    referenceDate: sessionDate,
  });

  const [recordsRes, playersRes] = await Promise.all([
    fetch(`/api/asistencias/sessions/${sessionId}/records`),
    fetch(`/api/asistencias/players?${params}`),
  ]);

  if (!playersRes.ok) {
    const data = await playersRes.json().catch(() => ({}));
    return {
      records: [],
      error: (data as { error?: string }).error ?? "Error al cargar jugadores",
    };
  }

  const categoryPlayers = await playersRes.json();
  if (!Array.isArray(categoryPlayers)) {
    return { records: [], error: "Respuesta inválida al cargar jugadores" };
  }

  const existingRecords = recordsRes.ok ? await recordsRes.json() : [];
  const recordMap = new Map(
    Array.isArray(existingRecords)
      ? existingRecords.map(
          (r: {
            playerId: string;
            status: string;
            performanceScore: number | null;
            absenceReason: string | null;
          }) => [r.playerId, r]
        )
      : []
  );

  const records = categoryPlayers.map(
    (p: {
      id: string;
      firstName: string;
      paternalLastName: string;
      maternalLastName: string;
      birthDate: string;
    }) => {
      const existing = recordMap.get(p.id) as
        | {
            status?: string;
            performanceScore?: number | null;
            absenceReason?: string | null;
          }
        | undefined;
      const birthYear = parseInt(String(p.birthDate).split("T")[0].slice(0, 4), 10);
      return {
        playerId: p.id,
        firstName: p.firstName,
        paternalLastName: p.paternalLastName,
        maternalLastName: p.maternalLastName,
        birthYear: Number.isNaN(birthYear) ? 0 : birthYear,
        status: (existing?.status as PlayerRecord["status"]) ?? null,
        performanceScore: existing?.performanceScore ?? null,
        absenceReason: existing?.absenceReason ?? "",
      };
    }
  );

  return { records };
}
