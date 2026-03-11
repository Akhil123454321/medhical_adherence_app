import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { AdherenceRecord, User } from "@/lib/types";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || payload.id;

  // CHWs can query their patients; patients can only query themselves
  if (payload.role === "patient" && userId !== payload.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const records = readDB<AdherenceRecord>("adherence-records");
  const userRecords = records.filter((r) => r.userId === userId);
  return NextResponse.json(userRecords);
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { userId?: string; recordType?: string; takenAt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const targetUserId = body.userId || payload.id;
  const recordType = body.recordType || "self";
  const takenAt = body.takenAt || new Date().toISOString();

  // Validate recordType
  if (!["self", "chw_recorded", "chw_notified"].includes(recordType)) {
    return NextResponse.json({ error: "Invalid recordType" }, { status: 400 });
  }

  // Patients can only record for themselves
  if (payload.role === "patient" && targetUserId !== payload.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // CHWs can only record for their assigned patient
  if (payload.role === "chw") {
    const users = readDB<User>("users");
    const chw = users.find((u) => u.id === payload.id);
    if (!chw || chw.assignedPatientId !== targetUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const records = readDB<AdherenceRecord>("adherence-records");
  const newRecord: AdherenceRecord = {
    id: `ar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: takenAt.split("T")[0],
    userId: targetUserId,
    recordedBy: payload.id,
    recordType: recordType as AdherenceRecord["recordType"],
    selfReported: recordType === "self",
    capOpened: false,
    capTimestamp: null,
    reportTimestamp: takenAt,
  };

  records.push(newRecord);
  writeDB("adherence-records", records);

  return NextResponse.json({ success: true, record: newRecord }, { status: 201 });
}
