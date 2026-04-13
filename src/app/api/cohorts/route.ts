import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { Cohort, User, UserRole, DosingRegimen } from "@/lib/types";

const DEFAULT_PASSWORD_HASH = crypto.createHash("sha256").update("MedAdhere2026!").digest("hex");

interface ImportedStudent {
  email: string;
  role: "patient" | "chw";
  vialNumber?: string | null;
  dosing?: "2x" | "3x" | null;
  chwEmail?: string | null;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const cohorts = readDB<Cohort>("cohorts").map(c => ({
    ...c,
    status: today < c.startDate ? "upcoming" : today <= c.endDate ? "active" : "completed",
  }));
  return NextResponse.json(cohorts);
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Partial<Cohort> & {
    patientEmails?: string[];
    chwEmails?: string[];
    students?: ImportedStudent[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const {
    name,
    institution,
    startDate,
    endDate,
    description,
    capRangeStart,
    capRangeEnd,
    patientEmails = [],
    chwEmails = [],
    students = [],
  } = body;

  if (!name || !institution || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Build canonical email list from either import path
  const allEmails =
    students.length > 0
      ? students.map((s) => s.email)
      : [...patientEmails, ...chwEmails];

  const cohorts = readDB<Cohort>("cohorts");
  const newCohort: Cohort = {
    id: `cohort-${Date.now()}`,
    name,
    institution,
    startDate,
    endDate,
    description: description || "",
    status: "upcoming",
    capRangeStart: capRangeStart || 0,
    capRangeEnd: capRangeEnd || 0,
    participantCount: allEmails.length,
    questionIds: [],
    emails: allEmails,
  };
  cohorts.push(newCohort);
  writeDB("cohorts", cohorts);

  const usersDb = readDB<User>("users");
  const createdUsers: Array<{ email: string; role: UserRole; dosing: string | null }> = [];

  // Build a lookup: chwEmail → userId (populated after first pass)
  const emailToId: Record<string, string> = {};

  function makeUser(
    email: string,
    role: UserRole,
    dosing: DosingRegimen | null,
    capId: number | null,
  ): User | null {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return null;

    const existing = usersDb.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      if (!existing.cohortId) existing.cohortId = newCohort.id;
      if (dosing && !existing.dosingRegimen) existing.dosingRegimen = dosing;
      if (capId && !existing.capId) existing.capId = capId;
      emailToId[normalizedEmail] = existing.id;
      return null; // already existed
    }

    // Derive first/last name from full name or email username
    const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nameParts = normalizedEmail.split("@")[0].split(".");
    const firstName = nameParts[0]
      ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1)
      : "User";
    const lastName = nameParts[1]
      ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1)
      : "";

    const newUser: User = {
      id,
      firstName,
      lastName,
      email: normalizedEmail,
      passwordHash: DEFAULT_PASSWORD_HASH,
      role,
      cohortId: newCohort.id,
      capId,
      dosingRegimen: dosing,
      assignedChwId: null,
      assignedPatientId: null,
      firstLoginComplete: false,
    };
    usersDb.push(newUser);
    emailToId[normalizedEmail] = id;
    createdUsers.push({ email: normalizedEmail, role, dosing });
    return newUser;
  }

  if (students.length > 0) {
    // Rich import path — create all users first
    for (const s of students) {
      const capId = s.vialNumber ? parseInt(s.vialNumber) : null;
      const dosing: DosingRegimen | null =
        s.dosing === "2x" ? "2x" : s.dosing === "3x" ? "3x" : null;
      makeUser(s.email, s.role, dosing, isNaN(capId as number) ? null : capId);
    }

    // Second pass: wire up CHW ↔ patient assignments
    for (const s of students) {
      if (s.role !== "patient" || !s.chwEmail) continue;
      const patientId = emailToId[s.email.toLowerCase()];
      const chwId = emailToId[s.chwEmail.toLowerCase()];
      if (!patientId || !chwId) continue;

      const patient = usersDb.find((u) => u.id === patientId);
      const chw = usersDb.find((u) => u.id === chwId);
      if (patient) patient.assignedChwId = chwId;
      if (chw) chw.assignedPatientId = patientId;
    }
  } else {
    // Legacy path: plain email lists
    for (const email of patientEmails) makeUser(email, "patient", null, null);
    for (const email of chwEmails) makeUser(email, "chw", null, null);
  }

  writeDB("users", usersDb);

  return NextResponse.json(
    { success: true, cohort: newCohort, createdUsers },
    { status: 201 }
  );
}

