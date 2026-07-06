import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAttendanceSeasonOptionsForDate } from "@/lib/attendanceSeason";
import { parseDateOnlyUtc } from "@/lib/attendanceSeasonShared";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  if (!parseDateOnlyUtc(date)) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const result = await getAttendanceSeasonOptionsForDate(date);
  return NextResponse.json(result);
}
