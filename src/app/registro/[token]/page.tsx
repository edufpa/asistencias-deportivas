"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ClubLogo } from "@/components/ClubLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DOCUMENT_TYPE_LABELS, PLAYER_GENDER_OPTIONS } from "@/lib/player";
import type { PlayerGender } from "@/lib/player";
import type { DocumentType } from "@prisma/client";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterChipClass } from "@/components/layout";

const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];

type PageState = "loading" | "open" | "success" | "error";

export default function RegistroPage() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [pageMessage, setPageMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    paternalLastName: "",
    maternalLastName: "",
    birthDate: "",
    documentType: "DNI" as DocumentType,
    documentId: "",
    gender: "MALE" as PlayerGender,
    email: "",
    password: "",
    passwordConfirm: "",
  });

  useEffect(() => {
    fetch(`/api/registro/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setPageState("error");
          setPageMessage(data.error ?? "Enlace no válido");
          return;
        }
        setPageState("open");
      })
      .catch(() => {
        setPageState("error");
        setPageMessage("No se pudo cargar el formulario");
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await fetch(`/api/registro/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Error al registrar");
      return;
    }

    setPageState("success");
    setPageMessage(data.message);
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <div className="inline-flex flex-col items-center gap-3 p-5 rounded-2xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] shadow-lg">
            <ClubLogo size="md" showText={false} light />
            <div>
              <h1 className="text-xl font-bold text-white">Registro de acceso</h1>
              <p className="text-sky-200 text-sm">Regatas Lima</p>
            </div>
          </div>
        </div>

        {pageState === "loading" && (
          <Card>
            <CardContent className="py-12 flex justify-center text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </CardContent>
          </Card>
        )}

        {pageState === "error" && (
          <Alert variant="destructive">
            <AlertDescription>{pageMessage}</AlertDescription>
          </Alert>
        )}

        {pageState === "success" && (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="py-8 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <h2 className="text-lg font-semibold text-green-900">¡Solicitud enviada!</h2>
              <p className="text-sm text-green-800 max-w-sm mx-auto">{pageMessage}</p>
              <p className="text-xs text-green-700/80 pt-2">
                La comisión revisará tu información y aprobará tu acceso. Recibirás acceso al sistema cuando sea aprobado.
              </p>
            </CardContent>
          </Card>
        )}

        {pageState === "open" && (
          <Card>
            <CardHeader>
              <CardTitle>Tus datos</CardTitle>
              <CardDescription>
                Completá el formulario para solicitar acceso. Un responsable del club aprobará tu cuenta manualmente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="firstName">Nombres *</Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="paternalLastName">Apellido paterno *</Label>
                    <Input
                      id="paternalLastName"
                      value={form.paternalLastName}
                      onChange={(e) => setForm({ ...form, paternalLastName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="maternalLastName">Apellido materno *</Label>
                    <Input
                      id="maternalLastName"
                      value={form.maternalLastName}
                      onChange={(e) => setForm({ ...form, maternalLastName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="birthDate">Fecha de nacimiento *</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={form.birthDate}
                      onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Género *</Label>
                    <div className="flex gap-2">
                      {PLAYER_GENDER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setForm({ ...form, gender: opt.value })}
                          className={cn("flex-1", filterChipClass(form.gender === opt.value, "md"))}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="documentType">Tipo de documento *</Label>
                    <select
                      id="documentType"
                      value={form.documentType}
                      onChange={(e) =>
                        setForm({ ...form, documentType: e.target.value as DocumentType })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      {DOCUMENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {DOCUMENT_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="documentId">Número de documento *</Label>
                    <Input
                      id="documentId"
                      value={form.documentId}
                      onChange={(e) => setForm({ ...form, documentId: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <p className="text-sm font-semibold text-primary">Cuenta de acceso</p>
                  <div className="space-y-1">
                    <Label htmlFor="email">Correo electrónico *</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="password">Contraseña *</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="passwordConfirm">Confirmar contraseña *</Label>
                    <Input
                      id="passwordConfirm"
                      type="password"
                      autoComplete="new-password"
                      value={form.passwordConfirm}
                      onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                      minLength={6}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={saving}
                >
                  {saving ? "Enviando..." : "Enviar solicitud"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
