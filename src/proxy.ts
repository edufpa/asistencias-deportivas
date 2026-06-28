import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const isLoggedIn =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");

  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === "/login";
  const isSetupPage = pathname === "/setup" || pathname === "/api/setup";
  const isApiAuth = pathname.startsWith("/api/auth");
  const isPublicRegistration =
    pathname.startsWith("/registro/") || pathname.startsWith("/api/registro/");
  const isPublicPasswordReset =
    pathname === "/olvide-contrasena" ||
    pathname.startsWith("/restablecer-contrasena/") ||
    pathname === "/api/auth/forgot-password" ||
    pathname.startsWith("/api/auth/reset-password/");

  if (isApiAuth || isSetupPage || isPublicRegistration || isPublicPasswordReset) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-rcl.svg).*)"],
};
