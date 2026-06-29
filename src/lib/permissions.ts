export type AppRole = "SUPER_ADMIN" | "COMISION" | "COACH" | "PARENT";

/** Comisión con permiso para modificar asistencias y puntajes 1–4. */
export const COMISION_ATTENDANCE_EDITOR_EMAIL = "site.eduardo@gmail.com";

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function canComisionEditAttendanceAndScores(email: string | null | undefined): boolean {
  return normalizeEmail(email) === COMISION_ATTENDANCE_EDITOR_EMAIL;
}

/** ADMIN legacy → SUPER_ADMIN */
export function normalizeRole(role: string | undefined | null): AppRole {
  if (!role) return "COACH";
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (role === "COMISION") return "COMISION";
  if (role === "PARENT") return "PARENT";
  return "COACH";
}

export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin",
  COMISION: "Comisión",
  COACH: "Entrenador",
  PARENT: "Jugador",
};

export const ASSIGNABLE_ROLES: AppRole[] = [
  "SUPER_ADMIN",
  "COMISION",
  "COACH",
  "PARENT",
];

export type NavLink = { href: string; label: string };

export function canManageUsers(role: AppRole): boolean {
  return role === "SUPER_ADMIN" || role === "COMISION";
}

export function canAssignRole(actor: AppRole, target: AppRole): boolean {
  if (actor === "SUPER_ADMIN") return true;
  if (actor === "COMISION") return target !== "SUPER_ADMIN";
  return false;
}

export function canEditPlayers(role: AppRole): boolean {
  return role === "SUPER_ADMIN" || role === "COMISION";
}

export function canCreatePlayers(role: AppRole): boolean {
  return canEditPlayers(role);
}

export function canDeletePlayers(role: AppRole): boolean {
  return canEditPlayers(role);
}

export function canEditAttendance(role: AppRole, email?: string | null): boolean {
  if (role === "PARENT") return false;
  if (role === "COMISION") return canComisionEditAttendanceAndScores(email);
  return true;
}

export function canViewPerformanceScores(role: AppRole): boolean {
  return role !== "PARENT";
}

export function canAccessTorneos(role: AppRole): boolean {
  return role !== "PARENT";
}

export function canAccessPartidos(role: AppRole): boolean {
  return role !== "PARENT";
}

export function canAccessReportes(role: AppRole): boolean {
  return role !== "PARENT";
}

export function canAccessTestsCatalog(role: AppRole): boolean {
  return role !== "PARENT";
}

export function canAccessPlayersList(role: AppRole): boolean {
  return role !== "PARENT";
}

export function canAccessDashboard(role: AppRole): boolean {
  return role !== "PARENT";
}

export function canAccessAdminPanel(role: AppRole): boolean {
  return role === "SUPER_ADMIN" || role === "COMISION";
}

export function canViewAdminLogs(role: AppRole): boolean {
  return canAccessAdminPanel(role);
}

export function canAccessAsistenciasSheet(role: AppRole): boolean {
  return role !== "PARENT";
}

/** Contacto, familiares, permisos escolares y fotos de documento — no visible para entrenadores. */
export function canViewPlayerContactData(role: AppRole): boolean {
  return role === "SUPER_ADMIN" || role === "COMISION" || role === "PARENT";
}

/** @deprecated Usar canViewPlayerContactData */
export const canViewPlayerSensitiveData = canViewPlayerContactData;

export function navLinksForRole(role: AppRole): NavLink[] {
  const links: NavLink[] = [];
  if (canAccessDashboard(role)) links.push({ href: "/dashboard", label: "Dashboard" });
  if (canAccessPlayersList(role)) links.push({ href: "/players", label: "Jugadores" });
  if (canAccessAsistenciasSheet(role)) links.push({ href: "/asistencias", label: "Asistencia" });
  if (canAccessReportes(role)) links.push({ href: "/reportes", label: "Reporte Asistencias" });
  if (role === "PARENT") {
    links.push({ href: "/mi-perfil", label: "Mi perfil" });
  } else if (canAccessTestsCatalog(role)) {
    links.push({ href: "/tests", label: "Tests" });
  }
  if (canAccessTorneos(role)) links.push({ href: "/convocatorias", label: "Torneos" });
  if (canAccessPartidos(role)) links.push({ href: "/reportes/partidos", label: "Partidos" });
  return links;
}
