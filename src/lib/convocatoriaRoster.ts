import { formatPlayerName, DOCUMENT_TYPE_LABELS } from "@/lib/player";
import type { DocumentType } from "@prisma/client";

export type RosterPlayer = {
  capNumber: number | null;
  status: string;
  player: {
    firstName: string;
    paternalLastName: string;
    maternalLastName: string;
    birthDate: string | Date;
    documentType: DocumentType;
    documentId: string;
  };
};

export function sortPlayersByCap<T extends RosterPlayer>(players: T[]): T[] {
  return [...players].sort((a, b) => {
    if (a.capNumber != null && b.capNumber != null) return a.capNumber - b.capNumber;
    if (a.capNumber != null) return -1;
    if (b.capNumber != null) return 1;
    return formatPlayerName(a.player).localeCompare(formatPlayerName(b.player));
  });
}

export function getConvocatoriaExportStatus(input: {
  coachUserId: string | null;
  delegateUserId: string | null;
  players: RosterPlayer[];
}): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  const active = input.players.filter((p) => p.status === "ACTIVE");

  if (active.length === 0) {
    missing.push("Agregá al menos un jugador activo");
  }
  if (!input.coachUserId) {
    missing.push("Asigná un entrenador");
  }
  if (!input.delegateUserId) {
    missing.push("Asigná un delegado");
  }

  const withoutCap = active.filter((p) => p.capNumber == null).length;
  if (withoutCap > 0) {
    missing.push(`Falta gorro en ${withoutCap} jugador${withoutCap === 1 ? "" : "es"}`);
  }

  return { ready: missing.length === 0, missing };
}

function formatBirthDate(value: string | Date): string {
  const iso =
    value instanceof Date
      ? value.toISOString().split("T")[0]
      : String(value).includes("T")
        ? String(value).split("T")[0]
        : String(value);
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export async function downloadConvocatoriaRosterXls(
  convocatoriaName: string,
  players: RosterPlayer[],
  staff?: {
    coach?: string | null;
    assistant1?: string | null;
    assistant2?: string | null;
    delegate?: string | null;
  }
) {
  const XLSX = await import("xlsx");
  const active = sortPlayersByCap(players.filter((p) => p.status === "ACTIVE"));

  const rows = active.map((p) => ({
    "Nº Gorro": p.capNumber,
    Nombres: p.player.firstName,
    "Apellido Paterno": p.player.paternalLastName,
    "Apellido Materno": p.player.maternalLastName || "",
    "Fecha Nacimiento": formatBirthDate(p.player.birthDate),
    "Tipo Documento": DOCUMENT_TYPE_LABELS[p.player.documentType] ?? p.player.documentType,
    Documento: p.player.documentId,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Jugadores");

  if (staff) {
    const staffRows = [
      { Rol: "Entrenador", Nombre: staff.coach ?? "" },
      { Rol: "Asistente 1", Nombre: staff.assistant1 ?? "" },
      { Rol: "Asistente 2", Nombre: staff.assistant2 ?? "" },
      { Rol: "Delegado", Nombre: staff.delegate ?? "" },
    ];
    const wsStaff = XLSX.utils.json_to_sheet(staffRows);
    XLSX.utils.book_append_sheet(wb, wsStaff, "Cuerpo técnico");
  }

  const safeName = convocatoriaName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || "convocatoria";
  XLSX.writeFile(wb, `${safeName}_plantel.xls`);
}
