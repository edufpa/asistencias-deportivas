import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listAttendanceSeasonPeriods } from "@/lib/attendanceSeason";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const periods = await listAttendanceSeasonPeriods();
  return NextResponse.json(periods);
}
