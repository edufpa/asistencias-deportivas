"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatPlayerName,
  DOCUMENT_TYPE_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  PLAYER_GENDER_LABELS,
  PLAYER_STATUS_LABELS,
} from "@/lib/player";
import type { DocumentType, Gender, MembershipStatus, PlayerStatus } from "@prisma/client";
import { PageShell, PageHeader, PageTabs } from "@/components/layout";
import { PlayerFormDialog, type PlayerFormData } from "@/components/players/PlayerFormDialog";
import { PlayerAsistenciaPanel } from "@/components/players/PlayerAsistenciaPanel";
import { PlayerTestsPanel } from "@/components/players/PlayerTestsPanel";
import { PlayerPartidosPanel } from "@/components/players/PlayerPartidosPanel";
import { useAppRole } from "@/hooks/useAppRole";
import { canEditPlayers, canViewPerformanceScores, canAccessPartidos, canViewPlayerContactData } from "@/lib/permissions";

type ConvocatoriaEntry = {
  id: string;
  status: "ACTIVE" | "CUT";
  joinedAt: Date;
  convocatoria: { id: string; name: string; status: "ACTIVE" | "CLOSED" };
};

export type PlayerDetail = {
  id: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  documentType: DocumentType;
  documentId: string;
  birthDate: Date;
  gender: Gender;
  membershipStatus: MembershipStatus;
  membershipCardNumber: string | null;
  federationCode: string | null;
  playerStatus: PlayerStatus;
  teamJoinDate: Date | null;
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
  convocatorias: ConvocatoriaEntry[];
};

type DatosTab = "general" | "contacto" | "permisos" | "medico";
type MainTab = "datos" | "asistencia" | "tests" | "partidos";

const DATOS_TABS = [
  { id: "general" as const, label: "Datos generales" },
  { id: "contacto" as const, label: "Datos de contacto" },
  { id: "permisos" as const, label: "Permisos" },
  { id: "medico" as const, label: "Ficha médica" },
];

const MAIN_TABS_BASE = [
  { id: "datos" as const, label: "Datos" },
  { id: "asistencia" as const, label: "Asistencia" },
  { id: "tests" as const, label: "Tests" },
  { id: "partidos" as const, label: "Partidos" },
];

function statusBadgeVariant(status: PlayerStatus): "default" | "secondary" | "destructive" {
  if (status === "SUSPENDED") return "destructive";
  if (status === "INACTIVE") return "secondary";
  return "default";
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-gray-500 block text-xs">{label}</span>
      <span className="font-medium text-sm">{value || "—"}</span>
    </div>
  );
}

function GuardianFields({
  title,
  name,
  email,
  phone,
}: {
  title: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Nombre" value={name} />
        <Field label="Teléfono" value={phone} />
        <Field label="Correo electrónico" value={email} />
      </div>
    </div>
  );
}

function playerToFormData(player: PlayerDetail): PlayerFormData {
  return {
    id: player.id,
    firstName: player.firstName,
    paternalLastName: player.paternalLastName,
    maternalLastName: player.maternalLastName,
    documentType: player.documentType,
    documentId: player.documentId,
    birthDate: format(new Date(player.birthDate), "yyyy-MM-dd"),
    gender: player.gender,
    membershipStatus: player.membershipStatus,
    membershipCardNumber: player.membershipCardNumber,
    federationCode: player.federationCode,
    playerStatus: player.playerStatus,
    teamJoinDate: player.teamJoinDate
      ? format(new Date(player.teamJoinDate), "yyyy-MM-dd")
      : null,
    homeAddress: player.homeAddress,
    contactPhone: player.contactPhone,
    playerEmail: player.playerEmail,
    fatherName: player.fatherName,
    fatherEmail: player.fatherEmail,
    fatherPhone: player.fatherPhone,
    motherName: player.motherName,
    motherEmail: player.motherEmail,
    motherPhone: player.motherPhone,
    tutorName: player.tutorName,
    tutorEmail: player.tutorEmail,
    tutorPhone: player.tutorPhone,
    photoUrl: player.photoUrl,
    documentPhotoFrontUrl: player.documentPhotoFrontUrl,
    documentPhotoBackUrl: player.documentPhotoBackUrl,
    educationalCenter: player.educationalCenter,
    educationLevel: player.educationLevel,
    absencePermissionContact: player.absencePermissionContact,
    medicalInfo: player.medicalInfo,
    bloodType: player.bloodType,
    allergies: player.allergies,
    epsInsurance: player.epsInsurance,
    observations: player.observations,
  };
}

function resolveMainTab(value: string | null, showPartidos: boolean): MainTab {
  if (value === "asistencia" || value === "tests") return value;
  if (value === "partidos" && showPartidos) return "partidos";
  return "datos";
}

