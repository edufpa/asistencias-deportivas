import { NextResponse } from "next/server";
import { getMcpOAuthBaseUrl, getMcpResourceUrl, MCP_SCOPES } from "@/lib/mcp/config";

export function GET() {
  const resource = getMcpResourceUrl().href.replace(/\/$/, "");
  const authorizationServer = getMcpOAuthBaseUrl().href.replace(/\/$/, "");

  return NextResponse.json({
    resource,
    authorization_servers: [authorizationServer],
    scopes_supported: [...MCP_SCOPES],
    bearer_methods_supported: ["header"],
    resource_name: "Regatas Lima — Asistencias MCP",
  });
}
