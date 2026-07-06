import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { defaultHomePath, normalizeRole } from "@/lib/permissions";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = normalizeRole((session.user as { role?: string }).role);
  redirect(defaultHomePath(role, session.user.email));
}
