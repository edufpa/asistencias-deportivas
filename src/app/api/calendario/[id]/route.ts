import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { EventLocation } from "@prisma/client";

function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00.000Z`);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = await prisma.calendarEvent.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true, email: true } } },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(event);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = ctx;
  if (role !== "COMISION" && role !== "COACH" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { title, description, location, locationOther, startDate, endDate, startTime, endTime, category, accessLevels } = body;

  const event = await prisma.calendarEvent.update({
    where: { id },
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
    },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return NextResponse.json(event);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = ctx;
  if (role !== "COMISION" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.calendarEvent.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
