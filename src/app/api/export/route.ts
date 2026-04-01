import { NextRequest, NextResponse } from "next/server";
import { readDB, readCapLog } from "@/lib/db";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { User, Cohort, AdherenceRecord, SurveyResponse } from "@/lib/types";

// All timestamps are converted to Indiana time for window matching.
const TIMEZONE = "America/Indiana/Indianapolis";

// The three daily time windows defined by Pat.
const WINDOWS = [
  { label: "6-8am",  start: 6,  end: 8  },
  { label: "12-2pm", start: 12, end: 14 },
  { label: "6-8pm",  start: 18, end: 20 },
];

// Returns the wall-clock hour (0-23) in TIMEZONE for a given ISO timestamp.
function localHour(iso: string): number {
  const h = new Intl.DateTimeFormat("en-US", {
    hour: "numeric", hour12: false, timeZone: TIMEZONE,
  }).format(new Date(iso));
  const n = parseInt(h, 10);
  return isNaN(n) ? -1 : (n === 24 ? 0 : n);
}

// Returns the calendar date string "YYYY-MM-DD" in TIMEZONE.
function localDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: TIMEZONE,
  }).format(new Date(iso));
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

// Produce the "assigned_role_detailed" value for a user.
function detailedRole(user: User, allUsers: User[]): string {
  if (user.role === "patient") {
    const dosing = user.dosingRegimen === "2x" ? "BID"
                 : user.dosingRegimen === "3x" ? "TID"
                 : (user.dosingRegimen ?? "?");
    return `${dosing} patient ${user.assignedChwId ? "WITH" : "WITHOUT"} CHW`;
  }
  if (user.role === "chw") {
    const patient = allUsers.find(u => u.id === user.assignedPatientId);
    const dosing = patient?.dosingRegimen === "2x" ? "BID"
                 : patient?.dosingRegimen === "3x" ? "TID"
                 : "?";
    return `CHW for ${dosing} patient`;
  }
  return user.role;
}

// Escape a single CSV cell value.
function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

// Serialize a scalar survey answer value to a CSV-safe string.
function surveyVal(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.join(" | ");
  return String(v);
}

// Detect which answer keys are multi-select (any user has an array value for that key).
function detectMultiSelectKeys(
  surveys: Record<string, unknown>[],
  keys: string[]
): Set<string> {
  const multi = new Set<string>();
  for (const k of keys) {
    for (const answers of surveys) {
      if (Array.isArray(answers[k])) { multi.add(k); break; }
    }
  }
  return multi;
}

