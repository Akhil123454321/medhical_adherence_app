import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  patient: "/patient",
  chw: "/chw",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let auth API calls, set-password page, and static assets through unconditionally
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;

  // If already authenticated and hitting the login page → send to role home
  if (pathname.startsWith("/login")) {
    if (payload) {
      const home = ROLE_HOME[payload.role] ?? "/login";
      return NextResponse.redirect(new URL(home, request.url));
    }
    return NextResponse.next();
  }

  // Post-survey — must be logged in as patient or CHW
  if (pathname.startsWith("/survey")) {
    if (!payload) return NextResponse.redirect(new URL("/login", request.url));
    if (payload.role === "admin") return NextResponse.redirect(new URL("/admin", request.url));
    return NextResponse.next();
  }

  // Onboarding page — must be logged in, not yet completed first login
  if (pathname.startsWith("/onboarding")) {
    if (!payload) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (payload.firstLoginComplete) {
      const home = ROLE_HOME[payload.role] ?? "/login";
      return NextResponse.redirect(new URL(home, request.url));
    }
    return NextResponse.next();
  }

  // Protected role areas
  const protectedAreas: Record<string, string> = {
    "/admin": "admin",
    "/patient": "patient",
    "/chw": "chw",
  };

  for (const [prefix, requiredRole] of Object.entries(protectedAreas)) {
    if (pathname.startsWith(prefix) || pathname === "/") {
      if (!payload) {
        const loginUrl = new URL("/login", request.url);
        const response = NextResponse.redirect(loginUrl);
        if (token) response.cookies.set(AUTH_COOKIE, "", { maxAge: 0, path: "/" });
        return response;
      }
      // Wrong role → redirect to their own home
      if (payload.role !== requiredRole) {
        const home = ROLE_HOME[payload.role] ?? "/login";
        return NextResponse.redirect(new URL(home, request.url));
      }
      // Patient/CHW hasn't completed first login → onboarding
      if (!payload.firstLoginComplete && payload.role !== "admin") {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
