"use client";

import { useSession } from "next-auth/react";
import { normalizeRole, type AppRole } from "@/lib/permissions";

export function useAppRole(): AppRole {
  const { data: session } = useSession();
  return normalizeRole((session?.user as { role?: string } | undefined)?.role);
}
