import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import * as XLSX from "xlsx";

export interface ParsedStudent {
  name: string;
  email: string;
  role: "patient" | "chw";
  vialNumber: string | null; // null means app-only
  dosing: "2x" | "3x" | null; // BID=2x, TID=3x
  chwEmail: string | null;
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
  });

  const students: ParsedStudent[] = [];

  for (const row of rows) {
    // Normalize keys to uppercase for flexible header matching
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      normalized[k.trim().toUpperCase()] = String(v).trim();
    }

    const email = normalized["EMAIL"]?.toLowerCase();
    if (!email || !email.includes("@")) continue;

    const roleRaw = normalized["ROLE"]?.toLowerCase() ?? "";
    const role: "patient" | "chw" =
      roleRaw === "chw" ? "chw" : "patient";

    const name = normalized["NAME"] ?? "";

    // Vial number: skip "app only" variants and "?" prefixed uncertain ones
    const vialRaw = normalized["VIAL NUMBER"] ?? normalized["VIAL"] ?? "";
    let vialNumber: string | null = null;
    if (
      vialRaw &&
      vialRaw.toLowerCase() !== "app only" &&
      vialRaw.toLowerCase() !== ""
    ) {
      // Strip leading '?' for uncertain entries
      const clean = vialRaw.replace(/^\?/, "").trim();
      if (/^\d+$/.test(clean)) vialNumber = clean;
    }

    // Dosing: BID → 2x, TID → 3x
    const dosingRaw = normalized["DOSING"]?.toUpperCase() ?? "";
    let dosing: "2x" | "3x" | null = null;
    if (dosingRaw === "BID") dosing = "2x";
    else if (dosingRaw === "TID") dosing = "3x";

    // CHW email (only meaningful for patients)
    const chwEmail =
      normalized["CHW EMAIL"]?.toLowerCase() ||
      normalized["CHW  EMAIL"]?.toLowerCase() ||
      null;

    students.push({
      name,
      email,
      role,
      vialNumber,
      dosing: role === "patient" ? dosing : null,
      chwEmail: role === "patient" && chwEmail ? chwEmail : null,
    });
  }

  // Compute vial number range from all numeric vial numbers
  const vials = students
    .map((s) => (s.vialNumber ? parseInt(s.vialNumber) : null))
    .filter((v): v is number => v !== null);
  const capRangeStart = vials.length > 0 ? Math.min(...vials) : null;
  const capRangeEnd = vials.length > 0 ? Math.max(...vials) : null;

  return NextResponse.json({ students, capRangeStart, capRangeEnd });
}
