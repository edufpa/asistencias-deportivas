import { NextResponse } from "next/server";
import { getMcpBaseUrl, getMcpOAuthBaseUrl, MCP_SCOPES, mcpOAuthEndpoint } from "@/lib/mcp/config";

export function buildOAuthAuthorizationServerMetadata() {
  const issuer = getMcpOAuthBaseUrl().href.replace(/\/$/, "");

  return {
    issuer,
    authorization_endpoint: mcpOAuthEndpoint("authorize"),
    token_endpoint: mcpOAuthEndpoint("token"),
    registration_endpoint: mcpOAuthEndpoint("register"),
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [...MCP_SCOPES],
    service_documentation: new URL("/", getMcpBaseUrl()).href,
  };
}

export function GET() {
  return NextResponse.json(buildOAuthAuthorizationServerMetadata());
}
