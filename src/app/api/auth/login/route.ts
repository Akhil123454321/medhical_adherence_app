import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { readDB } from "@/lib/db";
import { createToken, AUTH_COOKIE, TOKEN_TTL_MS, AuthPayload } from "@/lib/auth";
import { User } from "@/lib/types";

interface AdminRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: string;
}

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Admins still use password auth
  const admins = readDB<AdminRecord>("admins");
  const admin = admins.find(
    (a) => a.email.toLowerCase() === email.toLowerCase()
  );

  if (admin) {
    if (!password) {
      return NextResponse.json({ error: "Password is required for admin accounts" }, { status: 400 });
    }
    const hash = createHash("sha256").update(password).digest("hex");
    if (hash !== admin.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const payload: AuthPayload = {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      firstLoginComplete: true,
      exp: Date.now() + TOKEN_TTL_MS,
    };
    const token = await createToken(payload);
    const response = NextResponse.json({ success: true, role: "admin", firstLoginComplete: true });
    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_TTL_MS / 1000,
      path: "/",
    });
    return response;
  }

  // Patients and CHWs — email only, no password
  const users = readDB<User>("users");
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    return NextResponse.json({ error: "No account found for that email" }, { status: 401 });
  }

  const payload: AuthPayload = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    firstLoginComplete: user.firstLoginComplete,
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const token = await createToken(payload);
  const response = NextResponse.json({
    success: true,
    role: user.role,
    firstLoginComplete: user.firstLoginComplete,
  });
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_TTL_MS / 1000,
    path: "/",
  });
  return response;
}
