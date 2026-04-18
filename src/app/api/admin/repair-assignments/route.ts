import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { User, Cap } from "@/lib/types";

/**
 * POST /api/admin/repair-assignments
 *
 * One-shot repair that syncs all bidirectional relationships:
 *   1. For every CHW with assignedPatientId set → ensure patient.assignedChwId = chwId
 *   2. For every user with capId set → ensure cap.assignedTo = userId, cap.status = "assigned"
 *
 * Safe to call multiple times (idempotent).
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = readDB<User>("users");
  const caps = readDB<Cap>("caps");

  let chwPatientFixed = 0;
  let capFixed = 0;

  // ── 1. CHW ↔ patient sync ──────────────────────────────────────────────────
  for (const chw of users) {
    if (chw.role !== "chw" || !chw.assignedPatientId) continue;
    const patient = users.find((u) => u.id === chw.assignedPatientId);
    if (!patient) continue;
    if (patient.assignedChwId !== chw.id) {
      patient.assignedChwId = chw.id;
      chwPatientFixed++;
    }
  }

  // ── 2. User ↔ cap sync ─────────────────────────────────────────────────────
  // First clear all assignedTo values so stale entries don't linger
  for (const cap of caps) {
    cap.assignedTo = null;
    cap.status = "available";
    cap.cohortId = null;
  }
  // Then set from the authoritative source (users.capId)
  for (const user of users) {
    if (user.capId === null) continue;
    const cap = caps.find((c) => c.id === user.capId);
    if (!cap) continue;
    cap.assignedTo = user.id;
    cap.status = "assigned";
    cap.cohortId = user.cohortId;
    capFixed++;
  }

  writeDB("users", users);
  writeDB("caps", caps);

  return NextResponse.json({
    ok: true,
    chwPatientLinksFixed: chwPatientFixed,
    capAssignmentsFixed: capFixed,
  });
}
