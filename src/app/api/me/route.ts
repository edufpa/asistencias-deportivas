import { NextResponse } from "next/server";
import { requireSessionRole } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authResult = await requireSessionRole();
  if ("error" in authResult) return authResult.error;

  const user = await prisma.user.findUnique({
    where: { id: authResult.ctx.userId },
    select: { email: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return NextResponse.json(user);
}
