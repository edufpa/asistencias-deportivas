import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { normalizeRole, type AppRole } from "@/lib/permissions";
import { getMcpResourceUrl } from "@/lib/mcp/config";
import type { McpAuthContext } from "@/lib/mcp/oauth";

const URL_TOKEN_CLIENT_ID = "regatas-url-token";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function randomUrlToken(): string {
  return `rt_${randomBytes(24).toString("base64url")}`;
}

export function buildMcpUrlWithToken(token: string): string {
  return new URL(`api/mcp/t/${token}`, getMcpResourceUrl().origin).href;
}

export async function listMcpUrlTokens(userId: string) {
  const rows = await prisma.mcpUrlToken.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      tokenPrefix: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    tokenPrefix: row.tokenPrefix,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    urlHint: `…/api/mcp/t/${row.tokenPrefix}…`,
  }));
}

export async function createMcpUrlToken(input: {
  userId: string;
  label?: string;
}): Promise<{ id: string; token: string; url: string; label: string | null }> {
  const token = randomUrlToken();
  const label = input.label?.trim() || "Cursor / Claude";

  const row = await prisma.mcpUrlToken.create({
    data: {
      userId: input.userId,
      tokenHash: sha256(token),
      tokenPrefix: token.slice(0, 10),
      label,
    },
    select: { id: true, label: true },
  });

  return {
    id: row.id,
    token,
    url: buildMcpUrlWithToken(token),
    label: row.label,
  };
}

export async function revokeMcpUrlToken(input: {
  userId: string;
  tokenId: string;
}): Promise<boolean> {
  const existing = await prisma.mcpUrlToken.findFirst({
    where: { id: input.tokenId, userId: input.userId, revokedAt: null },
    select: { id: true },
  });
  if (!existing) return false;

  await prisma.mcpUrlToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });
  return true;
}

export async function verifyMcpUrlToken(token: string): Promise<McpAuthContext> {
  const row = await prisma.mcpUrlToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: { select: { id: true, email: true, role: true, accountStatus: true } },
    },
  });

  if (!row || row.revokedAt) throw new Error("Token inválido");
  if (row.user.accountStatus !== "APPROVED") throw new Error("Usuario no aprobado");

  void prisma.mcpUrlToken
    .update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  return {
    userId: row.user.id,
    email: row.user.email,
    role: normalizeRole(row.user.role) as AppRole,
    clientId: URL_TOKEN_CLIENT_ID,
  };
}
