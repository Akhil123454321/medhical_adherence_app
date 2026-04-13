import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { Cap } from "@/lib/types";

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
  const capId = parseInt(id, 10);
  if (isNaN(capId)) {
    return NextResponse.json({ error: "Invalid cap ID" }, { status: 400 });
  }

  let body: { hardwareId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const caps = readDB<Cap>("caps");
  const cap = caps.find(c => c.id === capId);
  if (!cap) {
    return NextResponse.json({ error: "Cap not found" }, { status: 404 });
  }

  cap.hardwareId = body.hardwareId || null;
  writeDB("caps", caps);

  return NextResponse.json(cap);
}
