import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clientAllowsRedirectUri } from "@/lib/mcp/config";
import { createAuthorizationCode, ensureDefaultMcpClients, getMcpClient } from "@/lib/mcp/oauth";

export async function GET(req: NextRequest) {
  await ensureDefaultMcpClients();
  const { searchParams } = req.nextUrl;
  const responseType = searchParams.get("response_type");
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method") ?? "S256";
  const scope = searchParams.get("scope");

  if (responseType !== "code") {
    return NextResponse.json({ error: "unsupported_response_type" }, { status: 400 });
  }
  if (!clientId || !redirectUri || !codeChallenge) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (codeChallengeMethod !== "S256") {
    return NextResponse.json({ error: "invalid_request", error_description: "S256 requerido" }, { status: 400 });
  }

  const client = await getMcpClient(clientId);
  if (!client) {
    return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  }
  if (!clientAllowsRedirectUri(client.redirect_uris, redirectUri)) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const code = await createAuthorizationCode({
      clientId,
      userId: session.user.id,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      scopes: scope?.split(" ").filter(Boolean),
    });

    const target = new URL(redirectUri);
    target.searchParams.set("code", code);
    if (state) target.searchParams.set("state", state);

    return NextResponse.redirect(target);
  } catch (err) {
    const message = err instanceof Error ? err.message : "authorization_failed";
    const target = new URL(redirectUri);
    target.searchParams.set("error", "server_error");
    target.searchParams.set("error_description", message);
    if (state) target.searchParams.set("state", state);
    return NextResponse.redirect(target);
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
