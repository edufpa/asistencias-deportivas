import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { EventAccessLevel, EventCategory, EventLocation } from "@prisma/client";

// Parse a YYYY-MM-DD string as UTC midnight so @db.Date stores the correct day
function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00.000Z`);
}

export async function GET(request: Request) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = ctx;
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const category = searchParams.get("category") as EventCategory | null;

  const accessMap: Record<string, EventAccessLevel> = {
    SUPER_ADMIN: "COMISION",
    COMISION: "COMISION",
    COACH: "COACH",
    PARENT: "PARENT",
  };
  const userAccessLevel = accessMap[role];

  let startDate: Date | undefined;
  let endDate: Date | undefined;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    startDate = new Date(Date.UTC(y, m - 1, 1));
    endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59));
  }

  const events = await prisma.calendarEvent.findMany({
    where: {
      accessLevels: { has: userAccessLevel },
      ...(startDate && endDate ? { startDate: { gte: startDate, lte: endDate } } : {}),
      ...(category ? { category } : {}),
    },
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(request: Request) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, userId } = ctx;
  if (role !== "COMISION" && role !== "COACH" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, location, locationOther, startDate, endDate, startTime, endTime, allDay, category, accessLevels } = body;

  if (!title || !startDate || !category || !accessLevels?.length) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title,
      description: description || null,
      location: location as EventLocation || null,
      locationOther: location === "OTRO" ? (locationOther || null) : null,
      startDate: parseDate(startDate),
      endDate: endDate ? parseDate(endDate) : null,
      startTime: startTime || null,
      endTime: endTime || null,
      allDay: !startTime,
      category,
      accessLevels,
      createdById: userId,
    },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return NextResponse.json(event, { status: 201 });
}
