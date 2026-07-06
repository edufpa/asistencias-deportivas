import type { McpAuthContext } from "@/lib/mcp/oauth";
import type { AppRole } from "@/lib/permissions";
import {
  canAccessPlayersList,
  canCreatePlayers,
  canDeletePlayers,
  canEditAttendance,
  canEditPlayers,
  hasComisionLikeRole,
} from "@/lib/permissions";

export function mcpForbidden(message: string): never {
  throw new Error(message);
}

export function assertRole(ctx: McpAuthContext, allowed: AppRole[]): void {
  if (!allowed.includes(ctx.role)) {
    mcpForbidden(`No tenés permiso (${ctx.role}). Roles permitidos: ${allowed.join(", ")}`);
  }
}

export function canManageCalendar(ctx: McpAuthContext): boolean {
  return (
    ctx.role === "SUPER_ADMIN" ||
    hasComisionLikeRole(ctx.role) ||
    ctx.role === "COACH"
  );
}

export function canDeleteCalendar(ctx: McpAuthContext): boolean {
  return ctx.role === "SUPER_ADMIN" || hasComisionLikeRole(ctx.role);
}

export function assertCanManageCalendar(ctx: McpAuthContext): void {
  if (!canManageCalendar(ctx)) mcpForbidden("No tenés permiso para modificar el calendario");
}

export function assertCanDeleteCalendar(ctx: McpAuthContext): void {
  if (!canDeleteCalendar(ctx)) mcpForbidden("Solo comisión puede eliminar eventos del calendario");
}

export function assertCanListPlayers(ctx: McpAuthContext): void {
  if (!canAccessPlayersList(ctx.role) && ctx.role !== "PARENT") {
    mcpForbidden("No tenés permiso para ver el listado de jugadores");
  }
}

export function assertCanCreatePlayer(ctx: McpAuthContext): void {
  if (!canCreatePlayers(ctx.role)) mcpForbidden("Solo comisión puede crear jugadores");
}

export function assertCanEditPlayer(ctx: McpAuthContext): void {
  if (!canEditPlayers(ctx.role)) mcpForbidden("Solo comisión puede editar jugadores");
}

export function assertCanDeletePlayer(ctx: McpAuthContext): void {
  if (!canDeletePlayers(ctx.role)) mcpForbidden("Solo comisión puede eliminar jugadores");
}

export function assertCanEditAttendance(ctx: McpAuthContext): void {
  if (!canEditAttendance(ctx.role, ctx.email)) {
    mcpForbidden("No tenés permiso para modificar asistencias");
  }
}
