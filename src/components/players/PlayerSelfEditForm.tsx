"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BLOOD_TYPE_OPTIONS } from "@/lib/player";
import { cn } from "@/lib/utils";
import { filterChipClass } from "@/components/layout";
import { PlayerImageUpload } from "@/components/players/PlayerImageUpload";
import { PageTabs } from "@/components/layout";

export type PlayerSelfData = {
  id: string;
  photoUrl: string | null;
  homeAddress: string | null;
  contactPhone: string | null;
  playerEmail: string | null;
  fatherName: string | null;
  fatherEmail: string | null;
  fatherPhone: string | null;
  motherName: string | null;
  motherEmail: string | null;
  motherPhone: string | null;
  tutorName: string | null;
  tutorEmail: string | null;
  tutorPhone: string | null;
  educationalCenter: string | null;
  educationLevel: string | null;
  absencePermissionContact: string | null;
  medicalInfo: string | null;
  bloodType: string | null;
  allergies: string | null;
  epsInsurance: string | null;
  observations: string | null;
};

type Tab = "contacto" | "permisos" | "medico";

type Props = {
  player: PlayerSelfData;
  onSaved: (player: PlayerSelfData) => void;
};

function toForm(p: PlayerSelfData) {
  return {
    homeAddress: p.homeAddress ?? "",
    contactPhone: p.contactPhone ?? "",
    playerEmail: p.playerEmail ?? "",
    fatherName: p.fatherName ?? "",
    fatherEmail: p.fatherEmail ?? "",
    fatherPhone: p.fatherPhone ?? "",
    motherName: p.motherName ?? "",
    motherEmail: p.motherEmail ?? "",
    motherPhone: p.motherPhone ?? "",
    tutorName: p.tutorName ?? "",
    tutorEmail: p.tutorEmail ?? "",
    tutorPhone: p.tutorPhone ?? "",
    educationalCenter: p.educationalCenter ?? "",
    educationLevel: p.educationLevel ?? "",
    absencePermissionContact: p.absencePermissionContact ?? "",
    medicalInfo: p.medicalInfo ?? "",
    bloodType: p.bloodType ?? "",
    allergies: p.allergies ?? "",
    epsInsurance: p.epsInsurance ?? "",
    observations: p.observations ?? "",
  };
}

