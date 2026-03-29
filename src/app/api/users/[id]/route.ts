import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { User, UserRole } from "@/lib/types";

interface PatchBody {
  role?: UserRole;
  assignedChwId?: string | null;
  assignedPatientId?: string | null;
  dosingRegimen?: "1x" | "2x" | "3x" | null;
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

  const updated: User = { ...users[index] };

  if (body.role !== undefined) {
    updated.role = body.role;
  }
  if (body.assignedChwId !== undefined) {
    updated.assignedChwId = body.assignedChwId;
  }
  if (body.assignedPatientId !== undefined) {
    updated.assignedPatientId = body.assignedPatientId;
  }
  if (body.dosingRegimen !== undefined) {
    updated.dosingRegimen = body.dosingRegimen;
  }

  users[index] = updated;
  writeDB<User>("users", users);

  return NextResponse.json(updated);
}
