import { NextRequest, NextResponse } from "next/server";
import { readDB } from "@/lib/db";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { User, Cohort } from "@/lib/types";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = readDB<User>("users");
  const user = users.find((u) => u.id === payload.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const cohorts = readDB<Cohort>("cohorts");
  const cohort = user.cohortId ? cohorts.find((c) => c.id === user.cohortId) : null;

  // If CHW, resolve assigned patient's dosing regimen
  let assignedPatient: {
    id: string;
    firstName: string;
    lastName: string;
    dosingRegimen: string | null;
  } | null = null;

  if (user.role === "chw" && user.assignedPatientId) {
    const patient = users.find((u) => u.id === user.assignedPatientId);
    if (patient) {
      assignedPatient = {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dosingRegimen: patient.dosingRegimen,
      };
    }
  }

  return NextResponse.json({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    cohortId: user.cohortId,
    dosingRegimen: user.dosingRegimen,
    assignedChwId: user.assignedChwId,
    assignedPatientId: user.assignedPatientId,
    firstLoginComplete: user.firstLoginComplete,
    cohort: cohort
      ? {
          id: cohort.id,
          name: cohort.name,
          institution: cohort.institution,
          endDate: cohort.endDate,
        }
      : null,
    assignedPatient,
  });
}
