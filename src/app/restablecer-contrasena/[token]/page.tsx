"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ClubLogo } from "@/components/ClubLogo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PageState = "loading" | "open" | "success" | "error";

export default function RestablecerContrasenaPage() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [pageMessage, setPageMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/auth/reset-password/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setPageState("error");
          setPageMessage(data.error ?? "Enlace no válido o expirado");
          return;
        }
        setEmail(data.email ?? "");
        setPageState("open");
      })
      .catch(() => {
        setPageState("error");
        setPageMessage("No se pudo validar el enlace");
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await fetch(`/api/auth/reset-password/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, passwordConfirm }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Error al restablecer la contraseña");
      return;
    }

    setPageState("success");
    setPageMessage(data.message ?? "Contraseña actualizada correctamente");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-200/40 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-4 mb-2 p-6 rounded-2xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] shadow-xl shadow-blue-900/20">
            <ClubLogo size="lg" showText={false} light />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nueva contraseña</CardTitle>
            <CardDescription>
              {pageState === "open" && email
                ? `Creá una nueva contraseña para ${email}`
                : "Elegí una contraseña segura para tu cuenta"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pageState === "loading" && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {pageState === "error" && (
              <div className="space-y-4 text-center">
                <Alert variant="destructive">
                  <AlertDescription>{pageMessage}</AlertDescription>
                </Alert>
                <Link
                  href="/olvide-contrasena"
                  className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                >
                  Solicitar nuevo enlace
                </Link>
              </div>
            )}

            {pageState === "success" && (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <p className="text-sm text-muted-foreground">{pageMessage}</p>
                <Link href="/login" className={cn(buttonVariants(), "w-full")}>
                  Ir al login
                </Link>
              </div>
            )}

            {pageState === "open" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm">Confirmar contraseña</Label>
                  <Input
                    id="passwordConfirm"
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar contraseña"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
