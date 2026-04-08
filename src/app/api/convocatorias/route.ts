import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const convocatorias = await prisma.convocatoria.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { name: true } },
      _count: {
        select: {
          players: { where: { status: "ACTIVE" } },
        },
      },
    },
  });

  return NextResponse.json(convocatorias);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { name, description, gender } = body;

  if (!name) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  const convocatoria = await prisma.convocatoria.create({
    data: {
      name,
      description: description ?? null,
      gender: gender ?? "MIXED",
      createdBy: session.user?.id ?? "",
    },
  });

  await log({ userId: session.user?.id ?? "", action: "CONV_CREATED", entity: "convocatoria", entityId: convocatoria.id, detail: `Convocatoria "${name}" creada` });

  return NextResponse.json(convocatoria, { status: 201 });
}

