import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createAsistenciasMcpServer } from "@/lib/mcp/server";
import { getMcpResourceUrl } from "@/lib/mcp/config";
import { verifyMcpAccessToken, verifyMcpAccessTokenAsAuthInfo } from "@/lib/mcp/oauth";

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

async function handleMcpRequest(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return unauthorizedResponse();
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return unauthorizedResponse();

  let ctx;
  try {
    ctx = await verifyMcpAccessToken(token);
  } catch {
    return unauthorizedResponse();
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const server = createAsistenciasMcpServer(ctx);
  await server.connect(transport);

  const authInfo = await verifyMcpAccessTokenAsAuthInfo(token);
  return transport.handleRequest(req, { authInfo });
}

export async function GET(req: Request) {
  return handleMcpRequest(req);
}

export async function POST(req: Request) {
  return handleMcpRequest(req);
}

export async function DELETE(req: Request) {
  return handleMcpRequest(req);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, DELETE, OPTIONS",
    },
  });
}
