"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClubLogo } from "@/components/ClubLogo";
import { LoadingState } from "@/components/layout";
import { isTemporaryClubEmail } from "@/lib/clubEmail";
import { normalizeRole } from "@/lib/permissions";

function homePathForRole(role: string | undefined): string {
  return normalizeRole(role) === "PARENT" ? "/mi-perfil" : "/dashboard";
}

export default function CompletarCuentaPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const email = session?.user?.email ?? "";
  const role = (session?.user as { role?: string } | undefined)?.role;
  const needsSetup = isTemporaryClubEmail(email);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && !needsSetup) {
      router.replace(homePathForRole(role));
    }
  }, [status, needsSetup, role, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/me/complete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail, newPassword, newPasswordConfirm }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar los datos");
      return;
    }

    await signOut({ redirect: false });
    const signInResult = await signIn("credentials", {
      email: data.email,
      password: newPassword,
      redirect: false,
    });

    if (signInResult?.error) {
      router.push("/login");
      return;
    }

    router.push(homePathForRole(data.role ?? role));
  }

  if (status === "loading" || (status === "authenticated" && !needsSetup)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Cargando..." />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-200/40 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-6">
          <div className="inline-flex flex-col items-center gap-3 p-5 rounded-2xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] shadow-xl shadow-blue-900/20">
            <ClubLogo size="md" showText={false} light />
            <div>
              <h1 className="text-xl font-bold text-white">Completá tu cuenta</h1>
              <p className="text-sky-200 text-sm mt-1">Regatas Lima · Waterpolo</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tu correo y contraseña</CardTitle>
            <CardDescription>
              Tu usuario usa una cuenta temporal del club ({email}). Cualquier persona con correo
              @waterpolo.com debe registrar su correo personal y elegir una contraseña nueva antes
              de usar el sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="newEmail">Correo personal</Label>
                <Input
                  id="newEmail"
                  type="email"
                  placeholder="tu@correo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPasswordConfirm">Repetir contraseña</Label>
                <Input
                  id="newPasswordConfirm"
                  type="password"
                  placeholder="Repetí la contraseña"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Guardando..." : "Guardar y continuar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Cerrar sesión
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
