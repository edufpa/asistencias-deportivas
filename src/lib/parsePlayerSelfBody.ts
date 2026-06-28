const BLOOD_TYPES = new Set<string>(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);

function optStr(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s || null;
}

/** Campos que el jugador puede editar en su propia ficha. */
export function parsePlayerSelfBody(body: Record<string, unknown>) {
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
