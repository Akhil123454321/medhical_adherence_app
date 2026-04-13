import { NextRequest, NextResponse } from "next/server";
import { writeCapLog } from "@/lib/db";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";

// Kyle's office machine POSTs CSV files here after collecting caps.
// Authenticate with:  x-api-key: <CAP_UPLOAD_API_KEY>
// Admin users can also upload via the admin UI (session cookie auth).
// Body: multipart/form-data, one or more fields named "file" (or any name).
//
// Supported formats:
// 1. Original format: first line = integer cap ID, then event,timestamp rows.
// 2. Chip format: first line = "ID: <HEX>", tab-separated OPEN/CLOSED rows.

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Convert chip timestamp to ISO string in Indiana time.
// Handles both "4/2/26 13:06" (M/D/YY HH:MM) and "2026/04/02 13:06:14" (YYYY/MM/DD HH:MM:SS).
function chipTimestampToISO(ts: string): string {
  const parts = ts.trim().split(" ");
  if (parts.length < 2) return "";
  const [datePart, timePart] = parts;
  const dateParts = datePart.split("/");
  if (dateParts.length < 3) return "";
  let year: number, month: number, day: number;
  const first = parseInt(dateParts[0], 10);
  if (first > 31) {
    // YYYY/MM/DD format
    year = first;
    month = parseInt(dateParts[1], 10);
    day = parseInt(dateParts[2], 10);
  } else {
    // M/D/YY format
    month = first;
    day = parseInt(dateParts[1], 10);
    const shortYear = parseInt(dateParts[2], 10);
    year = shortYear < 100 ? 2000 + shortYear : shortYear;
  }
  // Indiana observes DST (UTC-4) mid-March through early November
  const isDST = month >= 3 && month <= 11;
  const offsetStr = isDST ? "-04:00" : "-05:00";
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  // timePart may be HH:MM or HH:MM:SS — only append :00 if seconds missing
  const timeFull = timePart.split(":").length >= 3 ? timePart : `${timePart}:00`;
  return `${year}-${mm}-${dd}T${timeFull}${offsetStr}`;
}

export async function POST(request: NextRequest) {
  // Accept either API key (Kyle's machine) or admin session cookie (admin UI)
  const apiKey = process.env.CAP_UPLOAD_API_KEY;
  const providedApiKey = request.headers.get("x-api-key");

  let authorized = false;
  if (apiKey && providedApiKey && providedApiKey === apiKey) {
    authorized = true;
  } else {
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    const payload = token ? await verifyToken(token) : null;
    if (payload?.role === "admin") authorized = true;
  }

  if (!authorized) return unauthorized();

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const uploaded: { capId: number | string; eventsCount: number }[] = [];
  const errors: { name: string; error: string }[] = [];

  for (const [, value] of formData.entries()) {
    if (!(value instanceof Blob)) continue;

    const fileName = value instanceof File ? value.name : "unknown";
    const text = await value.text();
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      errors.push({ name: fileName, error: "Empty file" });
      continue;
    }

    // ── Chip format: first line starts with "ID:" ──────────────────────────
    if (lines[0].toUpperCase().startsWith("ID:")) {
      const hexId = lines[0].replace(/^ID:\s*/i, "").trim();
      if (!hexId) {
        errors.push({ name: fileName, error: "Could not extract hardware ID from first line" });
        continue;
      }

      // Skip header row and parse tab or comma-separated data rows
      const eventLines: string[] = [];
      for (const line of lines.slice(1)) {
        const sep = line.includes("\t") ? "\t" : line.includes(",") ? "," : null;
        if (!sep) continue;
        const cols = line.split(sep);
        if (cols.length < 2) continue;
        const status = cols[0].trim().toLowerCase();
        const ts = cols.slice(1).join(sep).trim();
        if (status !== "open" && status !== "closed") continue;
        const event = status === "open" ? "opened" : "closed";
        const iso = chipTimestampToISO(ts);
        if (!iso) continue;
        eventLines.push(`${event},${iso}`);
      }

      const normalized = [hexId, ...eventLines].join("\n");
      writeCapLog(hexId, normalized);
      uploaded.push({ capId: hexId, eventsCount: eventLines.length });

    // ── Original format: first line is integer cap ID ──────────────────────
    } else {
      const capId = parseInt(lines[0], 10);
      if (isNaN(capId) || capId <= 0) {
        errors.push({
          name: fileName,
          error: `First line must be a positive cap ID or "ID: <hex>", got: "${lines[0]}"`,
        });
        continue;
      }

      const eventsCount = lines.slice(1).filter((l) => l.includes(",")).length;
      writeCapLog(capId, text);
      uploaded.push({ capId, eventsCount });
    }
  }

  if (uploaded.length === 0 && errors.length > 0) {
    return NextResponse.json({ error: "No valid files uploaded", errors }, { status: 400 });
  }

  return NextResponse.json({ uploaded, ...(errors.length > 0 && { errors }) }, { status: 200 });
}

