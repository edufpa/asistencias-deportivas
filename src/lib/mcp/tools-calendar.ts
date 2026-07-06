import type {
  EventAccessLevel,
  EventCategory,
  EventLocation,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { McpAuthContext } from "@/lib/mcp/oauth";
import {
  assertCanDeleteCalendar,
  assertCanManageCalendar,
  mcpForbidden,
} from "@/lib/mcp/authz";
import {
  calendarEventsOverlappingMonthWhere,
  getCalendarMonthRange,
} from "@/lib/calendario";

const ACCESS_MAP: Record<string, EventAccessLevel> = {
  SUPER_ADMIN: "COMISION",
  COMISION: "COMISION",
  DELEGADO: "COMISION",
  COACH: "COACH",
  PARENT: "PARENT",
};

function parseCalendarDate(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00.000Z`);
}

function formatEvent(event: {
  id: string;
  title: string;
  description: string | null;
  location: EventLocation | null;
  locationOther: string | null;
  startDate: Date;
  endDate: Date | null;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  category: EventCategory;
  accessLevels: EventAccessLevel[];
  createdBy?: { name: string; email: string };
}) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    locationOther: event.locationOther,
    startDate: event.startDate.toISOString().split("T")[0],
    endDate: event.endDate?.toISOString().split("T")[0] ?? null,
    startTime: event.startTime,
    endTime: event.endTime,
    allDay: event.allDay,
    category: event.category,
    accessLevels: event.accessLevels,
    createdBy: event.createdBy,
  };
}

function userAccessLevel(ctx: McpAuthContext): EventAccessLevel {
  return ACCESS_MAP[ctx.role] ?? "PARENT";
}

function canViewEvent(ctx: McpAuthContext, accessLevels: EventAccessLevel[]): boolean {
  return accessLevels.includes(userAccessLevel(ctx));
}

export async function listCalendarEvents(
  ctx: McpAuthContext,
  args: { month?: string; category?: EventCategory; limit?: number }
) {
  const userAccess = userAccessLevel(ctx);

  let monthStart: Date | undefined;
  let monthEnd: Date | undefined;
  if (args.month) {
    const range = getCalendarMonthRange(args.month);
    monthStart = range.start;
    monthEnd = range.end;
  }

  const events = await prisma.calendarEvent.findMany({
    where: {
      accessLevels: { has: userAccess },
      ...(monthStart && monthEnd ? calendarEventsOverlappingMonthWhere(monthStart, monthEnd) : {}),
      ...(args.category ? { category: args.category } : {}),
    },
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { startDate: "asc" },
    take: args.limit ?? 50,
  });

  return events.map(formatEvent);
}

export async function getCalendarEvent(ctx: McpAuthContext, args: { eventId: string }) {
  const event = await prisma.calendarEvent.findUnique({
    where: { id: args.eventId },
    include: { createdBy: { select: { name: true, email: true } } },
  });
  if (!event) throw new Error("Evento no encontrado");
  if (!canViewEvent(ctx, event.accessLevels)) mcpForbidden("No tenés permiso para ver este evento");
  return formatEvent(event);
}

export async function createCalendarEvent(
  ctx: McpAuthContext,
  args: {
    title: string;
    description?: string;
    location?: EventLocation;
    locationOther?: string;
    startDate: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    category: EventCategory;
    accessLevels: EventAccessLevel[];
  }
) {
  assertCanManageCalendar(ctx);
  if (!args.title?.trim() || !args.startDate || !args.category || !args.accessLevels?.length) {
    throw new Error("title, startDate, category y accessLevels son requeridos");
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title: args.title.trim(),
      description: args.description?.trim() || null,
      location: args.location ?? null,
      locationOther: args.location === "OTRO" ? args.locationOther?.trim() || null : null,
      startDate: parseCalendarDate(args.startDate),
      endDate: args.endDate ? parseCalendarDate(args.endDate) : null,
      startTime: args.startTime || null,
      endTime: args.endTime || null,
      allDay: !args.startTime,
      category: args.category,
      accessLevels: args.accessLevels,
      createdById: ctx.userId,
    },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return formatEvent(event);
}

export async function updateCalendarEvent(
  ctx: McpAuthContext,
  args: {
    eventId: string;
    title?: string;
    description?: string | null;
    location?: EventLocation | null;
    locationOther?: string | null;
    startDate?: string;
    endDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    category?: EventCategory;
    accessLevels?: EventAccessLevel[];
  }
) {
  assertCanManageCalendar(ctx);

  const existing = await prisma.calendarEvent.findUnique({ where: { id: args.eventId } });
  if (!existing) throw new Error("Evento no encontrado");

  const location = args.location !== undefined ? args.location : existing.location;
  const startTime = args.startTime !== undefined ? args.startTime : existing.startTime;

  const event = await prisma.calendarEvent.update({
    where: { id: args.eventId },
    data: {
      ...(args.title !== undefined ? { title: args.title.trim() } : {}),
      ...(args.description !== undefined ? { description: args.description?.trim() || null } : {}),
      ...(args.location !== undefined ? { location: args.location } : {}),
      locationOther:
        location === "OTRO"
          ? (args.locationOther !== undefined ? args.locationOther?.trim() || null : existing.locationOther)
          : null,
      ...(args.startDate !== undefined ? { startDate: parseCalendarDate(args.startDate) } : {}),
      ...(args.endDate !== undefined
        ? { endDate: args.endDate ? parseCalendarDate(args.endDate) : null }
        : {}),
      ...(args.startTime !== undefined ? { startTime: args.startTime } : {}),
      ...(args.endTime !== undefined ? { endTime: args.endTime } : {}),
      allDay: !startTime,
      ...(args.category !== undefined ? { category: args.category } : {}),
      ...(args.accessLevels !== undefined ? { accessLevels: args.accessLevels } : {}),
    },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return formatEvent(event);
}

export async function deleteCalendarEvent(ctx: McpAuthContext, args: { eventId: string }) {
  assertCanDeleteCalendar(ctx);
  const existing = await prisma.calendarEvent.findUnique({ where: { id: args.eventId } });
  if (!existing) throw new Error("Evento no encontrado");
  await prisma.calendarEvent.delete({ where: { id: args.eventId } });
  return { ok: true, deletedId: args.eventId, title: existing.title };
}
