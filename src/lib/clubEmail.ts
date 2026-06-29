/** Dominio de cuentas temporales del club (jugadores, staff, comisión, etc.). */
export const CLUB_TEMPORARY_EMAIL_DOMAIN = "@waterpolo.com";

export function isTemporaryClubEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase().endsWith(CLUB_TEMPORARY_EMAIL_DOMAIN);
}
