import { handleMcpHttpRequest, mcpOptionsResponse } from "@/lib/mcp/httpHandler";

type RouteContext = { params: Promise<{ token: string }> };

async function withPathToken(req: Request, context: RouteContext) {
  const { token } = await context.params;
  return handleMcpHttpRequest(req, { pathToken: token });
}

export async function GET(req: Request, context: RouteContext) {
  return withPathToken(req, context);
}

export async function POST(req: Request, context: RouteContext) {
  return withPathToken(req, context);
}

export async function DELETE(req: Request, context: RouteContext) {
  return withPathToken(req, context);
}

export async function OPTIONS() {
  return mcpOptionsResponse();
}
