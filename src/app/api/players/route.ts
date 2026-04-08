import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  const players = await prisma.player.findMany({
    where: search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { documentId: { contains: search, mode: "insensitive" } },
            { club: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json(players);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { firstName, lastName, documentId, club, birthDate } = body;

  if (!firstName || !lastName || !documentId || !birthDate) {
    return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
  }

  const existing = await prisma.player.findUnique({ where: { documentId } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe un jugador con ese documento" }, { status: 409 });
  }

  const player = await prisma.player.create({
    data: {
      firstName,
      lastName,
      documentId,
      club: club ?? null,
      birthDate: new Date(birthDate),
    },
  });

  return NextResponse.json(player, { status: 201 });
}
