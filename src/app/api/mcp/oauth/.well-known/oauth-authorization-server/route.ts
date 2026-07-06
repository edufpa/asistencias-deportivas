import { NextResponse } from "next/server";
import { buildOAuthAuthorizationServerMetadata } from "@/app/.well-known/oauth-authorization-server/route";

export function GET() {
  return NextResponse.json(buildOAuthAuthorizationServerMetadata());
}
