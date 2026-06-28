import type { DocumentType, Gender, MembershipStatus, PlayerStatus } from "@prisma/client";

const DOC_TYPES = new Set<string>(["DNI", "PASAPORTE", "CARNET_EXTRANJERIA"]);
const MEMBERSHIP = new Set<string>(["ASOCIADO", "NO_ASOCIADO"]);
const GENDERS = new Set<string>(["MALE", "FEMALE"]);
const PLAYER_STATUSES = new Set<string>(["ACTIVE", "INACTIVE", "SUSPENDED"]);
const BLOOD_TYPES = new Set<string>(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);

function optStr(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s || null;
}

export function parsePlayerBody(body: Record<string, unknown>) {
  const firstName = String(body.firstName ?? "").trim();
  const paternalLastName = String(body.paternalLastName ?? "").trim();
  const maternalLastName = String(body.maternalLastName ?? "").trim();
  const documentType = String(body.documentType ?? "DNI");
  const documentId = String(body.documentId ?? "").trim();
  const birthDate = String(body.birthDate ?? "");
  const gender = String(body.gender ?? "MALE");
  const membershipStatus = String(body.membershipStatus ?? "NO_ASOCIADO");
  const playerStatus = String(body.playerStatus ?? "ACTIVE");
  const federationCode = optStr(body.federationCode);
  const membershipCardNumber = body.membershipCardNumber
    ? String(body.membershipCardNumber).trim()
    : null;
  const teamJoinDate = body.teamJoinDate ? String(body.teamJoinDate) : null;

  const homeAddress = optStr(body.homeAddress);
  const contactPhone = optStr(body.contactPhone);
  const playerEmail = optStr(body.playerEmail);
  const fatherName = optStr(body.fatherName);
  const fatherEmail = optStr(body.fatherEmail);
  const fatherPhone = optStr(body.fatherPhone);
  const motherName = optStr(body.motherName);
  const motherEmail = optStr(body.motherEmail);
  const motherPhone = optStr(body.motherPhone);
  const tutorName = optStr(body.tutorName);
  const tutorEmail = optStr(body.tutorEmail);
  const tutorPhone = optStr(body.tutorPhone);
  const educationalCenter = optStr(body.educationalCenter);
  const educationLevel = optStr(body.educationLevel);
  const absencePermissionContact = optStr(body.absencePermissionContact);
  const medicalInfo = optStr(body.medicalInfo);
  const bloodType = optStr(body.bloodType);
  const allergies = optStr(body.allergies);
  const epsInsurance = optStr(body.epsInsurance);
  const observations = optStr(body.observations);

  if (!firstName || !paternalLastName || !documentId || !birthDate) {
    return { error: "Nombres, apellido paterno, documento y fecha de nacimiento son obligatorios" as const };
  }
  if (!DOC_TYPES.has(documentType)) {
    return { error: "Tipo de documento inválido" as const };
  }
  if (!GENDERS.has(gender)) {
    return { error: "Género inválido" as const };
  }
  if (!MEMBERSHIP.has(membershipStatus)) {
    return { error: "Estatus de asociado inválido" as const };
  }
  if (!PLAYER_STATUSES.has(playerStatus)) {
    return { error: "Situación del jugador inválida" as const };
  }
  if (membershipStatus === "ASOCIADO" && !membershipCardNumber) {
    return { error: "Indicá el número de carnet para asociados" as const };
  }

  const parsedBirthDate = new Date(birthDate);
  if (Number.isNaN(parsedBirthDate.getTime())) {
    return { error: "Fecha de nacimiento inválida" as const };
  }

  if (bloodType && !BLOOD_TYPES.has(bloodType)) {
    return { error: "Tipo de sangre inválido" as const };
  }

  if (!fatherPhone && !motherPhone && !tutorPhone) {
    return {
      error: "Indicá el teléfono de al menos uno: papá, mamá o tutor",
    } as const;
  }

  return {
    data: {
      firstName,
      paternalLastName,
      maternalLastName,
      documentType: documentType as DocumentType,
      documentId,
      birthDate: parsedBirthDate,
      gender: gender as Gender,
      membershipStatus: membershipStatus as MembershipStatus,
      membershipCardNumber: membershipStatus === "ASOCIADO" ? membershipCardNumber : null,
      federationCode,
      playerStatus: playerStatus as PlayerStatus,
      teamJoinDate: teamJoinDate ? new Date(teamJoinDate) : null,
      homeAddress,
      contactPhone,
      playerEmail,
      fatherName,
      fatherEmail,
      fatherPhone,
      motherName,
      motherEmail,
      motherPhone,
      tutorName,
      tutorEmail,
      tutorPhone,
      educationalCenter,
      educationLevel,
      absencePermissionContact,
      medicalInfo,
      bloodType,
      allergies,
      epsInsurance,
      observations,
    },
  };
}
