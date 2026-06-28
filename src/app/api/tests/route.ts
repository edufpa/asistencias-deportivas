import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { isTestCategory } from "@/lib/testCategory";
import type { TestCategory } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const tests = await prisma.test.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { evaluations: true } },
      },
    });

    return NextResponse.json(tests);
  } catch (err) {
    console.error("GET /api/tests:", err);
    return NextResponse.json(
      {
        error:
          "Error al cargar tests. Ejecutá: npx prisma generate && reiniciá npm run dev",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { name, unit, description, higherIsBetter, category } = body;

  if (!name || !unit) {
    return NextResponse.json({ error: "Nombre y unidad son requeridos" }, { status: 400 });
  }

  if (!category || !isTestCategory(category)) {
    return NextResponse.json(
      { error: "Categoría inválida (FUERZA, NATACION o ANTROPOMETRIA)" },
      { status: 400 }
    );
  }

  const test = await prisma.test.create({
    data: {
      name,
      unit,
      category: category as TestCategory,
      description: description ?? null,
      higherIsBetter: higherIsBetter !== false,
      createdById: session.user?.id ?? "",
    },
  });

  await log({
    userId: session.user?.id ?? "",
    action: "TEST_CREATED",
    entity: "test",
    entityId: test.id,
    detail: `Test "${name}" (${unit}) creado`,
  });

  return NextResponse.json(test, { status: 201 });
}
