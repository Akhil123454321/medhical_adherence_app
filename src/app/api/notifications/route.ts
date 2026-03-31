import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { readDB, writeDB } from "@/lib/db";
import { generateNotifications } from "@/lib/notifications";
import { AppNotification } from "@/lib/types";

// GET — fetch (and auto-generate) notifications for current user
export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = generateNotifications(payload.id, payload.role);
  return NextResponse.json(notifications);
}

// PATCH — mark all as read for current user
export async function PATCH(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = readDB<AppNotification>("notifications");
  for (const n of all) {
    if (n.userId === payload.id) n.read = true;
  }
  writeDB("notifications", all);
  return NextResponse.json({ success: true });
}
