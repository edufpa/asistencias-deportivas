"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useAppRole } from "@/hooks/useAppRole";
import {
  navLinksForRole,
  canAccessAdminPanel,
  ROLE_LABELS,
} from "@/lib/permissions";
import { ClubLogo } from "@/components/ClubLogo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Trophy,
  Heart,
  FlaskConical,
  BarChart3,
  Swords,
  UserCog,
  ScrollText,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const adminLinks = [
  { href: "/admin/usuarios", label: "Usuarios", icon: UserCog },
  { href: "/admin/logs", label: "Actividad", icon: ScrollText },
];

const navIcons: Record<string, ComponentType<{ className?: string }>> = {
  "/dashboard": LayoutDashboard,
  "/players": Users,
  "/asistencias": ClipboardCheck,
  "/convocatorias": Trophy,
  "/mi-perfil": Heart,
  "/tests": FlaskConical,
  "/reportes": BarChart3,
  "/reportes/partidos": Swords,
};

function NavItem({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = navIcons[href] ?? ClipboardCheck;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
        active
          ? "bg-white text-primary shadow-md shadow-primary/10"
          : "text-sky-100 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-sky-500" : "text-sky-200")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = useAppRole();
  const navLinks = navLinksForRole(role);
  const showAdmin = canAccessAdminPanel(role);
  const homeHref = role === "PARENT" ? "/mi-perfil" : "/dashboard";

  const isActive = (href: string) =>
    href === "/reportes"
      ? pathname === "/reportes"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-white/10">
        <Link href={homeHref} onClick={onNavigate} className="block">
          <ClubLogo size="md" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-sky-300/70">
          Menú principal
        </p>
        {navLinks.map((link) => (
          <NavItem
            key={link.href}
            href={link.href}
            label={link.label}
            active={isActive(link.href)}
            onNavigate={onNavigate}
          />
        ))}

        {showAdmin && (
          <>
            <p className="px-3 mt-5 mb-2 text-[10px] font-semibold uppercase tracking-wider text-sky-300/70">
              Administración
            </p>
            {adminLinks.map((link) => (
              <NavItem
                key={link.href}
                href={link.href}
                label={link.label}
                active={pathname.startsWith(link.href)}
                onNavigate={onNavigate}
              />
            ))}
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-white/10 space-y-3">
        <div className="px-3 py-2 rounded-lg bg-white/5">
          <p className="text-sm font-medium text-white truncate">{session?.user?.name}</p>
          <p className="text-xs text-sky-200/80 truncate">{ROLE_LABELS[role]}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sky-100 hover:text-white hover:bg-white/10"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = useAppRole();
  const homeHref = role === "PARENT" ? "/mi-perfil" : "/dashboard";

  return (
    <>
      {/* Barra superior móvil */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 h-14 bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] border-b border-sky-400/20 flex items-center justify-between px-4 shadow-lg">
        <Link href={homeHref} className="flex items-center gap-2">
          <ClubLogo size="sm" showText={false} />
          <span className="text-white font-bold text-sm">Regatas Lima</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="p-2 rounded-lg text-white hover:bg-white/10"
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Overlay móvil */}
      {mobileOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-[#1e3a8a]/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      {/* Sidebar móvil */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-gradient-to-b from-[#1e3a8a] via-[#1e40af] to-[#172554] shadow-2xl transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:z-40 bg-gradient-to-b from-[#1e3a8a] via-[#1e40af] to-[#172554] border-r border-sky-400/20 shadow-xl">
        <SidebarContent />
      </aside>
    </>
  );
}
