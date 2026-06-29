"use client";

import { useSession } from "next-auth/react";
import { canEditAttendance, normalizeRole } from "@/lib/permissions";

export function useCanEditAttendance(): boolean {
  const { data: session } = useSession();
  const role = normalizeRole((session?.user as { role?: string } | undefined)?.role);
  return canEditAttendance(role, session?.user?.email);
}
