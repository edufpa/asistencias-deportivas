import type { DocumentType } from "@prisma/client";
import type { PlayerGender } from "@/lib/player";

export function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function birthDateToIso(value: string): string | null {
  const iso = value.includes("T") ? value.split("T")[0] : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  return iso;
}

export function buildRegistrationUrl(token: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/registro/${token}`;
}

export type RegistrationPayload = {
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  birthDate: string;
  documentType: DocumentType;
  documentId: string;
  gender: PlayerGender;
  email: string;
  password: string;
  passwordConfirm: string;
};

export function validateRegistrationPayload(body: Partial<RegistrationPayload>): string | null {
  if (!body.firstName?.trim()) return "Los nombres son requeridos";
  if (!body.paternalLastName?.trim()) return "El apellido paterno es requerido";
  if (!body.maternalLastName?.trim()) return "El apellido materno es requerido";
  if (!body.birthDate || !birthDateToIso(body.birthDate)) return "La fecha de nacimiento es inválida";
  if (!body.documentType) return "El tipo de documento es requerido";
  if (!body.documentId?.trim()) return "El número de documento es requerido";
  if (!body.gender || (body.gender !== "MALE" && body.gender !== "FEMALE")) {
    return "Seleccioná el género";
  }
  if (!body.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    return "Ingresá un correo válido";
  }
  if (!body.password || body.password.length < 6) {
    return "La contraseña debe tener al menos 6 caracteres";
  }
  if (body.password !== body.passwordConfirm) {
    return "Las contraseñas no coinciden";
  }
  return null;
}

export function normalizeDocumentId(value: string): string {
  return value.trim().toUpperCase();
}
