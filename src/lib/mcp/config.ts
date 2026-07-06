export function getMcpBaseUrl(): URL {
  const raw =
    process.env.MCP_BASE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (!raw) {
    throw new Error("Configura MCP_BASE_URL o NEXTAUTH_URL para el MCP OAuth");
  }

  return new URL(raw.endsWith("/") ? raw : `${raw}/`);
}

export function getMcpResourceUrl(): URL {
  return new URL("api/mcp", getMcpBaseUrl());
}

export function getMcpOAuthBaseUrl(): URL {
  return getMcpBaseUrl();
}

export function mcpOAuthEndpoint(path: string): string {
  return new URL(path, getMcpBaseUrl()).href;
}

export const MCP_SCOPES = ["mcp:read"] as const;

/** Client ID fijo para Claude Desktop / Claude.ai (campo avanzado del conector). */
export const MCP_CLAUDE_CLIENT_ID = "regatas-claude-mcp";

const EXACT_REDIRECT_URIS = [
  "https://claude.ai/api/mcp/auth_callback",
  "cursor://anysphere.cursor-mcp/oauth/callback",
  "https://www.cursor.com/agents/mcp/oauth/callback",
  "http://localhost/callback",
  "http://127.0.0.1/callback",
] as const;

function isLoopbackCallback(uri: string): boolean {
  try {
    const url = new URL(uri);
    if (url.protocol !== "http:") return false;
    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return false;
    return (
      url.pathname === "/callback" ||
      url.pathname === "/oauth/callback" ||
      url.pathname.endsWith("/oauth/callback/debug")
    );
  } catch {
    return false;
  }
}

export function isAllowedMcpRedirectUri(uri: string): boolean {
  if (EXACT_REDIRECT_URIS.includes(uri as (typeof EXACT_REDIRECT_URIS)[number])) {
    return true;
  }
  return isLoopbackCallback(uri);
}

/** RFC 8252: en loopback se ignora el puerto al comparar redirect_uri. */
export function redirectUriMatches(requested: string, registered: string): boolean {
  if (requested === registered) return true;

  try {
    const req = new URL(requested);
    const reg = new URL(registered);

    if (req.protocol !== reg.protocol) return false;
    if (req.pathname !== reg.pathname) return false;

    const reqLoopback = req.hostname === "localhost" || req.hostname === "127.0.0.1";
    const regLoopback = reg.hostname === "localhost" || reg.hostname === "127.0.0.1";
    if (reqLoopback && regLoopback) return true;

    return req.hostname === reg.hostname && req.port === reg.port;
  } catch {
    return false;
  }
}

export function clientAllowsRedirectUri(
  registeredUris: string[],
  requested: string
): boolean {
  return registeredUris.some((registered) => redirectUriMatches(requested, registered));
}

export function isSafeCallbackUrl(url: string, origin: string): boolean {
  try {
    const parsed = new URL(url, origin);
    const base = getMcpBaseUrl();
    return parsed.origin === base.origin && parsed.pathname.startsWith("/");
  } catch {
    return false;
  }
}

export function defaultMcpRedirectUris(): string[] {
  return [...EXACT_REDIRECT_URIS];
}
