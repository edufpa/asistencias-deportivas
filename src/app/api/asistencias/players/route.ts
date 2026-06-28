import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBirthYear, getPlayerCategory, matchesPlayerGender } from "@/lib/player";
import type { Category, PlayerGender } from "@/lib/player";
import { getSessionRole, getLinkedPlayerIds } from "@/lib/auth-session";

function parseReferenceYear(referenceDate: string | null): number {
  if (!referenceDate) return new Date().getFullYear();
  const iso = referenceDate.includes("T") ? referenceDate.split("T")[0] : referenceDate;
  const year = parseInt(iso.slice(0, 4), 10);
  return Number.isNaN(year) ? new Date().getFullYear() : year;
}

export async function GET(req: NextRequest) {
  const ctx = await getSessionRole();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as Category | null;
  const gender = searchParams.get("gender") as PlayerGender | null;
  const referenceDate = searchParams.get("referenceDate");

  if (!category || !gender) {
    return NextResponse.json({ error: "category y gender son requeridos" }, { status: 400 });
  }

  const referenceYear = parseReferenceYear(referenceDate);
  const linkedIds =
    ctx.role === "PARENT" ? await getLinkedPlayerIds(ctx.userId, ctx.role) : null;

  if (ctx.role === "PARENT" && linkedIds && linkedIds.length === 0) {
    return NextResponse.json([]);
  }

  const players = await prisma.player.findMany({
    where: linkedIds ? { id: { in: linkedIds } } : undefined,
    orderBy: [{ paternalLastName: "asc" }, { firstName: "asc" }],
  });

  const filtered = players
    .filter(
      (p) =>
        matchesPlayerGender(p.gender, gender) &&
        getPlayerCategory(getBirthYear(p.birthDate), referenceYear) === category
    )
    .map((p) => ({
      id: p.id,
      firstName: p.firstName,
      paternalLastName: p.paternalLastName,
      maternalLastName: p.maternalLastName,
      birthDate: p.birthDate,
      gender: p.gender,
    }));

  return NextResponse.json(filtered);
}
