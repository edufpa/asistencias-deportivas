"use client";

import { RoleGate } from "@/components/RoleGate";
import { canAccessTorneos } from "@/lib/permissions";

export default function ConvocatoriasLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allow={canAccessTorneos} message="Los apoderados no tienen acceso a torneos.">
      {children}
    </RoleGate>
  );
}
