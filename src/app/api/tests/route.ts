import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tests = await prisma.test.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { evaluations: true } },
    },
  });

  return NextResponse.json(tests);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { name, unit, description, higherIsBetter } = body;

  if (!name || !unit) {
    return NextResponse.json({ error: "Nombre y unidad son requeridos" }, { status: 400 });
  }

  const test = await prisma.test.create({
    data: {
      name,
      unit,
      description: description ?? null,
      higherIsBetter: higherIsBetter !== false,
      createdById: session.user?.id ?? "",
    },
  });

  return NextResponse.json(test, { status: 201 });
}
