import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { User, SurveyResponse } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const users = readDB<User>("users");
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  users[idx] = { ...users[idx], firstLoginComplete: false };
  writeDB("users", users);

  // Remove their survey responses
  const responses = readDB<SurveyResponse>("survey-responses");
  const filtered = responses.filter((r) => r.userId !== id);
  writeDB("survey-responses", filtered);

  return NextResponse.json({ success: true });
}
