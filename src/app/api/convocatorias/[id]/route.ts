import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { CATEGORIES, type Category } from "@/lib/player";
import { resolveStaffUserId } from "@/lib/convocatoriaStaff";

const staffUserSelect = { id: true, name: true, email: true, role: true } as const;

function parseCategory(value: unknown): Category | null {
  const category = String(value ?? "");
  return (CATEGORIES as readonly string[]).includes(category) ? (category as Category) : null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const convocatoria = await prisma.convocatoria.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
      coachUser: { select: staffUserSelect },
      assistant1User: { select: staffUserSelect },
      assistant2User: { select: staffUserSelect },
      delegateUser: { select: staffUserSelect },
      players: {
        include: {
          player: true,
          cutBy: { select: { name: true } },
        },
        orderBy: [{ capNumber: "asc" }, { joinedAt: "asc" }],
      },
      sessions: {
        orderBy: [{ sessionDate: "desc" }, { sessionType: "asc" }],
        include: {
          _count: { select: { records: true } },
        },
      },
    },
  });

  if (!convocatoria)
    return NextResponse.json({ error: "Convocatoria no encontrada" }, { status: 404 });

  return NextResponse.json(convocatoria);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, description, gender, status } = body;
  const category = body.category !== undefined ? parseCategory(body.category) : undefined;

  if (body.category !== undefined && !category) {
    return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
  }

  const staffUpdates: Record<string, string | null> = {};
  for (const key of [
    "coachUserId",
    "assistant1UserId",
    "assistant2UserId",
    "delegateUserId",
  ] as const) {
    if (body[key] !== undefined) {
      const resolved = await resolveStaffUserId(body[key]);
      if ("error" in resolved) {
        return NextResponse.json({ error: resolved.error }, { status: 400 });
      }
      staffUpdates[key] = resolved.id;
    }
  }

  const convocatoria = await prisma.convocatoria.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(gender && { gender }),
      ...(category && { category }),
      ...(status && { status }),
      ...staffUpdates,
    },
    include: {
      coachUser: { select: staffUserSelect },
      assistant1User: { select: staffUserSelect },
      assistant2User: { select: staffUserSelect },
      delegateUser: { select: staffUserSelect },
    },
  });

  await log({ userId: session.user?.id ?? "", action: "CONV_UPDATED", entity: "convocatoria", entityId: id, detail: `Convocatoria "${convocatoria.name}" actualizada` });

  return NextResponse.json(convocatoria);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const conv = await prisma.convocatoria.findUnique({ where: { id }, select: { name: true } });
  await prisma.convocatoria.delete({ where: { id } });

  await log({ userId: session.user?.id ?? "", action: "CONV_DELETED", entity: "convocatoria", entityId: id, detail: `Convocatoria "${conv?.name}" eliminada` });

  return NextResponse.json({ success: true });
}
