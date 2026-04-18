import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { Cohort } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { startDate?: string; endDate?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const cohorts = readDB<Cohort>("cohorts");
  const index = cohorts.findIndex((c) => c.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
  }

  if (body.startDate) cohorts[index].startDate = body.startDate;
  if (body.endDate) cohorts[index].endDate = body.endDate;
  writeDB("cohorts", cohorts);

  return NextResponse.json(cohorts[index]);
}