export function PlayerSelfEditForm({ player, onSaved }: Props) {
  const [tab, setTab] = useState<Tab>("contacto");
  const [form, setForm] = useState(() => toForm(player));
  const [photoUrl, setPhotoUrl] = useState(player.photoUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setForm(toForm(player));
    setPhotoUrl(player.photoUrl);
  }, [player]);

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const hasGuardianPhone = useMemo(
    () => !!(form.fatherPhone.trim() || form.motherPhone.trim() || form.tutorPhone.trim()),
    [form.fatherPhone, form.motherPhone, form.tutorPhone]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!hasGuardianPhone) {
      setError("Indicá el teléfono de al menos uno: papá, mamá o tutor");
      setTab("contacto");
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/players/${player.id}/self`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        homeAddress: form.homeAddress || null,
        contactPhone: form.contactPhone || null,
        playerEmail: form.playerEmail || null,
        fatherName: form.fatherName || null,
        fatherEmail: form.fatherEmail || null,
        fatherPhone: form.fatherPhone || null,
        motherName: form.motherName || null,
        motherEmail: form.motherEmail || null,
        motherPhone: form.motherPhone || null,
        tutorName: form.tutorName || null,
        tutorEmail: form.tutorEmail || null,
        tutorPhone: form.tutorPhone || null,
        educationalCenter: form.educationalCenter || null,
        educationLevel: form.educationLevel || null,
        absencePermissionContact: form.absencePermissionContact || null,
        medicalInfo: form.medicalInfo || null,
        bloodType: form.bloodType || null,
        allergies: form.allergies || null,
        epsInsurance: form.epsInsurance || null,
        observations: form.observations || null,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar");
      return;
    }

    const saved = await res.json();
    onSaved({ ...player, ...saved, photoUrl });
    setSuccess("Datos guardados correctamente");
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "contacto", label: "Contacto" },
    { id: "permisos", label: "Permisos" },
    { id: "medico", label: "Ficha médica" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <PlayerImageUpload
        label="Foto del jugador"
        playerId={player.id}
        kind="photo"
        currentUrl={photoUrl}
        onUrlChange={setPhotoUrl}
      />

      <PageTabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === "contacto" && (
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="homeAddress">Domicilio</Label>
            <Input id="homeAddress" value={form.homeAddress} onChange={(e) => set("homeAddress", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="contactPhone">Teléfono del jugador</Label>
              <Input id="contactPhone" value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="playerEmail">Correo del jugador</Label>
              <Input id="playerEmail" type="email" value={form.playerEmail} onChange={(e) => set("playerEmail", e.target.value)} />
            </div>
          </div>
          <div className="rounded-lg border p-3 space-y-3">
            <p className="text-sm font-semibold">Papá</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <Input placeholder="Nombre" value={form.fatherName} onChange={(e) => set("fatherName", e.target.value)} />
              <Input placeholder="Teléfono" value={form.fatherPhone} onChange={(e) => set("fatherPhone", e.target.value)} />
              <Input placeholder="Correo" type="email" value={form.fatherEmail} onChange={(e) => set("fatherEmail", e.target.value)} />
            </div>
          </div>
          <div className="rounded-lg border p-3 space-y-3">
            <p className="text-sm font-semibold">Mamá</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <Input placeholder="Nombre" value={form.motherName} onChange={(e) => set("motherName", e.target.value)} />
              <Input placeholder="Teléfono" value={form.motherPhone} onChange={(e) => set("motherPhone", e.target.value)} />
              <Input placeholder="Correo" type="email" value={form.motherEmail} onChange={(e) => set("motherEmail", e.target.value)} />
            </div>
          </div>
          <div className="rounded-lg border p-3 space-y-3">
            <p className="text-sm font-semibold">Tutor</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <Input placeholder="Nombre" value={form.tutorName} onChange={(e) => set("tutorName", e.target.value)} />
              <Input placeholder="Teléfono" value={form.tutorPhone} onChange={(e) => set("tutorPhone", e.target.value)} />
              <Input placeholder="Correo" type="email" value={form.tutorEmail} onChange={(e) => set("tutorEmail", e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">* Teléfono de papá, mamá o tutor obligatorio</p>
        </div>
      )}

      {tab === "permisos" && (
        <div className="space-y-4 pt-2">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="educationalCenter">Centro educativo</Label>
              <Input id="educationalCenter" value={form.educationalCenter} onChange={(e) => set("educationalCenter", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="educationLevel">Nivel educativo</Label>
              <Input id="educationLevel" value={form.educationLevel} onChange={(e) => set("educationLevel", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="absencePermissionContact">Contacto para permisos de ausencia</Label>
            <Input id="absencePermissionContact" value={form.absencePermissionContact} onChange={(e) => set("absencePermissionContact", e.target.value)} />
          </div>
        </div>
      )}

      {tab === "medico" && (
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Tipo de sangre</Label>
            <div className="flex flex-wrap gap-2">
              {BLOOD_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("bloodType", opt.value)}
                  className={filterChipClass(form.bloodType === opt.value, "md")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="epsInsurance">EPS / Seguro</Label>
            <Input id="epsInsurance" value={form.epsInsurance} onChange={(e) => set("epsInsurance", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="allergies">Alergias</Label>
            <Textarea id="allergies" value={form.allergies} onChange={(e) => set("allergies", e.target.value)} rows={2} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="medicalInfo">Información médica</Label>
            <Textarea id="medicalInfo" value={form.medicalInfo} onChange={(e) => set("medicalInfo", e.target.value)} rows={3} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="observations">Observaciones</Label>
            <Textarea id="observations" value={form.observations} onChange={(e) => set("observations", e.target.value)} rows={2} />
          </div>
        </div>
      )}

      <Button type="submit" disabled={loading} className={cn(loading && "opacity-70")}>
        {loading ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