export function PlayerDetailView({ player, age }: { player: PlayerDetail; age: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = useAppRole();
  const canEdit = canEditPlayers(role);
  const showContactData = canViewPlayerContactData(role);
  const hideScores = !canViewPerformanceScores(role);
  const showPartidos = canAccessPartidos(role);

  const datosTabs = useMemo(
    () =>
      showContactData
        ? DATOS_TABS
        : DATOS_TABS.filter((t) => t.id === "general" || t.id === "medico"),
    [showContactData]
  );

  const mainTabs = useMemo(
    () => (showPartidos ? MAIN_TABS_BASE : MAIN_TABS_BASE.filter((t) => t.id !== "partidos")),
    [showPartidos]
  );

  const mainTab = resolveMainTab(searchParams.get("tab"), showPartidos);
  const [datosTab, setDatosTab] = useState<DatosTab>("general");
  const [editOpen, setEditOpen] = useState(false);
  const [editFormTab, setEditFormTab] = useState<DatosTab>("general");

  useEffect(() => {
    if (!showContactData && (datosTab === "contacto" || datosTab === "permisos")) {
      setDatosTab("general");
    }
  }, [showContactData, datosTab]);

  function setMainTab(tab: MainTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "datos") params.delete("tab");
    else params.set("tab", tab);
    const qs = params.toString();
    router.replace(qs ? `/players/${player.id}?${qs}` : `/players/${player.id}`, { scroll: false });
  }

  function openEdit(tab: DatosTab = datosTab) {
    setEditFormTab(tab);
    setEditOpen(true);
  }

  async function handleDelete() {
    const name = formatPlayerName(player);
    if (!confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/players/${player.id}`, { method: "DELETE" });
    router.push("/players");
  }

  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant={statusBadgeVariant(player.playerStatus)}>
        {PLAYER_STATUS_LABELS[player.playerStatus]}
      </Badge>
      {canEdit && (
        <>
          <Button variant="outline" size="sm" onClick={() => openEdit("general")}>
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Editar
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={handleDelete}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Eliminar
          </Button>
        </>
      )}
    </div>
  );

  return (
    <PageShell width={mainTab === "datos" ? "sm" : "lg"}>
      <Link href="/players" className="text-sm text-muted-foreground hover:text-foreground">
        ← Volver
      </Link>

      <div className="flex gap-4 items-start">
        <div className="relative w-20 h-20 rounded-lg border bg-muted/40 overflow-hidden shrink-0">
          {player.photoUrl ? (
            <Image src={player.photoUrl} alt="" fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              Sin foto
            </div>
          )}
        </div>
        <PageHeader
          title={formatPlayerName(player)}
          description={`${age} años · ${DOCUMENT_TYPE_LABELS[player.documentType]} ${player.documentId}`}
          actions={headerActions}
          className="flex-1 min-w-0"
        />
      </div>

      <PageTabs tabs={mainTabs} value={mainTab} onChange={(id) => setMainTab(id as MainTab)} />

      {mainTab === "datos" && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <PageTabs tabs={datosTabs} value={datosTab} onChange={setDatosTab} className="flex-1 min-w-0" />
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => openEdit(datosTab)}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Editar {datosTabs.find((t) => t.id === datosTab)?.label.toLowerCase()}
              </Button>
            )}
          </div>

          {datosTab === "general" && (
            <Card>
              <CardContent className="pt-5">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Nombres" value={player.firstName} />
                  <Field label="Apellido paterno" value={player.paternalLastName} />
                  <Field label="Apellido materno" value={player.maternalLastName} />
                  <Field
                    label="Género"
                    value={PLAYER_GENDER_LABELS[player.gender === "FEMALE" ? "FEMALE" : "MALE"]}
                  />
                  <Field
                    label="Fecha de nacimiento"
                    value={format(player.birthDate, "d 'de' MMMM 'de' yyyy", { locale: es })}
                  />
                  <Field label="Edad" value={`${age} años`} />
                  <Field
                    label="Estatus en el club"
                    value={
                      <Badge
                        variant={player.membershipStatus === "ASOCIADO" ? "default" : "secondary"}
                        className="mt-0.5"
                      >
                        {MEMBERSHIP_STATUS_LABELS[player.membershipStatus]}
                      </Badge>
                    }
                  />
                  {player.membershipCardNumber && (
                    <Field label="Número de carnet" value={player.membershipCardNumber} />
                  )}
                  <Field label="Código de federación" value={player.federationCode} />
                  <Field
                    label="Situación"
                    value={
                      <Badge variant={statusBadgeVariant(player.playerStatus)} className="mt-0.5">
                        {PLAYER_STATUS_LABELS[player.playerStatus]}
                      </Badge>
                    }
                  />
                  <Field
                    label="Incorporación al equipo"
                    value={
                      player.teamJoinDate
                        ? format(player.teamJoinDate, "d 'de' MMMM 'de' yyyy", { locale: es })
                        : null
                    }
                  />
                </div>

                {(player.photoUrl || (showContactData && (player.documentPhotoFrontUrl || player.documentPhotoBackUrl))) && (
                  <div className="mt-6 pt-4 border-t space-y-4">
                    {player.photoUrl && (
                      <div>
                        <span className="text-gray-500 block text-xs mb-2">Foto del jugador</span>
                        <div className="relative w-full max-w-xs aspect-square rounded-lg border overflow-hidden">
                          <Image
                            src={player.photoUrl}
                            alt="Foto del jugador"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      </div>
                    )}
                    {showContactData && (player.documentPhotoFrontUrl || player.documentPhotoBackUrl) && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {player.documentPhotoFrontUrl && (
                          <div>
                            <span className="text-gray-500 block text-xs mb-2">Documento — delantero</span>
                            <div className="relative w-full max-w-xs aspect-[4/3] rounded-lg border overflow-hidden">
                              <Image
                                src={player.documentPhotoFrontUrl}
                                alt="Documento delantero"
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          </div>
                        )}
                        {player.documentPhotoBackUrl && (
                          <div>
                            <span className="text-gray-500 block text-xs mb-2">Documento — espalda</span>
                            <div className="relative w-full max-w-xs aspect-[4/3] rounded-lg border overflow-hidden">
                              <Image
                                src={player.documentPhotoBackUrl}
                                alt="Documento espalda"
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {showContactData && datosTab === "contacto" && (
            <Card>
              <CardContent className="pt-5 space-y-4">
                <Field label="Dirección" value={player.homeAddress} />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Teléfono del jugador" value={player.contactPhone} />
                  <Field label="Correo del jugador" value={player.playerEmail} />
                </div>
                <GuardianFields
                  title="Papá"
                  name={player.fatherName}
                  email={player.fatherEmail}
                  phone={player.fatherPhone}
                />
                <GuardianFields
                  title="Mamá"
                  name={player.motherName}
                  email={player.motherEmail}
                  phone={player.motherPhone}
                />
                <GuardianFields
                  title="Tutor"
                  name={player.tutorName}
                  email={player.tutorEmail}
                  phone={player.tutorPhone}
                />
              </CardContent>
            </Card>
          )}

          {showContactData && datosTab === "permisos" && (
            <Card>
              <CardContent className="pt-5">
                <div className="grid gap-4">
                  <Field label="Centro educativo" value={player.educationalCenter} />
                  <Field label="Grado de instrucción actual" value={player.educationLevel} />
                  <Field label="Solicitud de permiso dirigida a" value={player.absencePermissionContact} />
                </div>
              </CardContent>
            </Card>
          )}

          {datosTab === "medico" && (
            <Card>
              <CardContent className="pt-5 space-y-4">
                {!showContactData && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Información médica para uso en emergencias durante entrenamientos o partidos.
                  </p>
                )}
                <Field label="Tipo de sangre" value={player.bloodType} />
                <Field label="Información médica" value={player.medicalInfo} />
                <Field label="Alergias" value={player.allergies} />
                <Field label="Seguro / EPS" value={player.epsInsurance} />
                <Field label="Observaciones" value={player.observations} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historial de Convocatorias</CardTitle>
            </CardHeader>
            <CardContent>
              {player.convocatorias.length === 0 ? (
                <p className="text-gray-400 text-sm">Sin convocatorias registradas</p>
              ) : (
                <div className="divide-y">
                  {player.convocatorias.map((cp) => (
                    <div key={cp.id} className="py-3 flex items-center justify-between">
                      <div>
                        <Link
                          href={`/convocatorias/${cp.convocatoria.id}`}
                          className="font-medium hover:text-blue-600 hover:underline text-sm"
                        >
                          {cp.convocatoria.name}
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Convocado: {format(cp.joinedAt, "d MMM yyyy", { locale: es })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {cp.status === "CUT" ? (
                          <Badge variant="destructive">Cortado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            Activo
                          </Badge>
                        )}
                        <Badge variant={cp.convocatoria.status === "ACTIVE" ? "default" : "secondary"}>
                          {cp.convocatoria.status === "ACTIVE" ? "Activa" : "Cerrada"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {mainTab === "asistencia" && (
        <div className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Link href="/asistencias">
                <Button variant="outline" size="sm">
                  Registrar asistencia →
                </Button>
              </Link>
            </div>
          )}
          <PlayerAsistenciaPanel playerId={player.id} hideScores={hideScores} />
        </div>
      )}

      {mainTab === "tests" && (
        <div className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Link href="/tests">
                <Button variant="outline" size="sm">
                  Registrar evaluaciones →
                </Button>
              </Link>
            </div>
          )}
          <PlayerTestsPanel playerId={player.id} />
        </div>
      )}

      {mainTab === "partidos" && showPartidos && (
        <div className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Link href="/partidos">
                <Button variant="outline" size="sm">
                  Gestionar partidos →
                </Button>
              </Link>
            </div>
          )}
          <PlayerPartidosPanel playerId={player.id} />
        </div>
      )}

      {canEdit && (
        <PlayerFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          player={playerToFormData(player)}
          initialFormTab={editFormTab}
          onSuccess={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      )}
    </PageShell>
  );
}
