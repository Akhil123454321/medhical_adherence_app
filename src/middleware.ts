import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let auth API calls and static assets through unconditionally
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;

  // If already authenticated and hitting the login page → send to /admin
  if (pathname.startsWith("/login")) {
    if (payload) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // Protect everything under /admin
  if (pathname.startsWith("/admin") || pathname === "/") {
    if (!payload) {
      const loginUrl = new URL("/login", request.url);
      const response = NextResponse.redirect(loginUrl);
      // Clear a stale / invalid cookie if present
      if (token) {
        response.cookies.set(AUTH_COOKIE, "", { maxAge: 0, path: "/" });
      }
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
