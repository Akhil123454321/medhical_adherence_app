import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { User, VerificationToken } from "@/lib/types";

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email } = body;
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Always return success to avoid leaking whether email exists
  const users = readDB<User>("users");
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  // Only send for non-admin users who have a password set
  if (!user || user.role === "admin" || !user.passwordHash) {
    return NextResponse.json({ success: true });
  }

  // Generate 32-byte random hex token
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const tokenHex = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Replace any existing tokens for this user
  const tokens = readDB<VerificationToken>("verification-tokens");
  const filtered = tokens.filter((t) => t.userId !== user.id);

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  filtered.push({ id: `vt-${Date.now()}`, userId: user.id, token: tokenHex, expiresAt });
  writeDB("verification-tokens", filtered);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  await sendVerificationEmail(user.email, `${baseUrl}/auth/set-password?token=${tokenHex}`);

  return NextResponse.json({ success: true });
}
