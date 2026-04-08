import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const isLoggedIn =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");

  const isLoginPage = req.nextUrl.pathname === "/login";
  const isSetupPage =
    req.nextUrl.pathname === "/setup" ||
    req.nextUrl.pathname === "/api/setup";
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");

  if (isApiAuth || isSetupPage) return NextResponse.next();

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
