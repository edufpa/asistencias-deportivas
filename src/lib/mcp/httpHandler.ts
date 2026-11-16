import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createAsistenciasMcpServer } from "@/lib/mcp/server";
import { getMcpResourceUrl } from "@/lib/mcp/config";
import {
  verifyMcpAccessToken,
  verifyMcpAccessTokenAsAuthInfo,
  type McpAuthContext,
} from "@/lib/mcp/oauth";
import { MCP_SCOPES } from "@/lib/mcp/config";
import { verifyMcpUrlToken } from "@/lib/mcp/urlToken";

function unauthorizedResponse(): Response {
  const resource = getMcpResourceUrl();
  const metadataUrl = new URL(
    "/.well-known/oauth-protected-resource/api/mcp",
    resource.origin
  ).href;

  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer resource_metadata="${metadataUrl}"`,
    },
  });
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
}

function extractQueryToken(req: Request): string | null {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token")?.trim();
    return token || null;
  } catch {
    return null;
  }
}

async function resolveAuth(token: string): Promise<{
  ctx: McpAuthContext;
  authInfo: AuthInfo;
}> {
  // Primero intentamos token de URL (largo plazo); si falla, OAuth Bearer.
  try {
    const ctx = await verifyMcpUrlToken(token);
    return {
      ctx,
      authInfo: {
        token,
        clientId: ctx.clientId,
        scopes: [...MCP_SCOPES],
        extra: { userId: ctx.userId, role: ctx.role, email: ctx.email },
      },
    };
  } catch {
    const ctx = await verifyMcpAccessToken(token);
    const authInfo = await verifyMcpAccessTokenAsAuthInfo(token);
    return { ctx, authInfo };
  }
}

export async function handleMcpHttpRequest(
  req: Request,
  options?: { pathToken?: string }
): Promise<Response> {
  const token =
    options?.pathToken?.trim() ||
    extractBearerToken(req) ||
    extractQueryToken(req);

  if (!token) return unauthorizedResponse();

  let auth;
  try {
    auth = await resolveAuth(token);
  } catch {
    return unauthorizedResponse();
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const server = createAsistenciasMcpServer(auth.ctx);
  await server.connect(transport);

  return transport.handleRequest(req, { authInfo: auth.authInfo });
}

export function mcpOptionsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, DELETE, OPTIONS",
    },
  });
}
