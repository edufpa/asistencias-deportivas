import { createHash, randomBytes } from "node:crypto";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { OAuthClientInformationFull, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import { prisma } from "@/lib/prisma";
import { normalizeRole, type AppRole } from "@/lib/permissions";
import {
  MCP_SCOPES,
  MCP_CLAUDE_CLIENT_ID,
  clientAllowsRedirectUri,
  defaultMcpRedirectUris,
  isAllowedMcpRedirectUri,
  redirectUriMatches,
} from "@/lib/mcp/config";

const ACCESS_TOKEN_TTL_SEC = 60 * 60 * 24; // 24h
const REFRESH_TOKEN_TTL_SEC = 60 * 60 * 24 * 30; // 30d
const AUTH_CODE_TTL_SEC = 600; // 10 min

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function verifyPkce(codeVerifier: string, codeChallenge: string, method: string): boolean {
  if (method !== "S256") return false;
  const hash = createHash("sha256").update(codeVerifier).digest("base64url");
  return hash === codeChallenge;
}

export async function ensureDefaultMcpClients(): Promise<void> {
  const redirectUris = defaultMcpRedirectUris();
  await prisma.mcpOAuthClient.upsert({
    where: { clientId: MCP_CLAUDE_CLIENT_ID },
    create: {
      clientId: MCP_CLAUDE_CLIENT_ID,
      clientName: "Claude Desktop / Claude.ai",
      redirectUris,
    },
    update: {
      clientName: "Claude Desktop / Claude.ai",
      redirectUris,
    },
  });
}

export async function registerMcpClient(input: {
  redirect_uris: string[];
  client_name?: string;
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
}): Promise<OAuthClientInformationFull> {
  await ensureDefaultMcpClients();

  const redirectUris = input.redirect_uris.filter(isAllowedMcpRedirectUri);
  if (redirectUris.length === 0) {
    throw new Error("redirect_uris inválido para clientes MCP");
  }

  const clientId = randomToken();
  const now = Math.floor(Date.now() / 1000);

  await prisma.mcpOAuthClient.create({
    data: {
      clientId,
      clientName: input.client_name ?? "Cursor MCP",
      redirectUris,
      grantTypes: input.grant_types ?? ["authorization_code", "refresh_token"],
      responseTypes: input.response_types ?? ["code"],
      tokenEndpointAuth: input.token_endpoint_auth_method ?? "none",
    },
  });

  return {
    client_id: clientId,
    client_id_issued_at: now,
    client_name: input.client_name ?? "Cursor MCP",
    redirect_uris: redirectUris,
    grant_types: input.grant_types ?? ["authorization_code", "refresh_token"],
    response_types: input.response_types ?? ["code"],
    token_endpoint_auth_method: input.token_endpoint_auth_method ?? "none",
  };
}

export async function getMcpClient(clientId: string): Promise<OAuthClientInformationFull | null> {
  const row = await prisma.mcpOAuthClient.findUnique({ where: { clientId } });
  if (!row) return null;

  return {
    client_id: row.clientId,
    client_id_issued_at: Math.floor(row.createdAt.getTime() / 1000),
    client_name: row.clientName ?? undefined,
    redirect_uris: asStringArray(row.redirectUris),
    grant_types: asStringArray(row.grantTypes),
    response_types: asStringArray(row.responseTypes),
    token_endpoint_auth_method: row.tokenEndpointAuth,
    client_secret: row.clientSecret ?? undefined,
  };
}

export async function createAuthorizationCode(input: {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scopes?: string[];
  resource?: string;
}): Promise<string> {
  if (!isAllowedMcpRedirectUri(input.redirectUri)) {
    throw new Error("redirect_uri no permitido");
  }

  const code = randomToken();
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_SEC * 1000);

  await prisma.mcpAuthorizationCode.create({
    data: {
      code,
      clientId: input.clientId,
      userId: input.userId,
      redirectUri: input.redirectUri,
      codeChallenge: input.codeChallenge,
      codeChallengeMethod: input.codeChallengeMethod,
      scopes: input.scopes ?? [...MCP_SCOPES],
      resource: input.resource ?? null,
      expiresAt,
    },
  });

  return code;
}

async function issueTokens(input: {
  clientId: string;
  userId: string;
  scopes?: string[];
}): Promise<OAuthTokens> {
  const accessToken = randomToken();
  const refreshToken = randomToken();

  await prisma.mcpAccessToken.create({
    data: {
      tokenHash: sha256(accessToken),
      refreshTokenHash: sha256(refreshToken),
      clientId: input.clientId,
      userId: input.userId,
      scopes: input.scopes ?? [...MCP_SCOPES],
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_SEC * 1000),
    },
  });

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SEC,
    refresh_token: refreshToken,
    scope: (input.scopes ?? [...MCP_SCOPES]).join(" "),
  };
}

export async function exchangeAuthorizationCode(input: {
  clientId: string;
  code: string;
  codeVerifier?: string;
  redirectUri?: string;
}): Promise<OAuthTokens> {
  const row = await prisma.mcpAuthorizationCode.findUnique({
    where: { code: input.code },
  });

  if (!row || row.clientId !== input.clientId) {
    throw new Error("Código de autorización inválido");
  }
  if (row.usedAt) throw new Error("Código de autorización ya usado");
  if (row.expiresAt.getTime() < Date.now()) throw new Error("Código de autorización expirado");
  if (input.redirectUri && !redirectUriMatches(input.redirectUri, row.redirectUri)) {
    throw new Error("redirect_uri no coincide");
  }
  if (!input.codeVerifier || !verifyPkce(input.codeVerifier, row.codeChallenge, row.codeChallengeMethod)) {
    throw new Error("PKCE inválido");
  }

  await prisma.mcpAuthorizationCode.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });

  return issueTokens({
    clientId: row.clientId,
    userId: row.userId,
    scopes: asStringArray(row.scopes),
  });
}

export async function exchangeRefreshToken(input: {
  clientId: string;
  refreshToken: string;
}): Promise<OAuthTokens> {
  const hash = sha256(input.refreshToken);
  const row = await prisma.mcpAccessToken.findFirst({
    where: { refreshTokenHash: hash, clientId: input.clientId },
  });

  if (!row) throw new Error("Refresh token inválido");

  await prisma.mcpAccessToken.delete({ where: { id: row.id } });

  return issueTokens({
    clientId: row.clientId,
    userId: row.userId,
    scopes: asStringArray(row.scopes),
  });
}

export type McpAuthContext = {
  userId: string;
  role: AppRole;
  email: string;
  clientId: string;
};

export async function verifyMcpAccessToken(token: string): Promise<McpAuthContext> {
  const row = await prisma.mcpAccessToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: { select: { id: true, email: true, role: true, accountStatus: true } },
    },
  });

  if (!row) throw new Error("Token inválido");
  if (row.expiresAt.getTime() < Date.now()) throw new Error("Token expirado");
  if (row.user.accountStatus !== "APPROVED") throw new Error("Usuario no aprobado");

  return {
    userId: row.user.id,
    email: row.user.email,
    role: normalizeRole(row.user.role),
    clientId: row.clientId,
  };
}

export async function verifyMcpAccessTokenAsAuthInfo(token: string): Promise<AuthInfo> {
  const ctx = await verifyMcpAccessToken(token);
  return {
    token,
    clientId: ctx.clientId,
    scopes: [...MCP_SCOPES],
    extra: { userId: ctx.userId, role: ctx.role, email: ctx.email },
  };
}

export { REFRESH_TOKEN_TTL_SEC };
