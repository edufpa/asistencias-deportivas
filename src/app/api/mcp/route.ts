import { handleMcpHttpRequest, mcpOptionsResponse } from "@/lib/mcp/httpHandler";

export async function GET(req: Request) {
  return handleMcpHttpRequest(req);
}

export async function POST(req: Request) {
  return handleMcpHttpRequest(req);
}

export async function DELETE(req: Request) {
  return handleMcpHttpRequest(req);
}

export async function OPTIONS() {
  return mcpOptionsResponse();
}
