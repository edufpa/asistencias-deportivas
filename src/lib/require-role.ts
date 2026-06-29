import { auth } from "@/lib/auth";
import { normalizeRole, type AppRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

export async function getServerRole() {
  const session = await auth();
  if (!session?.user) return null;
  const role = normalizeRole((session.user as { role?: string }).role);
  return { session, role, userId: session.user.id, email: session.user.email ?? null };
}

export async function requireServerRole(check: (role: AppRole) => boolean, fallback = "/asistencias") {
  const ctx = await getServerRole();
  if (!ctx) redirect("/login");
  if (!check(ctx.role)) redirect(fallback);
  return ctx;
}
