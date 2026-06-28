"use client";

import { useAppRole } from "@/hooks/useAppRole";
import type { AppRole } from "@/lib/permissions";
import Link from "next/link";

export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="py-16 text-center space-y-3">
      <p className="text-red-600 font-medium">
        {message ?? "No tenés permiso para acceder a esta sección."}
      </p>
      <Link href="/asistencias" className="text-sm text-blue-600 hover:underline">
        Ir a Asistencias
      </Link>
    </div>
  );
}

export function RoleGate({
  allow,
  children,
  message,
}: {
  allow: (role: AppRole) => boolean;
  children: React.ReactNode;
  message?: string;
}) {
  const role = useAppRole();
  if (!allow(role)) return <AccessDenied message={message} />;
  return <>{children}</>;
}
