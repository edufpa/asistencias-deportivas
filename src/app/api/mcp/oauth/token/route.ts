import { NextRequest, NextResponse } from "next/server";
import {
  exchangeAuthorizationCode,
  exchangeRefreshToken,
  getMcpClient,
} from "@/lib/mcp/oauth";

async function parseTokenBody(req: NextRequest): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = await req.json();
    return Object.fromEntries(
      Object.entries(json).map(([k, v]) => [k, typeof v === "string" ? v : String(v ?? "")])
    );
  }

  const text = await req.text();
  return Object.fromEntries(new URLSearchParams(text));
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseTokenBody(req);
    const grantType = body.grant_type;
    const clientId = body.client_id;

    if (!clientId) {
      return NextResponse.json({ error: "invalid_client" }, { status: 400 });
    }

    const client = await getMcpClient(clientId);
    if (!client) {
      return NextResponse.json({ error: "invalid_client" }, { status: 400 });
    }

    if (grantType === "authorization_code") {
      const tokens = await exchangeAuthorizationCode({
        clientId,
        code: body.code,
        codeVerifier: body.code_verifier,
        redirectUri: body.redirect_uri,
      });
      return NextResponse.json(tokens);
    }

    if (grantType === "refresh_token") {
      const tokens = await exchangeRefreshToken({
        clientId,
        refreshToken: body.refresh_token,
      });
      return NextResponse.json(tokens);
    }

    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "token_error";
    return NextResponse.json({ error: "invalid_grant", error_description: message }, { status: 400 });
  }
}
