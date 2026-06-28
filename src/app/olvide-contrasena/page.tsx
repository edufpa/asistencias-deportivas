"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClubLogo } from "@/components/ClubLogo";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OlvideContrasenaPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo enviar la solicitud");
      return;
    }

    setSent(true);
    setMessage(
      data.message ??
        "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."
    );
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recuperar contraseña</CardTitle>
            <CardDescription>
              Te enviaremos un enlace a tu correo para elegir una nueva contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <p className="text-sm text-muted-foreground">{message}</p>
                <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                  Volver al login
                </Link>
              </div>
            ) : (
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
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar enlace"}
                </Button>
                <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "w-full")}>
                  Volver al login
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
