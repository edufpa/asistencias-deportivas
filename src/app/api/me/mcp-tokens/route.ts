import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createMcpUrlToken,
  listMcpUrlTokens,
  revokeMcpUrlToken,
} from "@/lib/mcp/urlToken";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tokens = await listMcpUrlTokens(session.user.id);
  return NextResponse.json({ tokens });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label : undefined;

  const created = await createMcpUrlToken({
    userId: session.user.id,
    label,
  });

  return NextResponse.json(
    {
      id: created.id,
      label: created.label,
      token: created.token,
      url: created.url,
      message:
        "Copiá la URL ahora. Por seguridad no se vuelve a mostrar el token completo.",
    },
    { status: 201 }
  );
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const tokenId = typeof body.id === "string" ? body.id : "";
  if (!tokenId) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const ok = await revokeMcpUrlToken({
    userId: session.user.id,
    tokenId,
  });
  if (!ok) {
    return NextResponse.json({ error: "Token no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
