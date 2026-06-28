"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import {
  DOCUMENT_TYPE_OPTIONS,
  MEMBERSHIP_STATUS_OPTIONS,
  PLAYER_GENDER_OPTIONS,
  PLAYER_STATUS_OPTIONS,
  BLOOD_TYPE_OPTIONS,
} from "@/lib/player";
import type { DocumentType, Gender, MembershipStatus, PlayerStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { filterChipClass } from "@/components/layout";
import { PlayerImageUpload, uploadPendingPlayerImages } from "@/components/players/PlayerImageUpload";

export type PlayerFormData = {
  id: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  documentType: DocumentType;
  documentId: string;
  birthDate: string;
  gender: Gender;
  membershipStatus: MembershipStatus;
  membershipCardNumber: string | null;
  federationCode: string | null;
  playerStatus: PlayerStatus;
  teamJoinDate: string | null;
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
  photoUrl: string | null;
  documentPhotoFrontUrl: string | null;
  documentPhotoBackUrl: string | null;
  educationalCenter: string | null;
  educationLevel: string | null;
  absencePermissionContact: string | null;
  medicalInfo: string | null;
  bloodType: string | null;
  allergies: string | null;
  epsInsurance: string | null;
  observations: string | null;
};

type Tab = "general" | "contacto" | "permisos" | "medico";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player?: PlayerFormData | null;
  onSuccess: () => void;
  initialFormTab?: Tab;
}

function emptyForm() {
  return {
    firstName: "",
    paternalLastName: "",
    maternalLastName: "",
    documentType: "DNI" as DocumentType,
    documentId: "",
    birthDate: "",
    gender: "MALE" as Gender,
    membershipStatus: "NO_ASOCIADO" as MembershipStatus,
    membershipCardNumber: "",
    federationCode: "",
    playerStatus: "ACTIVE" as PlayerStatus,
    teamJoinDate: "",
    homeAddress: "",
    contactPhone: "",
    playerEmail: "",
    fatherName: "",
    fatherEmail: "",
    fatherPhone: "",
    motherName: "",
    motherEmail: "",
    motherPhone: "",
    tutorName: "",
    tutorEmail: "",
    tutorPhone: "",
    educationalCenter: "",
    educationLevel: "",
    absencePermissionContact: "",
    medicalInfo: "",
    bloodType: "",
    allergies: "",
    epsInsurance: "",
    observations: "",
  };
}