// Collect all unique option values for a multi-select key across all users.
function collectOptions(
  surveys: Record<string, unknown>[],
  key: string
): string[] {
  const opts = new Set<string>();
  for (const answers of surveys) {
    const v = answers[key];
    if (Array.isArray(v)) v.forEach(o => opts.add(String(o)));
    else if (v !== null && v !== undefined) opts.add(String(v));
  }
  return Array.from(opts).sort();
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cohortId = new URL(request.url).searchParams.get("cohortId");
  if (!cohortId) return NextResponse.json({ error: "cohortId required" }, { status: 400 });

  // ── Load all data ──────────────────────────────────────────────────────────
  const cohort = readDB<Cohort>("cohorts").find(c => c.id === cohortId);
  if (!cohort) return NextResponse.json({ error: "Cohort not found" }, { status: 404 });

  const allUsers    = readDB<User>("users");
  const allRecords  = readDB<AdherenceRecord>("adherence-records");
  const allSurveys  = readDB<SurveyResponse>("survey-responses");

  const cohortUsers  = allUsers.filter(u => u.cohortId === cohortId && u.role !== "admin");
  const cohortIds    = new Set(cohortUsers.map(u => u.id));

  // Pre-survey answers keyed by userId
  const preSurvey: Record<string, Record<string, unknown>> = {};
  for (const sr of allSurveys) {
    if (cohortIds.has(sr.userId) && sr.surveyType === "pre") {
      preSurvey[sr.userId] = { ...(preSurvey[sr.userId] ?? {}), ...sr.answers };
    }
  }

  // Post-survey answers keyed by userId
  const postSurvey: Record<string, Record<string, unknown>> = {};
  for (const sr of allSurveys) {
    if (cohortIds.has(sr.userId) && sr.surveyType === "post") {
      postSurvey[sr.userId] = { ...(postSurvey[sr.userId] ?? {}), ...sr.answers };
    }
  }

  // Collect all pre-survey answer keys across all users (demographic + attitude fields)
  const preKeys = Array.from(
    new Set(Object.values(preSurvey).flatMap(a => Object.keys(a)))
  ).sort();

  // Collect all post-survey answer keys across all users (dynamic questions)
  const postKeys = Array.from(
    new Set(Object.values(postSurvey).flatMap(a => Object.keys(a)))
  ).sort();

  // Detect multi-select keys and collect their options
  const preSurveyList  = Object.values(preSurvey)  as Record<string, unknown>[];
  const postSurveyList = Object.values(postSurvey) as Record<string, unknown>[];
  const preMulti  = detectMultiSelectKeys(preSurveyList,  preKeys);
  const postMulti = detectMultiSelectKeys(postSurveyList, postKeys);

  // Pre-options: map of key → sorted unique option values
  const preOptions:  Record<string, string[]> = {};
  for (const k of preKeys)  if (preMulti.has(k))  preOptions[k]  = collectOptions(preSurveyList,  k);
  const postOptions: Record<string, string[]> = {};
  for (const k of postKeys) if (postMulti.has(k)) postOptions[k] = collectOptions(postSurveyList, k);

  // ── Date range ─────────────────────────────────────────────────────────────
  const numDays = Math.max(1,
    Math.round(
      (new Date(cohort.endDate + "T12:00:00Z").getTime() -
       new Date(cohort.startDate + "T12:00:00Z").getTime()
      ) / 86_400_000
    ) + 1
  );
  const days = Array.from({ length: numDays }, (_, i) => ({
    n: i + 1,
    date: addDays(cohort.startDate, i),
  }));

  // ── Header row ─────────────────────────────────────────────────────────────
  const headers: string[] = ["student_id", "assigned_role_detailed"];

  // Pre-survey columns — multi-select keys expand into one column per option
  for (const k of preKeys) {
    if (preMulti.has(k)) {
      for (const opt of preOptions[k]) headers.push(`Pre_${k}__${opt}`);
    } else {
      headers.push(`Pre_${k}`);
    }
  }
  // Post-survey columns — same expansion
  for (const k of postKeys) {
    if (postMulti.has(k)) {
      for (const opt of postOptions[k]) headers.push(`Post_${k}__${opt}`);
    } else {
      headers.push(`Post_${k}`);
    }
  }

  // App timestamp check-in columns
  for (const { n } of days) {
    for (const w of WINDOWS) {
      headers.push(`Day${n}_${w.label}`);
    }
  }
  headers.push("pct_adherence_timestamps");

  // Cap columns
  for (const { n } of days) {
    for (const w of WINDOWS) {
      headers.push(`Cap_Day${n}_${w.label}`);
    }
  }
  headers.push("pct_adherence_caps");

  // ── Data rows ──────────────────────────────────────────────────────────────
  const rows: string[][] = [headers.map(cell)];

  for (const user of cohortUsers) {
    // Determine effective dosing (CHWs inherit from their patient)
    let dosing = user.dosingRegimen;
    if (user.role === "chw") {
      const pt = allUsers.find(u => u.id === user.assignedPatientId);
      dosing = pt?.dosingRegimen ?? null;
    }
    // Which window indices apply: BID → [0,2]  TID → [0,1,2]
    const activeWindows: number[] = dosing === "3x" ? [0, 1, 2] : [0, 2];

    // Survey values — multi-select fields expand to 1/0 per option
    const preVals: (string | number)[] = [];
    for (const k of preKeys) {
      const v = (preSurvey[user.id] ?? {})[k];
      if (preMulti.has(k)) {
        const selected = Array.isArray(v) ? v.map(String) : (v != null ? [String(v)] : []);
        for (const opt of preOptions[k]) preVals.push(selected.includes(opt) ? 1 : 0);
      } else {
        preVals.push(surveyVal(v));
      }
    }
    const postVals: (string | number)[] = [];
    for (const k of postKeys) {
      const v = (postSurvey[user.id] ?? {})[k];
      if (postMulti.has(k)) {
        const selected = Array.isArray(v) ? v.map(String) : (v != null ? [String(v)] : []);
        for (const opt of postOptions[k]) postVals.push(selected.includes(opt) ? 1 : 0);
      } else {
        postVals.push(surveyVal(v));
      }
    }

    // Adherence records for this user
    const userRecords = allRecords.filter(r => {
      if (user.role === "patient") {
        return r.userId === user.id &&
          (r.recordType === "self" || r.recordType === "chw_recorded");
      }
      // CHW: records they personally logged
      return r.recordedBy === user.id &&
        (r.recordType === "chw_recorded" || r.recordType === "chw_notified");
    });

    // Cap events (patients only)
    let capEvents: { date: string; hour: number }[] = [];
    if (user.role === "patient" && user.capId) {
      const raw = readCapLog(user.capId);
      if (raw) {
        for (const line of raw.trim().split("\n").slice(1)) {
          const comma = line.indexOf(",");
          if (comma === -1) continue;
          const event = line.slice(0, comma).trim();
          const ts = line.slice(comma + 1).trim();
          if (event === "opened" && ts) {
            capEvents.push({ date: localDate(ts), hour: localHour(ts) });
          }
        }
      }
    }

    // Build timestamp columns
    const tsCols: (number | "")[] = [];
    let tsHit = 0, tsTotal = 0;

    for (const { date } of days) {
      for (let wi = 0; wi < WINDOWS.length; wi++) {
        if (!activeWindows.includes(wi)) { tsCols.push(""); continue; }
        const w = WINDOWS[wi];
        const hit = userRecords.some(r => {
          if (!r.reportTimestamp) return false;
          return localDate(r.reportTimestamp) === date &&
            localHour(r.reportTimestamp) >= w.start &&
            localHour(r.reportTimestamp) < w.end;
        });
        tsCols.push(hit ? 1 : 0);
        tsTotal++;
        if (hit) tsHit++;
      }
    }
    const pctTs = tsTotal > 0 ? Math.round((tsHit / tsTotal) * 100) : "";

    // Build cap columns
    const capCols: (number | "")[] = [];
    let capHit = 0, capTotal = 0;

    for (const { date } of days) {
      for (let wi = 0; wi < WINDOWS.length; wi++) {
        if (user.role !== "patient" || !activeWindows.includes(wi)) {
          capCols.push("");
          continue;
        }
        const w = WINDOWS[wi];
        const hit = capEvents.some(e =>
          e.date === date && e.hour >= w.start && e.hour < w.end
        );
        capCols.push(hit ? 1 : 0);
        capTotal++;
        if (hit) capHit++;
      }
    }
    const pctCap = user.role === "patient" && capTotal > 0
      ? Math.round((capHit / capTotal) * 100)
      : "";

    rows.push([
      user.id,
      detailedRole(user, allUsers),
      ...preVals,
      ...postVals,
      ...tsCols,
      pctTs,
      ...capCols,
      pctCap,
    ].map(cell));
  }

  const csv = rows.map(r => r.join(",")).join("\r\n");
  const filename = `${cohort.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_export.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
