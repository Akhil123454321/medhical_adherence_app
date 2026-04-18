import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { User, UserRole, Cap } from "@/lib/types";

interface PatchBody {
  email?: string;
  role?: UserRole;
  assignedChwId?: string | null;
  assignedPatientId?: string | null;
  dosingRegimen?: "1x" | "2x" | "3x" | null;
  capId?: number | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const users = readDB<User>("users");
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const original = users[index];
  const updated: User = { ...original };

  if (body.email !== undefined) {
    const newEmail = body.email.trim().toLowerCase();
    if (!newEmail) {
      return NextResponse.json({ error: "Email cannot be empty" }, { status: 400 });
    }
    const duplicate = users.find(
      (u) => u.email.toLowerCase() === newEmail && u.id !== id
    );
    if (duplicate) {
      return NextResponse.json({ error: "That email is already in use" }, { status: 400 });
    }
    updated.email = newEmail;
  }

  if (body.role !== undefined) updated.role = body.role;
  if (body.dosingRegimen !== undefined) updated.dosingRegimen = body.dosingRegimen;
  if (body.assignedChwId !== undefined) updated.assignedChwId = body.assignedChwId;
  if (body.assignedPatientId !== undefined) updated.assignedPatientId = body.assignedPatientId;
  if (body.capId !== undefined) updated.capId = body.capId;

  // ── Bidirectional sync: CHW → patient ──────────────────────────────────────
  // When a CHW's assignedPatientId changes, keep the patient's assignedChwId in sync.
  if (body.assignedPatientId !== undefined) {
    const oldPatientId = original.assignedPatientId;
    const newPatientId = updated.assignedPatientId;
    if (oldPatientId && oldPatientId !== newPatientId) {
      const oldPatient = users.find((u) => u.id === oldPatientId);
      if (oldPatient && oldPatient.assignedChwId === id) oldPatient.assignedChwId = null;
    }
    if (newPatientId) {
      const newPatient = users.find((u) => u.id === newPatientId);
      if (newPatient) newPatient.assignedChwId = id;
    }
  }

  // ── Bidirectional sync: patient → CHW ──────────────────────────────────────
  // When a patient's assignedChwId changes, keep the CHW's assignedPatientId in sync.
  if (body.assignedChwId !== undefined) {
    const oldChwId = original.assignedChwId;
    const newChwId = updated.assignedChwId;
    if (oldChwId && oldChwId !== newChwId) {
      const oldChw = users.find((u) => u.id === oldChwId);
      if (oldChw && oldChw.assignedPatientId === id) oldChw.assignedPatientId = null;
    }
    if (newChwId) {
      const newChw = users.find((u) => u.id === newChwId);
      if (newChw) newChw.assignedPatientId = id;
    }
  }

  users[index] = updated;
  writeDB<User>("users", users);

  // ── Cap assignment sync ─────────────────────────────────────────────────────
  // When capId changes, update the caps.json assignedTo field so the mapping
  // page stays accurate.
  if (body.capId !== undefined && body.capId !== original.capId) {
    const caps = readDB<Cap>("caps");
    if (original.capId !== null) {
      const oldCap = caps.find((c) => c.id === original.capId);
      if (oldCap && oldCap.assignedTo === id) {
        oldCap.assignedTo = null;
        oldCap.status = "available";
        oldCap.cohortId = null;
      }
    }
    if (updated.capId !== null) {
      const newCap = caps.find((c) => c.id === updated.capId);
      if (newCap) {
        newCap.assignedTo = id;
        newCap.status = "assigned";
        newCap.cohortId = updated.cohortId;
      }
    }
    writeDB("caps", caps);
  }

  return NextResponse.json(updated);
}
