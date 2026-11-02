import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isTemporaryClubEmail } from "@/lib/clubEmail";
import { isSafeCallbackUrl } from "@/lib/mcp/config";

export async function proxy(req: NextRequest) {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  const email = session?.user?.email;
  const needsAccountSetup = isLoggedIn && isTemporaryClubEmail(email);

  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === "/login";
  const isSetupPage = pathname === "/setup" || pathname === "/api/setup";
  const isApiAuth = pathname.startsWith("/api/auth");
  const isCompleteAccountPage = pathname === "/completar-cuenta";
  const isCompleteAccountApi = pathname === "/api/me/complete-account";
  const isPublicRegistration =
    pathname.startsWith("/registro/") || pathname.startsWith("/api/registro/");
  const isPublicPasswordReset =
    pathname === "/olvide-contrasena" ||
    pathname.startsWith("/restablecer-contrasena/") ||
    pathname === "/api/auth/forgot-password" ||
    pathname.startsWith("/api/auth/reset-password/");
  const isMcpPublic =
    pathname.startsWith("/api/mcp") ||
    pathname.startsWith("/.well-known/") ||
    pathname === "/authorize" ||
    pathname === "/token" ||
    pathname === "/register";

  if (
    isApiAuth ||
    isSetupPage ||
    isPublicRegistration ||
    isPublicPasswordReset ||
    isCompleteAccountApi ||
    isMcpPublic
  ) {
    return NextResponse.next();
  }

  if (needsAccountSetup && !isCompleteAccountPage) {
    return NextResponse.redirect(new URL("/completar-cuenta", req.nextUrl));
  }

  if (!isLoggedIn && isCompleteAccountPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isLoginPage) {
    const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
    if (callbackUrl && isSafeCallbackUrl(callbackUrl, req.nextUrl.origin)) {
      return NextResponse.redirect(callbackUrl);
    }
    const role = (session.user as { role?: string }).role;
    const dest = needsAccountSetup
      ? "/completar-cuenta"
      : role === "PARENT"
        ? "/mi-perfil"
        : "/dashboard";
    return NextResponse.redirect(new URL(dest, req.nextUrl));
  }

  if (isLoggedIn && isCompleteAccountPage && !needsAccountSetup) {
    const role = (session.user as { role?: string }).role;
    const dest = role === "PARENT" ? "/mi-perfil" : "/dashboard";
    return NextResponse.redirect(new URL(dest, req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.svg|logo-rcl.svg).*)"],
};
