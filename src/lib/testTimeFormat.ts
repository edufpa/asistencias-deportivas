/** Detecta si la unidad del test es tiempo (segundos) para usar formato M:SS.cc */
export function isTimeLikeUnit(unit: string): boolean {
  const u = unit.trim().toLowerCase();
  if (!u) return false;
  if (u === "s") return true;
  if (u === "seg" || u === "segs") return true;
  if (u.startsWith("seg")) return true; // segundo, segundos
  if (u.startsWith("sec")) return true;
  if (u.includes("tiempo")) return true;
  return false;
}

export type TimePartsStrings = { min: string; sec: string; cs: string };

export function secondsToTimePartsStrings(totalSeconds: number): TimePartsStrings {
  const h = Math.round(Math.max(0, totalSeconds) * 100);
  const totalWholeSecs = Math.floor(h / 100);
  const cs = h % 100;
  const m = Math.floor(totalWholeSecs / 60);
  const s = totalWholeSecs % 60;
  return { min: String(m), sec: String(s), cs: String(cs).padStart(2, "0") };
}

/** Convierte min, seg (0–59) y centésimas (0–99) a segundos totales (decimal). */
export function timePartsStringsToSeconds(parts: TimePartsStrings): number | null {
  const min = Number(parts.min);
  const sec = Number(parts.sec);
  const cs = Number(parts.cs);
  if (!Number.isFinite(min) || min < 0) return null;
  if (!Number.isFinite(sec) || sec < 0 || sec > 59) return null;
  if (!Number.isFinite(cs) || cs < 0 || cs > 99) return null;
  return min * 60 + sec + cs / 100;
}

/** True si los tres campos tienen números válidos para guardar. */
export function isCompleteTimeParts(parts: TimePartsStrings): boolean {
  if (parts.min === "" || parts.sec === "" || parts.cs === "") return false;
  return timePartsStringsToSeconds(parts) !== null;
}

export function formatSecondsAsMmSsCc(totalSeconds: number): string {
  const { min, sec, cs } = secondsToTimePartsStrings(totalSeconds);
  return `${min}:${sec.padStart(2, "0")}.${cs}`;
}

export function formatTestValue(value: number, unit: string): string {
  if (isTimeLikeUnit(unit)) return formatSecondsAsMmSsCc(value);
  return `${value} ${unit}`;
}
