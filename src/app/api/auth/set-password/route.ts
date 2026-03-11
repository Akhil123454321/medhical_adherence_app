import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { readDB, writeDB } from "@/lib/db";
import { createToken, AUTH_COOKIE, TOKEN_TTL_MS, AuthPayload } from "@/lib/auth";
import { User, VerificationToken } from "@/lib/types";

export async function POST(request: NextRequest) {
  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { token, password } = body;
  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // Look up token
  const tokens = readDB<VerificationToken>("verification-tokens");
  const tokenRecord = tokens.find((t) => t.token === token);

  if (!tokenRecord) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
  }

  if (new Date(tokenRecord.expiresAt) < new Date()) {
    return NextResponse.json({ error: "This link has expired. Please request a new one." }, { status: 400 });
  }

  // Look up user
  const users = readDB<User>("users");
  const userIndex = users.findIndex((u) => u.id === tokenRecord.userId);
  if (userIndex === -1) {
    return NextResponse.json({ error: "User not found" }, { status: 400 });
  }

  const user = users[userIndex];

  // Hash and save password
  const passwordHash = createHash("sha256").update(password).digest("hex");
  users[userIndex] = { ...user, passwordHash };
  writeDB("users", users);

  // Delete the used token
  writeDB("verification-tokens", tokens.filter((t) => t.token !== token));

  // Issue auth cookie
  const payload: AuthPayload = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    firstLoginComplete: user.firstLoginComplete,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const authToken = await createToken(payload);

  const responseBody = {
    success: true,
    role: user.role,
    firstLoginComplete: user.firstLoginComplete,
  };
  const response = NextResponse.json(responseBody);
  response.cookies.set(AUTH_COOKIE, authToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_TTL_MS / 1000,
    path: "/",
  });
  return response;
}