function GuardianBlock({
  title,
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
  nameId,
}: {
  title: string;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  nameId: string;
}) {
  return (
    <div className="rounded-lg border p-3 space-y-2 bg-gray-50/50">
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      <div className="grid sm:grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`${nameId}-name`} className="text-xs">Nombre</Label>
          <Input id={`${nameId}-name`} value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${nameId}-phone`} className="text-xs">Teléfono</Label>
          <Input id={`${nameId}-phone`} value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 text-sm" placeholder="999 999 999" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${nameId}-email`} className="text-xs">Correo electrónico</Label>
          <Input id={`${nameId}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
    </div>
  );
}

export function PlayerFormDialog({ open, onOpenChange, player, onSuccess, initialFormTab }: Props) {
  const [tab, setTab] = useState<Tab>("general");
  const [form, setForm] = useState(emptyForm);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [documentPhotoFrontUrl, setDocumentPhotoFrontUrl] = useState<string | null>(null);
  const [documentPhotoBackUrl, setDocumentPhotoBackUrl] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [pendingDocumentFront, setPendingDocumentFront] = useState<File | null>(null);
  const [pendingDocumentBack, setPendingDocumentBack] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: keyof ReturnType<typeof emptyForm>, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (player) {
      setForm({
        firstName: player.firstName,
        paternalLastName: player.paternalLastName,
        maternalLastName: player.maternalLastName ?? "",
        documentType: player.documentType,
        documentId: player.documentId,
        birthDate: format(new Date(player.birthDate), "yyyy-MM-dd"),
        gender: player.gender === "FEMALE" ? "FEMALE" : "MALE",
        membershipStatus: player.membershipStatus,
        membershipCardNumber: player.membershipCardNumber ?? "",
        federationCode: player.federationCode ?? "",
        playerStatus: player.playerStatus ?? "ACTIVE",
        teamJoinDate: player.teamJoinDate ? format(new Date(player.teamJoinDate), "yyyy-MM-dd") : "",
        homeAddress: player.homeAddress ?? "",
        contactPhone: player.contactPhone ?? "",
        playerEmail: player.playerEmail ?? "",
        fatherName: player.fatherName ?? "",
        fatherEmail: player.fatherEmail ?? "",
        fatherPhone: player.fatherPhone ?? "",
        motherName: player.motherName ?? "",
        motherEmail: player.motherEmail ?? "",
        motherPhone: player.motherPhone ?? "",
        tutorName: player.tutorName ?? "",
        tutorEmail: player.tutorEmail ?? "",
        tutorPhone: player.tutorPhone ?? "",
        educationalCenter: player.educationalCenter ?? "",
        educationLevel: player.educationLevel ?? "",
        absencePermissionContact: player.absencePermissionContact ?? "",
        medicalInfo: player.medicalInfo ?? "",
        bloodType: player.bloodType ?? "",
        allergies: player.allergies ?? "",
        epsInsurance: player.epsInsurance ?? "",
        observations: player.observations ?? "",
      });
      setPhotoUrl(player.photoUrl ?? null);
      setDocumentPhotoFrontUrl(player.documentPhotoFrontUrl ?? null);
      setDocumentPhotoBackUrl(player.documentPhotoBackUrl ?? null);
    } else {
      setForm(emptyForm());
      setPhotoUrl(null);
      setDocumentPhotoFrontUrl(null);
      setDocumentPhotoBackUrl(null);
    }
    setPendingPhoto(null);
    setPendingDocumentFront(null);
    setPendingDocumentBack(null);
    setTab(initialFormTab ?? "general");
    setError("");
  }, [player, open, initialFormTab]);

  const hasGuardianPhone = useMemo(
    () =>
      !!(form.fatherPhone.trim() || form.motherPhone.trim() || form.tutorPhone.trim()),
    [form.fatherPhone, form.motherPhone, form.tutorPhone]
  );

  const hasDocumentFront = !!(documentPhotoFrontUrl || pendingDocumentFront);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!hasGuardianPhone) {
      setError("Indicá el teléfono de al menos uno: papá, mamá o tutor");
      setTab("contacto");
      return;
    }
    if (!player && !hasDocumentFront) {
      setError("La foto delantera del documento de identidad es obligatoria");
      setTab("general");
      return;
    }

    setLoading(true);

    const url = player ? `/api/players/${player.id}` : "/api/players";
    const method = player ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        membershipCardNumber:
          form.membershipStatus === "ASOCIADO" ? form.membershipCardNumber : null,
        teamJoinDate: form.teamJoinDate || null,
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
        federationCode: form.federationCode || null,
        playerStatus: form.playerStatus,
        medicalInfo: form.medicalInfo || null,
        bloodType: form.bloodType || null,
        allergies: form.allergies || null,
        epsInsurance: form.epsInsurance || null,
        observations: form.observations || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar");
      setLoading(false);
      return;
    }

    const saved = await res.json();
    if (!player && (pendingPhoto || pendingDocumentFront || pendingDocumentBack)) {
      await uploadPendingPlayerImages(saved.id, {
        photo: pendingPhoto,
        documentFront: pendingDocumentFront,
        documentBack: pendingDocumentBack,
      });
    }

    setLoading(false);
    onSuccess();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{player ? "Editar jugador" : "Nuevo jugador"}</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-gray-600 -mt-2">
          <span className="text-red-600 font-medium">*</span> Datos obligatorios · El resto es opcional
        </p>

        <div className="flex gap-1 border-b pb-0">
          {(
            [
              { id: "general" as const, label: "Datos generales" },
              { id: "contacto" as const, label: "Datos de contacto" },
              { id: "permisos" as const, label: "Permisos" },
              { id: "medico" as const, label: "Ficha médica" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === t.id
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {tab === "general" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 bg-blue-50/50 border border-blue-100 rounded-md px-3 py-2">
                Mínimo para registrar: identidad, género, situación y foto del documento (delantero). Al editar, la foto solo es obligatoria para jugadores nuevos.
              </p>
              <div className="space-y-1">
                <Label htmlFor="firstName">Nombres *</Label>
                <Input id="firstName" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="paternalLastName">Apellido paterno *</Label>
                  <Input id="paternalLastName" value={form.paternalLastName} onChange={(e) => set("paternalLastName", e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maternalLastName">Apellido materno</Label>
                  <Input id="maternalLastName" value={form.maternalLastName} onChange={(e) => set("maternalLastName", e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de documento *</Label>
                <div className="flex flex-wrap gap-2">
                  {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, documentType: opt.value }))}
                      className={filterChipClass(form.documentType === opt.value, "md")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="documentId">Número de documento *</Label>
                  <Input id="documentId" value={form.documentId} onChange={(e) => set("documentId", e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="birthDate">Fecha de nacimiento *</Label>
                  <Input id="birthDate" type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Género *</Label>
                <div className="flex gap-2">
                  {PLAYER_GENDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, gender: opt.value }))}
                      className={cn("flex-1", filterChipClass(form.gender === opt.value, "md"))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estatus en el club</Label>
                <div className="flex gap-2">
                  {MEMBERSHIP_STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          membershipStatus: opt.value,
                          membershipCardNumber: opt.value === "NO_ASOCIADO" ? "" : p.membershipCardNumber,
                        }))
                      }
                      className={cn("flex-1", filterChipClass(form.membershipStatus === opt.value, "md"))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.membershipStatus === "ASOCIADO" && (
                <div className="space-y-1">
                  <Label htmlFor="membershipCardNumber">Número de carnet *</Label>
                  <Input id="membershipCardNumber" value={form.membershipCardNumber} onChange={(e) => set("membershipCardNumber", e.target.value)} required />
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="federationCode">Código de federación</Label>
                <Input
                  id="federationCode"
                  value={form.federationCode}
                  onChange={(e) => set("federationCode", e.target.value)}
                  placeholder="Código FPMD / federación"
                />
              </div>

              <div className="space-y-2">
                <Label>Situación *</Label>
                <div className="flex flex-wrap gap-2">
                  {PLAYER_STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, playerStatus: opt.value }))}
                      className={filterChipClass(form.playerStatus === opt.value, "md")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="teamJoinDate">Fecha de incorporación al equipo</Label>
                <Input id="teamJoinDate" type="date" value={form.teamJoinDate} onChange={(e) => set("teamJoinDate", e.target.value)} />
              </div>

              <div className="pt-2 border-t space-y-3">
                <PlayerImageUpload
                  label="Foto del jugador"
                  hint="JPG, PNG o WebP · máx. 5 MB"
                  playerId={player?.id ?? null}
                  kind="photo"
                  currentUrl={photoUrl}
                  onUrlChange={setPhotoUrl}
                  onPendingFile={setPendingPhoto}
                />
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-2">Documento de identidad</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <PlayerImageUpload
                      label="Delantero *"
                      hint="Obligatorio"
                      playerId={player?.id ?? null}
                      kind="documentFront"
                      currentUrl={documentPhotoFrontUrl}
                      onUrlChange={setDocumentPhotoFrontUrl}
                      onPendingFile={setPendingDocumentFront}
                    />
                    <PlayerImageUpload
                      label="Espalda"
                      hint="Opcional"
                      playerId={player?.id ?? null}
                      kind="documentBack"
                      currentUrl={documentPhotoBackUrl}
                      onUrlChange={setDocumentPhotoBackUrl}
                      onPendingFile={setPendingDocumentBack}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "contacto" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-600 bg-gray-50 border rounded-md px-3 py-2">
                Obligatorio: teléfono de al menos uno (papá, mamá o tutor). Nombre y correo de apoderados son opcionales.
              </p>
              <div className="space-y-1">
                <Label htmlFor="homeAddress">Dirección</Label>
                <Textarea
                  id="homeAddress"
                  value={form.homeAddress}
                  onChange={(e) => set("homeAddress", e.target.value)}
                  placeholder="Av., número, distrito, provincia..."
                  rows={2}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="contactPhone">Teléfono del jugador</Label>
                  <Input
                    id="contactPhone"
                    value={form.contactPhone}
                    onChange={(e) => set("contactPhone", e.target.value)}
                    placeholder="999 999 999"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="playerEmail">Correo del jugador</Label>
                  <Input
                    id="playerEmail"
                    type="email"
                    value={form.playerEmail}
                    onChange={(e) => set("playerEmail", e.target.value)}
                  />
                </div>
              </div>
              <GuardianBlock
                title="Papá"
                name={form.fatherName}
                setName={(v) => set("fatherName", v)}
                email={form.fatherEmail}
                setEmail={(v) => set("fatherEmail", v)}
                phone={form.fatherPhone}
                setPhone={(v) => set("fatherPhone", v)}
                nameId="father"
              />
              <GuardianBlock
                title="Mamá"
                name={form.motherName}
                setName={(v) => set("motherName", v)}
                email={form.motherEmail}
                setEmail={(v) => set("motherEmail", v)}
                phone={form.motherPhone}
                setPhone={(v) => set("motherPhone", v)}
                nameId="mother"
              />
              <GuardianBlock
                title="Tutor"
                name={form.tutorName}
                setName={(v) => set("tutorName", v)}
                email={form.tutorEmail}
                setEmail={(v) => set("tutorEmail", v)}
                phone={form.tutorPhone}
                setPhone={(v) => set("tutorPhone", v)}
                nameId="tutor"
              />
            </div>
          )}

          {tab === "permisos" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                Opcional — datos para solicitar permisos de ausencia al colegio o institución educativa.
              </p>
              <div className="space-y-1">
                <Label htmlFor="educationalCenter">Centro educativo</Label>
                <Input
                  id="educationalCenter"
                  value={form.educationalCenter}
                  onChange={(e) => set("educationalCenter", e.target.value)}
                  placeholder="Colegio, instituto o universidad"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="educationLevel">Grado de instrucción actual</Label>
                <Input
                  id="educationLevel"
                  value={form.educationLevel}
                  onChange={(e) => set("educationLevel", e.target.value)}
                  placeholder="Ej. 4to de secundaria, 2do año universidad"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="absencePermissionContact">Solicitud de permiso dirigida a</Label>
                <Input
                  id="absencePermissionContact"
                  value={form.absencePermissionContact}
                  onChange={(e) => set("absencePermissionContact", e.target.value)}
                  placeholder="Nombre y cargo: ej. Prof. García, tutoría"
                />
              </div>
            </div>
          )}

          {tab === "medico" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                Opcional — ficha médica del jugador.
              </p>
              <div className="space-y-2">
                <Label>Tipo de sangre</Label>
                <div className="flex flex-wrap gap-2">
                  {BLOOD_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          bloodType: p.bloodType === opt.value ? "" : opt.value,
                        }))
                      }
                      className={filterChipClass(form.bloodType === opt.value, "md")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="medicalInfo">Información médica</Label>
                <Textarea
                  id="medicalInfo"
                  value={form.medicalInfo}
                  onChange={(e) => set("medicalInfo", e.target.value)}
                  placeholder="Condiciones, medicación habitual, antecedentes..."
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="allergies">Alergias</Label>
                <Textarea
                  id="allergies"
                  value={form.allergies}
                  onChange={(e) => set("allergies", e.target.value)}
                  placeholder="Alergias conocidas"
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="epsInsurance">Seguro / EPS</Label>
                <Input
                  id="epsInsurance"
                  value={form.epsInsurance}
                  onChange={(e) => set("epsInsurance", e.target.value)}
                  placeholder="Nombre de la EPS o seguro"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="observations">Observaciones</Label>
                <Textarea
                  id="observations"
                  value={form.observations}
                  onChange={(e) => set("observations", e.target.value)}
                  placeholder="Notas del cuerpo técnico o secretaría"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : player ? "Actualizar" : "Crear jugador"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
