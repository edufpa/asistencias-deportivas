import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { isValidClubRegistrationToken } from "@/lib/clubRegistrationLink";
import {
  birthDateToIso,
  normalizeDocumentId,
  validateRegistrationPayload,
  type RegistrationPayload,
} from "@/lib/registration";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const valid = await isValidClubRegistrationToken(token);

  if (!valid) {
    return NextResponse.json({ error: "Enlace de registro no válido" }, { status: 404 });
  }

  return NextResponse.json({ status: "open" });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const valid = await isValidClubRegistrationToken(token);

  if (!valid) {
    return NextResponse.json({ error: "Enlace de registro no válido" }, { status: 404 });
  }

  const body = (await req.json()) as Partial<RegistrationPayload>;
  const validationError = validateRegistrationPayload(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const payload = body as RegistrationPayload;
  const email = payload.email.trim().toLowerCase();
  const documentId = normalizeDocumentId(payload.documentId);
  const birthIso = birthDateToIso(payload.birthDate)!;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese correo" }, { status: 409 });
  }

  const existingPlayer = await prisma.player.findUnique({
    where: { documentId },
    include: {
      linkedUsers: {
        include: { user: { select: { accountStatus: true } } },
      },
    },
  });

  if (existingPlayer) {
    const hasActiveAccess = existingPlayer.linkedUsers.some(
      (l) =>
        l.user.accountStatus === "APPROVED" || l.user.accountStatus === "PENDING"
    );
    if (hasActiveAccess) {
      return NextResponse.json(
        { error: "Este documento ya tiene una solicitud de acceso o acceso aprobado" },
        { status: 409 }
      );
    }
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const fullName = `${payload.firstName.trim()} ${payload.paternalLastName.trim()}`.trim();

  const playerId = await prisma.$transaction(async (tx) => {
    let pid: string;

    if (existingPlayer) {
      await tx.player.update({
        where: { id: existingPlayer.id },
        data: {
          firstName: payload.firstName.trim(),
          paternalLastName: payload.paternalLastName.trim(),
          maternalLastName: payload.maternalLastName.trim(),
          birthDate: new Date(birthIso),
          documentType: payload.documentType,
          gender: payload.gender,
          playerEmail: email,
        },
      });
      pid = existingPlayer.id;
    } else {
      const created = await tx.player.create({
        data: {
          firstName: payload.firstName.trim(),
          paternalLastName: payload.paternalLastName.trim(),
          maternalLastName: payload.maternalLastName.trim(),
          birthDate: new Date(birthIso),
          documentType: payload.documentType,
          documentId,
          gender: payload.gender,
          playerEmail: email,
        },
      });
      pid = created.id;
    }

    await tx.user.create({
      data: {
        name: fullName,
        email,
        passwordHash,
        role: "PARENT",
        accountStatus: "PENDING",
        linkedPlayers: { create: { playerId: pid } },
      },
    });

    return pid;
  });

  void playerId;

  return NextResponse.json(
    {
      success: true,
      message:
        "Solicitud enviada. La comisión del club revisará tus datos y aprobará tu acceso al sistema.",
    },
    { status: 201 }
  );
}
