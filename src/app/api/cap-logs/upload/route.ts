import { NextRequest, NextResponse } from "next/server";
import { writeCapLog } from "@/lib/db";

// Kyle's office machine POSTs CSV files here after collecting caps.
// Authenticate with:  x-api-key: <CAP_UPLOAD_API_KEY>
// Body: multipart/form-data, one or more fields named "file" (or any name).
// Each CSV must have the cap ID on the first line, then event,timestamp rows.

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.CAP_UPLOAD_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server not configured for cap uploads (missing CAP_UPLOAD_API_KEY)" },
      { status: 500 }
    );
  }

  const provided = request.headers.get("x-api-key");
  if (!provided || provided !== apiKey) {
    return unauthorized();
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const uploaded: { capId: number; eventsCount: number }[] = [];
  const errors: { name: string; error: string }[] = [];

  for (const [, value] of formData.entries()) {
    if (!(value instanceof Blob)) continue;

    const text = await value.text();
    const lines = text
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      errors.push({ name: value instanceof File ? value.name : "unknown", error: "Empty file" });
      continue;
    }

    const capId = parseInt(lines[0], 10);
    if (isNaN(capId) || capId <= 0) {
      errors.push({
        name: value instanceof File ? value.name : "unknown",
        error: `First line must be a positive cap ID, got: "${lines[0]}"`,
      });
      continue;
    }

    // Count valid event rows (skip header line)
    const eventsCount = lines.slice(1).filter((l) => l.includes(",")).length;

    writeCapLog(capId, text);
    uploaded.push({ capId, eventsCount });
  }

  if (uploaded.length === 0 && errors.length > 0) {
    return NextResponse.json({ error: "No valid files uploaded", errors }, { status: 400 });
  }

  return NextResponse.json({ uploaded, ...(errors.length > 0 && { errors }) }, { status: 200 });
}
