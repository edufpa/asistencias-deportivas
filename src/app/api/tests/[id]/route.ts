import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      evaluations: {
        include: { player: { select: { id: true, firstName: true, lastName: true, club: true } } },
        orderBy: [{ evalDate: "desc" }, { player: { lastName: "asc" } }],
      },
    },
  });

  if (!test) return NextResponse.json({ error: "Test no encontrado" }, { status: 404 });

  return NextResponse.json(test);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const test = await prisma.test.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.unit && { unit: body.unit }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.higherIsBetter !== undefined && { higherIsBetter: body.higherIsBetter }),
    },
  });

  return NextResponse.json(test);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.test.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
