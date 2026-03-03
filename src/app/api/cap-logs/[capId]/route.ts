import { NextRequest, NextResponse } from "next/server";
import { readCapLog } from "@/lib/db";

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

  const raw = readCapLog(id);
  if (raw === null) {
    return NextResponse.json({ error: "No log found for this cap" }, { status: 404 });
  }

  const lines = raw.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  // First line is the cap ID — skip it
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
