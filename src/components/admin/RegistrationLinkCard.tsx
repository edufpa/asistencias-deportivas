"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Link2, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type LinkInfo = {
  url: string;
  token: string;
  updatedAt: string;
};

export function RegistrationLinkCard() {
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/registration-link");
      const data = await res.json();
      if (!res.ok) {
        setInfo(null);
        setError(data.error ?? "No se pudo cargar el enlace de registro");
        return;
      }
      setInfo(data);
    } catch {
      setInfo(null);
      setError("Error de conexión al cargar el enlace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function copyLink() {
    if (!info?.url) return;
    await navigator.clipboard.writeText(info.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerate() {
    if (
      !confirm(
        "¿Generar un nuevo enlace? El enlace anterior dejará de funcionar."
      )
    ) {
      return;
    }
    setRegenerating(true);
    setError("");
    const res = await fetch("/api/admin/registration-link", { method: "POST" });
    const data = await res.json();
    setRegenerating(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo regenerar el enlace");
      return;
    }
    setInfo(data);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-primary">
          <Link2 className="h-5 w-5" />
          Link único de registro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Compartí este enlace con los jugadores. Cada uno completa sus datos y crea su cuenta.
          Vos aprobás manualmente en la lista de abajo.
        </p>

        {loading ? (
          <div className="py-4 flex justify-center text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : info ? (
          <>
            <div className="flex gap-2">
              <input
                readOnly
                value={info.url}
                className="flex-1 min-w-0 rounded-md border bg-white px-3 py-2 text-sm text-gray-800"
              />
              <Button type="button" variant="outline" size="icon" onClick={copyLink} title="Copiar">
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={regenerate}
                disabled={regenerating}
                title="Nuevo enlace"
              >
                <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
              </Button>
            </div>
            {copied && <p className="text-xs text-green-600">Enlace copiado al portapapeles</p>}
            <p className="text-xs text-gray-400">
              Actualizado: {format(new Date(info.updatedAt), "d MMM yyyy HH:mm", { locale: es })}
            </p>
          </>
        ) : (
          !error && (
            <p className="text-sm text-gray-500">No hay enlace disponible.</p>
          )
        )}

        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-sm space-y-2">
              <p>{error}</p>
              <Button type="button" variant="outline" size="sm" onClick={load}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
