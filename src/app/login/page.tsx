"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClubLogo } from "@/components/ClubLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const preCheck = await fetch("/api/auth/pre-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const preData = await preCheck.json();

    if (!preCheck.ok) {
      setLoading(false);
      if (preData.error === "pending") {
        setError(preData.message ?? "Tu cuenta está pendiente de aprobación por la comisión del club.");
        return;
      }
      if (preData.error === "rejected") {
        setError(preData.message ?? "Tu solicitud de acceso fue rechazada.");
        return;
      }
      setError("Email o contraseña incorrectos");
      return;
    }

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email o contraseña incorrectos");
    } else if (preData.requiresAccountSetup) {
      router.push("/completar-cuenta");
    } else {
      const dest = preData.role === "PARENT" ? "/mi-perfil" : "/dashboard";
      router.push(dest);
    }
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
            <div>
              <h1 className="text-2xl font-bold text-white">Regatas Lima</h1>
              <p className="text-sky-200 text-sm mt-1">Asistencias Deportivas</p>
            </div>
          </div>
          <p className="text-muted-foreground mt-4 text-sm">Sistema de gestión deportiva del club</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>Ingresá tus credenciales para acceder</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="entrenador@club.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <a
                    href="/olvide-contrasena"
                    className="text-xs text-primary hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
