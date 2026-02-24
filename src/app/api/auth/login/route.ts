import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { readDB } from "@/lib/db";
import { createToken, AUTH_COOKIE, TOKEN_TTL_MS, AuthPayload } from "@/lib/auth";

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
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const admins = readDB<AdminRecord>("admins");
  const admin = admins.find(
    (a) => a.email.toLowerCase() === email.toLowerCase()
  );

  if (!admin) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
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
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const token = await createToken(payload);

  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_TTL_MS / 1000, // seconds
    path: "/",
  });

  return response;
}
