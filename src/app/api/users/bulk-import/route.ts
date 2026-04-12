import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { User, UserRole } from "@/lib/types";

const DEFAULT_PASSWORD_HASH = crypto.createHash("sha256").update("MedAdhere2026!").digest("hex");

// POST /api/users/bulk-import
// Admin only. Body: JSON array of { email, role, firstName?, lastName?, cohortId? }
// Returns { created, skipped, errors }

interface ImportRow {
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  cohortId?: string;
}

function deriveName(email: string): { firstName: string; lastName: string } {
  const localPart = email.split("@")[0];
  const parts = localPart.split(".");
  const firstName = parts[0]
    ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
    : "User";
  const lastName = parts[1]
    ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1)
    : "";
  return { firstName, lastName };
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rows: ImportRow[];
  try {
    rows = await request.json();
    if (!Array.isArray(rows)) throw new Error("Expected array");
  } catch {
    return NextResponse.json({ error: "Invalid body — expected JSON array" }, { status: 400 });
  }

  const users = readDB<User>("users");
  const created: string[] = [];
  const skipped: string[] = [];
  const errors: { email: string; reason: string }[] = [];

  for (const row of rows) {
    const email = (row.email ?? "").trim().toLowerCase();
    if (!email) {
      errors.push({ email: String(row.email), reason: "Missing email" });
      continue;
    }

    const role = (row.role ?? "").trim().toLowerCase() as UserRole;
    if (role !== "patient" && role !== "chw") {
      errors.push({ email, reason: `Invalid role "${role}" — must be patient or chw` });
      continue;
    }

    if (users.find((u) => u.email.toLowerCase() === email)) {
      skipped.push(email);
      continue;
    }

    const derived = deriveName(email);
    const firstName = row.firstName?.trim() || derived.firstName;
    const lastName = row.lastName?.trim() || derived.lastName;

    users.push({
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      firstName,
      lastName,
      email,
      passwordHash: DEFAULT_PASSWORD_HASH,
      role,
      cohortId: row.cohortId ?? null,
      capId: null,
      dosingRegimen: null,
      assignedChwId: null,
      assignedPatientId: null,
      firstLoginComplete: false,
    });
    created.push(email);
  }

  writeDB("users", users);

  return NextResponse.json({ created, skipped, errors }, { status: 201 });
}
