import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { readDB, writeDB } from "@/lib/db";
import { AppNotification } from "@/lib/types";

// PATCH — mark single notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const all = readDB<AppNotification>("notifications");
  const notif = all.find((n) => n.id === id && n.userId === payload.id);
  if (!notif) return NextResponse.json({ error: "Not found" }, { status: 404 });

  notif.read = true;
  writeDB("notifications", all);
  return NextResponse.json({ success: true });
}

// DELETE — dismiss (hide) a notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const all = readDB<AppNotification>("notifications");
  const notif = all.find((n) => n.id === id && n.userId === payload.id);
  if (!notif) return NextResponse.json({ error: "Not found" }, { status: 404 });

  notif.dismissed = true;
  writeDB("notifications", all);
  return NextResponse.json({ success: true });
}
