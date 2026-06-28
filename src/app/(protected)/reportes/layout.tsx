"use client";

import { RoleGate } from "@/components/RoleGate";
import { canAccessReportes } from "@/lib/permissions";

export default function ReportesLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allow={canAccessReportes}>
      {children}
    </RoleGate>
  );
}
