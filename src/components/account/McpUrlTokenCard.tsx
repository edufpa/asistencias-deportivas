"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type TokenRow = {
  id: string;
  label: string | null;
  tokenPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  urlHint: string;
};

export function McpUrlTokenCard() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [label, setLabel] = useState("Cursor");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdUrl, setCreatedUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/me/mcp-tokens");
    const data = await res.json();
    if (res.ok && Array.isArray(data.tokens)) setTokens(data.tokens);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createToken() {
    setCreating(true);
    setError("");
    setCreatedUrl("");
    setCopied(false);
    const res = await fetch("/api/me/mcp-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim() || "Cursor" }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el token");
      return;
    }
    setCreatedUrl(data.url);
    await load();
  }

  async function revokeToken(id: string) {
    if (!confirm("¿Revocar este token MCP? Dejará de funcionar en Cursor.")) return;
    setError("");
    const res = await fetch("/api/me/mcp-tokens", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo revocar");
      return;
    }
    setCreatedUrl("");
    await load();
  }

  async function copyUrl() {
    if (!createdUrl) return;
    await navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Generá un link con el token en la URL para conectar el MCP en Cursor sin
        OAuth. Pegalo en{" "}
        <code className="rounded bg-muted px-1 text-xs">mcp.json</code> como{" "}
        <code className="rounded bg-muted px-1 text-xs">url</code>.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="mcp-label">Nombre</Label>
          <Input
            id="mcp-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Cursor"
          />
        </div>
        <Button onClick={() => void createToken()} disabled={creating}>
          {creating ? "Generando..." : "Generar link MCP"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {createdUrl && (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
          <p className="text-xs font-medium text-emerald-900">
            Copiá esta URL ahora (solo se muestra una vez):
          </p>
          <code className="block break-all rounded bg-white/80 px-2 py-2 text-xs text-emerald-950">
            {createdUrl}
          </code>
          <Button size="sm" variant="outline" onClick={() => void copyUrl()}>
            {copied ? "Copiado" : "Copiar URL"}
          </Button>
          <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
{`{
  "mcpServers": {
    "asistencias": {
      "url": "${createdUrl}"
    }
  }
}`}
          </pre>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">Tokens activos</p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no generaste ninguno.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {tokens.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium">{t.label ?? "MCP"}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.tokenPrefix}… · creado{" "}
                    {new Date(t.createdAt).toLocaleDateString("es-PE")}
                    {t.lastUsedAt
                      ? ` · último uso ${new Date(t.lastUsedAt).toLocaleDateString("es-PE")}`
                      : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => void revokeToken(t.id)}
                >
                  Revocar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
