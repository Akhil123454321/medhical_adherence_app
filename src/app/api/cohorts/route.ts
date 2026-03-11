import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { Cohort, User, UserRole } from "@/lib/types";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cohorts = readDB<Cohort>("cohorts");
  return NextResponse.json(cohorts);
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Partial<Cohort> & { patientEmails?: string[]; chwEmails?: string[] };
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
  } = body;

  if (!name || !institution || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const allEmails = [...patientEmails, ...chwEmails];

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

  // Create user accounts with pre-assigned roles
  const users = readDB<User>("users");
  const createdUsers: Array<{ email: string; role: UserRole }> = [];

  function upsertEmail(email: string, role: UserRole) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      if (!existing.cohortId) existing.cohortId = newCohort.id;
      return;
    }

    const nameParts = normalizedEmail.split("@")[0].split(".");
    const firstName = nameParts[0]
      ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1)
      : "User";
    const lastName = nameParts[1]
      ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1)
      : "";

    users.push({
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      firstName,
      lastName,
      email: normalizedEmail,
      role,
      cohortId: newCohort.id,
      capId: null,
      dosingRegimen: null,
      assignedChwId: null,
      assignedPatientId: null,
      firstLoginComplete: false,
    });
    createdUsers.push({ email: normalizedEmail, role });
  }

  for (const email of patientEmails) upsertEmail(email, "patient");
  for (const email of chwEmails) upsertEmail(email, "chw");

  writeDB("users", users);

  return NextResponse.json(
    { success: true, cohort: newCohort, createdUsers },
    { status: 201 }
  );
}
