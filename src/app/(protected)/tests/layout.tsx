"use client";

import { RoleGate } from "@/components/RoleGate";
import { canAccessTestsCatalog } from "@/lib/permissions";

export default function TestsLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allow={canAccessTestsCatalog} message="Usá Mi perfil para ver tus tests.">
      {children}
    </RoleGate>
  );
}
