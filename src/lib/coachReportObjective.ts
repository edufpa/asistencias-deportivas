/** Extrae el puesto numérico de textos como "6to", "2do lugar", "8". */
export function parseChampionshipPosition(text: string | null | undefined): number | null {
  if (!text?.trim()) return null;
  const normalized = text.trim().toLowerCase();
  const match =
    normalized.match(/(\d+)\s*(?:°|º|vo|to|er|do|ro|da)?/) ?? normalized.match(/\b(\d{1,2})\b/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) ? n : null;
}

export function evaluateChampionshipObjective(
  objective: number | null | undefined,
  positionText: string | null | undefined
): "achieved" | "not_achieved" | "unknown" {
  if (!objective || objective < 1) return "unknown";
  const position = parseChampionshipPosition(positionText);
  if (position === null) return "unknown";
  return position <= objective ? "achieved" : "not_achieved";
}

export function objectiveStatusLabel(
  objective: number | null | undefined,
  positionText: string | null | undefined
): string {
  const status = evaluateChampionshipObjective(objective, positionText);
  if (!objective) return "Sin objetivo definido";
  if (status === "achieved") return `Objetivo top ${objective} — Alcanzado`;
  if (status === "not_achieved") return `Objetivo top ${objective} — No alcanzado`;
  return `Objetivo top ${objective} — Sin confirmar (indica el puesto alcanzado)`;
}
