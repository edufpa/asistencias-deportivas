"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/players", label: "Jugadores" },
  { href: "/convocatorias", label: "Convocatorias" },
  { href: "/tests", label: "Tests" },
  { href: "/reportes", label: "Asistencias" },
  { href: "/reportes/partidos", label: "Partidos" },
];

const adminLinks = [
  { href: "/admin/usuarios", label: "👥 Usuarios" },
  { href: "/admin/logs", label: "📋 Actividad" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  return (
    <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <Image src="/logo.png" alt="FDNDA" width={36} height={44} className="object-contain" priority />
              <span className="font-bold text-sm text-blue-900 hidden lg:block leading-tight">
                FDNDA<br /><span className="text-xs font-normal text-gray-500">Asistencias</span>
              </span>
            </Link>
            <nav className="hidden md:flex gap-1">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    pathname.startsWith(link.href)
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  )}>
                  {link.label}
                </Link>
              ))}
              {isAdmin && (
                <>
                  <span className="w-px bg-gray-200 mx-1 self-stretch" />
                  {adminLinks.map((link) => (
                    <Link key={link.href} href={link.href}
                      className={cn(
                        "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        pathname.startsWith(link.href)
                          ? "bg-amber-50 text-amber-700"
                          : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                      )}>
                      {link.label}
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-500">
              {session?.user?.name}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none">
                {session?.user?.name?.charAt(0).toUpperCase() ?? "U"}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/admin/usuarios">👥 Usuarios</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/admin/logs">📋 Actividad</Link>
                    </DropdownMenuItem>
                    <div className="h-px bg-gray-100 my-1" />
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-red-600 cursor-pointer"
                >
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
