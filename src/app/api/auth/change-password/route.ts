import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { readDB, writeDB } from "@/lib/db";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { User } from "@/lib/types";

interface AdminRecord {
  id: string;
  email: string;
  passwordHash: string;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both current and new password are required" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  const currentHash = createHash("sha256").update(currentPassword).digest("hex");
  const newHash = createHash("sha256").update(newPassword).digest("hex");

  // Check admins first
  const admins = readDB<AdminRecord>("admins");
  const adminIdx = admins.findIndex((a) => a.email.toLowerCase() === payload.email.toLowerCase());
  if (adminIdx !== -1) {
    if (admins[adminIdx].passwordHash !== currentHash) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    admins[adminIdx].passwordHash = newHash;
    writeDB("admins", admins);
    return NextResponse.json({ success: true });
  }

  // Check regular users
  const users = readDB<User>("users");
  const userIdx = users.findIndex((u) => u.email.toLowerCase() === payload.email.toLowerCase());
  if (userIdx !== -1) {
    if (users[userIdx].passwordHash !== currentHash) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    users[userIdx].passwordHash = newHash;
    writeDB("users", users);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "User not found" }, { status: 404 });
}
