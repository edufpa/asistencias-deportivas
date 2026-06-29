import {
  BarChart3,
  ClipboardCheck,
  FlaskConical,
  UserCog,
  Users,
} from "lucide-react";
import type { AppRole } from "@/lib/permissions";
import {
  canAccessAdminPanel,
  canAccessPlayersList,
  canAccessReportes,
  canAccessTestsCatalog,
  canEditAttendance,
} from "@/lib/permissions";
import { ActionTile, ActionTileGrid } from "@/components/layout";

function buildActions(role: AppRole, email: string | null | undefined, pendingUsers: number) {
  const actions: {
    href: string;
    label: string;
    description: string;
    icon: typeof ClipboardCheck;
    badge?: number;
  }[] = [];

  if (canEditAttendance(role, email)) {
    actions.push({
      href: "/asistencias",
      label: "Registrar asistencia",
      description: "Marcar turnos del día",
      icon: ClipboardCheck,
    });
  }

  if (canAccessReportes(role)) {
    actions.push({
      href: "/reportes?period=30",
      label: "Reporte de asistencia",
      description: "Ranking y categorías",
      icon: BarChart3,
    });
  }

  if (canAccessTestsCatalog(role)) {
    actions.push({
      href: "/tests",
      label: "Tests",
      description: "Evaluaciones físicas",
      icon: FlaskConical,
    });
  }

  if (canAccessPlayersList(role)) {
    actions.push({
      href: "/players",
      label: "Jugadores",
      description: "Plantel y fichas",
      icon: Users,
    });
  }

  if (canAccessAdminPanel(role)) {
    actions.push({
      href: "/admin/usuarios",
      label: "Usuarios",
      description: "Aprobar registros",
      icon: UserCog,
      badge: pendingUsers > 0 ? pendingUsers : undefined,
    });
  }

  return actions;
}

export function DashboardQuickActions({
  role,
  email,
  pendingUsers,
}: {
  role: AppRole;
  email?: string | null;
  pendingUsers: number;
}) {
  const actions = buildActions(role, email, pendingUsers);

  if (actions.length === 0) return null;

  return (
    <ActionTileGrid>
      {actions.map((action) => (
        <ActionTile key={action.href} {...action} />
      ))}
    </ActionTileGrid>
  );
}
