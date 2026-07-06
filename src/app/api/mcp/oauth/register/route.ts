import { NextRequest, NextResponse } from "next/server";
import { registerMcpClient, ensureDefaultMcpClients } from "@/lib/mcp/oauth";

export async function POST(req: NextRequest) {
  try {
    await ensureDefaultMcpClients();
    const body = await req.json();
    const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
    if (redirectUris.length === 0) {
      return NextResponse.json({ error: "redirect_uris requerido" }, { status: 400 });
    }

    const client = await registerMcpClient({
      redirect_uris: redirectUris,
      client_name: typeof body.client_name === "string" ? body.client_name : undefined,
      grant_types: Array.isArray(body.grant_types) ? body.grant_types : undefined,
      response_types: Array.isArray(body.response_types) ? body.response_types : undefined,
      token_endpoint_auth_method:
        typeof body.token_endpoint_auth_method === "string"
          ? body.token_endpoint_auth_method
          : undefined,
    });

    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al registrar cliente";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
