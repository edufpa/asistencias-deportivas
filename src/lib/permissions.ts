export type AppRole = "SUPER_ADMIN" | "COMISION" | "DELEGADO" | "COACH" | "PARENT";

/** Comisión con permiso para modificar asistencias. */
export const COMISION_ATTENDANCE_EDITOR_EMAIL = "site.eduardo@gmail.com";

/** Entrenador de pesas: pantalla simplificada de asistencia. */
export const PESAS_ATTENDANCE_EMAIL = "jmgarayar@gmail.com";

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isPesasAttendanceCoach(email: string | null | undefined): boolean {
  return normalizeEmail(email) === PESAS_ATTENDANCE_EMAIL;
}

/** Acceso directo a /asistencias/pesas (sin enlace en menú). */
export function canAccessPesasAttendancePage(role: AppRole, email?: string | null): boolean {
  if (!canAccessAsistenciasSheet(role)) return false;
  if (isPesasAttendanceCoach(email)) return true;
  return canComisionEditAttendanceAndScores(email);
}

/** UX dedicada: solo menú pesas y redirección al login. */
export function usesPesasAttendanceDedicatedUx(email: string | null | undefined): boolean {
  return isPesasAttendanceCoach(email);
}

export function canComisionEditAttendanceAndScores(email: string | null | undefined): boolean {
  return normalizeEmail(email) === COMISION_ATTENDANCE_EDITOR_EMAIL;
}

/** Mismos permisos operativos que comisión (sin super admin). */
export function hasComisionLikeRole(role: AppRole): boolean {
  return role === "COMISION" || role === "DELEGADO";
}

/** ADMIN legacy → SUPER_ADMIN */
export function normalizeRole(role: string | undefined | null): AppRole {
  if (!role) return "COACH";
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (role === "COMISION") return "COMISION";
  if (role === "DELEGADO") return "DELEGADO";
  if (role === "PARENT") return "PARENT";
  return "COACH";
}

export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin",
  COMISION: "Comisión",
  DELEGADO: "Delegado",
  COACH: "Entrenador",
  PARENT: "Jugador",
};

export const ASSIGNABLE_ROLES: AppRole[] = [
  "SUPER_ADMIN",
  "COMISION",
  "DELEGADO",
  "COACH",
  "PARENT",
];

export type NavLink = { href: string; label: string };

export function canManageUsers(role: AppRole): boolean {
  return role === "SUPER_ADMIN" || hasComisionLikeRole(role);
}

export function canAssignRole(actor: AppRole, target: AppRole): boolean {
  if (actor === "SUPER_ADMIN") return true;
  if (hasComisionLikeRole(actor)) return target !== "SUPER_ADMIN";
  return false;
}

export function canEditPlayers(role: AppRole): boolean {
  return role === "SUPER_ADMIN" || hasComisionLikeRole(role);
}

export function canCreatePlayers(role: AppRole): boolean {
  return canEditPlayers(role);
}

export function canDeletePlayers(role: AppRole): boolean {
  return canEditPlayers(role);
}

export function canEditAttendance(role: AppRole, email?: string | null): boolean {
  if (role === "PARENT") return false;
  if (isPesasAttendanceCoach(email)) return true;
  if (hasComisionLikeRole(role)) return canComisionEditAttendanceAndScores(email);
  return true;
}

export function canViewPerformanceScores(role: AppRole): boolean {
  void role;
  return false;
}

export function canAccessTorneos(role: AppRole): boolean {
  return role !== "PARENT";
}

export function canAccessPartidos(role: AppRole): boolean {
  return role !== "PARENT";
}

export function canCreateCoachReport(role: AppRole): boolean {
  return role === "COACH" || hasComisionLikeRole(role) || role === "SUPER_ADMIN";
}

export function canViewCoachReports(role: AppRole): boolean {
  return canCreateCoachReport(role);
}

export function canAccessInformes(role: AppRole): boolean {
  return canViewCoachReports(role);
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
  return role === "SUPER_ADMIN" || hasComisionLikeRole(role);
}

export function canViewAdminLogs(role: AppRole): boolean {
  return canAccessAdminPanel(role);
}

export function canAccessAsistenciasSheet(role: AppRole): boolean {
  return role !== "PARENT";
}

export function defaultHomePath(role: AppRole, email?: string | null): string {
  if (role === "PARENT") return "/mi-perfil";
  if (usesPesasAttendanceDedicatedUx(email)) return "/asistencias/pesas";
  return "/dashboard";
}

/** Contacto, familiares, permisos escolares y fotos de documento — no visible para entrenadores. */
export function canViewPlayerContactData(role: AppRole): boolean {
  return role === "SUPER_ADMIN" || hasComisionLikeRole(role) || role === "PARENT";
}

/** @deprecated Usar canViewPlayerContactData */
export const canViewPlayerSensitiveData = canViewPlayerContactData;

export function navLinksForRole(role: AppRole, email?: string | null): NavLink[] {
  const links: NavLink[] = [];
  if (canAccessDashboard(role) && !usesPesasAttendanceDedicatedUx(email)) {
    links.push({ href: "/dashboard", label: "Dashboard" });
  }
  if (canAccessPlayersList(role) && !usesPesasAttendanceDedicatedUx(email)) {
    links.push({ href: "/players", label: "Jugadores" });
  }
  if (canAccessAsistenciasSheet(role)) {
    links.push({
      href: usesPesasAttendanceDedicatedUx(email) ? "/asistencias/pesas" : "/asistencias",
      label: usesPesasAttendanceDedicatedUx(email) ? "Asistencia Pesas" : "Asistencia",
    });
  }
  if (canAccessReportes(role) && !usesPesasAttendanceDedicatedUx(email)) {
    links.push({ href: "/reportes", label: "Reporte Asistencias" });
  }
  if (role === "PARENT") {
    links.push({ href: "/mi-perfil", label: "Mi perfil" });
  } else if (canAccessTestsCatalog(role)) {
    links.push({ href: "/tests", label: "Tests" });
  }
  if (canAccessTorneos(role) && !usesPesasAttendanceDedicatedUx(email)) {
    links.push({ href: "/convocatorias", label: "Torneos" });
  }
  if (canAccessInformes(role) && !usesPesasAttendanceDedicatedUx(email)) {
    links.push({ href: "/informes", label: "Informes" });
  }
  if (canAccessPartidos(role) && !usesPesasAttendanceDedicatedUx(email)) {
    links.push({ href: "/reportes/partidos", label: "Partidos" });
  }
  if (!usesPesasAttendanceDedicatedUx(email)) {
    links.push({ href: "/calendario", label: "Calendario" });
  }
  return links;
}
