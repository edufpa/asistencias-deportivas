import { EventCategory, EventAccessLevel, EventLocation } from "@prisma/client";

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  TORNEO: "Torneo",
  PARTIDO_PRACTICA: "Partido pr?ctica",
  INSCRIPCION: "Inscripci?n",
  CONGRESILLO: "Congresillo",
  PAGO_INSCRIPCION: "Pago de inscripci?n",
  REUNION_PAPAS: "Reuni?n pap?s",
  REUNION_ENTRENADORES: "Reuni?n entrenadores",
  REUNION_COMISION: "Reuni?n comisi?n",
  OTRAS: "Otras actividades",
};

export const EVENT_CATEGORY_COLORS: Record<EventCategory, string> = {
  TORNEO: "bg-blue-100 text-blue-800 border-blue-200",
  PARTIDO_PRACTICA: "bg-green-100 text-green-800 border-green-200",
  INSCRIPCION: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONGRESILLO: "bg-purple-100 text-purple-800 border-purple-200",
  PAGO_INSCRIPCION: "bg-orange-100 text-orange-800 border-orange-200",
  REUNION_PAPAS: "bg-pink-100 text-pink-800 border-pink-200",
  REUNION_ENTRENADORES: "bg-teal-100 text-teal-800 border-teal-200",
  REUNION_COMISION: "bg-red-100 text-red-800 border-red-200",
  OTRAS: "bg-gray-100 text-gray-800 border-gray-200",
};

export const EVENT_CATEGORY_DOT: Record<EventCategory, string> = {
  TORNEO: "bg-blue-500",
  PARTIDO_PRACTICA: "bg-green-500",
  INSCRIPCION: "bg-yellow-500",
  CONGRESILLO: "bg-purple-500",
  PAGO_INSCRIPCION: "bg-orange-500",
  REUNION_PAPAS: "bg-pink-500",
  REUNION_ENTRENADORES: "bg-teal-500",
  REUNION_COMISION: "bg-red-500",
  OTRAS: "bg-gray-500",
};

export const ACCESS_LEVEL_LABELS: Record<EventAccessLevel, string> = {
  COMISION: "Comisi?n",
  COACH: "Entrenadores",
  PARENT: "Jugadores",
};

export const EVENT_LOCATION_LABELS: Record<EventLocation, string> = {
  MEET: "Google Meet",
  OFICINA: "Oficina",
  SALON_NAUTICO: "Sal?n n?utico",
  OTRO: "Otro",
};

export const ALL_LOCATIONS = Object.keys(EVENT_LOCATION_LABELS) as EventLocation[];
export const ALL_CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[];
export const ALL_ACCESS_LEVELS = Object.keys(ACCESS_LEVEL_LABELS) as EventAccessLevel[];

export function formatTimeRange(startTime?: string | null, endTime?: string | null): string {
  if (!startTime) return "";
  return endTime ? `${startTime} ? ${endTime}` : startTime;
}

export function formatLocationLabel(location?: EventLocation | null, locationOther?: string | null): string {
  if (!location) return "";
  if (location === "OTRO") return locationOther || "Otro";
  return EVENT_LOCATION_LABELS[location];
}

export const MIN_MONTH = "2026-07";

export function getMaxMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("es-PE", { month: "long", year: "numeric" });
}

export function buildGoogleCalendarUrl(event: {
  title: string;
  description?: string | null;
  location?: EventLocation | null;
  locationOther?: string | null;
  startDate: string | Date;
  endDate?: string | Date | null;
  startTime?: string | null;
  endTime?: string | null;
  allDay: boolean;
}): string {
  const dateStr = typeof event.startDate === "string" ? event.startDate.slice(0, 10) : event.startDate.toISOString().slice(0, 10);
  const endDateStr = event.endDate
    ? (typeof event.endDate === "string" ? event.endDate.slice(0, 10) : event.endDate.toISOString().slice(0, 10))
    : dateStr;

  let dates: string;
  if (event.startTime) {
    const startISO = `${dateStr}T${event.startTime}:00`;
    const endISO = event.endTime
      ? `${endDateStr}T${event.endTime}:00`
      : `${dateStr}T${event.startTime}:00`;
    dates = `${startISO.replace(/[-:]/g, "")}/${endISO.replace(/[-:]/g, "")}`;
  } else {
    const nextDay = new Date(endDateStr);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().slice(0, 10).replace(/-/g, "");
    dates = `${dateStr.replace(/-/g, "")}/${nextDayStr}`;
  }

  const locationLabel = formatLocationLabel(event.location, event.locationOther);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates,
    ...(event.description ? { details: event.description } : {}),
    ...(locationLabel ? { location: locationLabel } : {}),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildICSContent(event: {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startDate: string | Date;
  endDate?: string | Date | null;
  allDay: boolean;
}): string {
  const start = new Date(event.startDate);
  const end = event.endDate ? new Date(event.endDate) : new Date(start);
  if (!event.endDate) end.setDate(end.getDate() + 1);

  const fmtDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/:/g, "").slice(0, 15) + "Z";
  const fmtAllDay = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

  const dtstart = event.allDay ? `DTSTART;VALUE=DATE:${fmtAllDay(start)}` : `DTSTART:${fmtDate(start)}`;
  const dtend = event.allDay ? `DTEND;VALUE=DATE:${fmtAllDay(end)}` : `DTEND:${fmtDate(end)}`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Regatas Lima//Calendario//ES",
    "BEGIN:VEVENT",
    `UID:${event.id}@regataslima`,
    dtstart,
    dtend,
    `SUMMARY:${event.title}`,
    event.description ? `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}` : "",
    event.location ? `LOCATION:${event.location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}
