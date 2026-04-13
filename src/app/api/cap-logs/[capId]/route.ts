import { NextRequest, NextResponse } from "next/server";
import { readCapLog, readDB } from "@/lib/db";
import { Cap } from "@/lib/types";

export interface CapLogEvent {
  event: "opened" | "closed";
  timestamp: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ capId: string }> }
) {
  const { capId } = await params;
  const id = parseInt(capId, 10);

  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid cap ID" }, { status: 400 });
  }

  const cap = readDB<Cap>("caps").find(c => c.id === id);
  // If the cap record exists, always use its hardwareId (never fall back to a
  // legacy numeric file), so we never accidentally show another cap's data.
  // Only fall back to the numeric filename when the cap record doesn't exist.
  let raw: string | null;
  if (cap) {
    raw = cap.hardwareId ? readCapLog(cap.hardwareId) : null;
  } else {
    raw = readCapLog(id);
  }

  if (raw === null) {
    const reason = cap && !cap.hardwareId
      ? "No hardware ID linked to this cap yet — map a MAC address on the MAC Address Mapping page first."
      : "No log found for this cap";
    return NextResponse.json({ error: reason }, { status: 404 });
  }

  const lines = raw.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  const events: CapLogEvent[] = [];
  for (const line of lines.slice(1)) {
    const comma = line.indexOf(",");
    if (comma === -1) continue;
    const event = line.slice(0, comma).trim() as "opened" | "closed";
    const timestamp = line.slice(comma + 1).trim();
    if (event === "opened" || event === "closed") {
      events.push({ event, timestamp });
    }
  }

  return NextResponse.json({ capId: id, events });
}