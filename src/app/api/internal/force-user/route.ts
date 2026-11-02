import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * One-shot helper. Remove after use.
 * Fixes case-duplicate emails and sets SUPER_ADMIN + password.
 */
const ALLOWED_EMAIL = "elkinbuitrago01@hotmail.com";
const EXPECTED_SECRET = "97b012cb16d8eb7f64152daaed7343f63900b586e183d3ed";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-force-reset-secret") ?? "";
  if (!secret || secret !== EXPECTED_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = typeof body.role === "string" ? body.role : "SUPER_ADMIN";
  const name = typeof body.name === "string" ? body.name : "Elkin Buitrago";

  if (!email || email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: "Email no permitido" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Password requerido" }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const matches = await prisma.user.findMany({
      where: { email: { equals: email, mode: "insensitive" } },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accountStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (matches.length === 0) {
      const created = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: role as "SUPER_ADMIN",
          accountStatus: "APPROVED",
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          accountStatus: true,
        },
      });
      return NextResponse.json({ ok: true, action: "created", user: created });
    }

    // Keep the oldest account, delete case-duplicates that block login.
    const keep = matches[0];
    const duplicates = matches.slice(1);
    const deletedIds: string[] = [];

    for (const dup of duplicates) {
      try {
        await prisma.userPlayer.deleteMany({ where: { userId: dup.id } });
        await prisma.passwordResetToken.deleteMany({ where: { userId: dup.id } });
        await prisma.user.delete({ where: { id: dup.id } });
        deletedIds.push(dup.id);
      } catch (dupError) {
        // If FK history blocks delete, quarantine the duplicate email.
        const quarantined = `dup+${dup.id}.${dup.email}`.toLowerCase();
        await prisma.user.update({
          where: { id: dup.id },
          data: {
            email: quarantined,
            accountStatus: "REJECTED",
          },
        });
        deletedIds.push(`quarantined:${dup.id}`);
        console.error("[force-user] quarantine duplicate", dup.id, dupError);
      }
    }

    const updated = await prisma.user.update({
      where: { id: keep.id },
      data: {
        name,
        email, // force lowercase
        passwordHash,
        role: role as "SUPER_ADMIN",
        accountStatus: "APPROVED",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accountStatus: true,
      },
    });

    return NextResponse.json({
      ok: true,
      action: "merged",
      matched: matches,
      deletedIds,
      user: updated,
    });
  } catch (error) {
    console.error("[force-user] error:", error);
    return NextResponse.json(
      { error: "Error de servidor", detail: String(error) },
      { status: 500 }
    );
  }
}
