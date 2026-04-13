// Thin wrapper around reading from the database/ JSON files.
// Only usable in Node.js runtime (API routes, server components).
// Not safe for Edge runtime — use auth.ts utilities there instead.

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

type Collection =
  | "admins"
  | "cohorts"
  | "caps"
  | "users"
  | "questions"
  | "adherence-records"
  | "activity-log"
  | "survey-responses"
  | "verification-tokens"
  | "notifications";

export function readDB<T = unknown>(collection: Collection): T[] {
  const filePath = path.join(
    process.cwd(),
    "database",
    `${collection}.json`
  );
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T[];
}

export function writeDB<T = unknown>(collection: Collection, data: T[]): void {
  const filePath = path.join(
    process.cwd(),
    "database",
    `${collection}.json`
  );
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function writeCapLog(capId: number | string, content: string): void {
  const dir = path.join(process.cwd(), "database", "cap-logs");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `cap-${capId}.csv`), content, "utf-8");
}

export function readCapLog(capId: number | string): string | null {
  const filePath = path.join(
    process.cwd(),
    "database",
    "cap-logs",
    `cap-${capId}.csv`
  );
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Cross-reference a cap's event log against the assigned user's adherence
 * records.
 *
 * For each physical "opened" event:
 *   - If a self-reported adherence record exists within ±4 hours → mark it
 *     capOpened=true (corroboration).
 *   - If no self-report exists within ±4 hours AND no cap-generated record
 *     already covers this event (within 30 min) → create a new adherence
 *     record so the physical cap data is always visible in the dashboard.
 *
 * Additive only — never sets capOpened to false on existing records.
 * Returns the number of records updated or created.
 */
export function reconcileCapLog(hardwareId: string): number {
  // Find the cap with this hardware ID
  interface CapRow { id: number; hardwareId: string | null; }
  const caps = readDB<CapRow>("caps");
  const cap = caps.find(c => c.hardwareId === hardwareId);
  if (!cap) return 0;

  // Find the user assigned to this cap
  interface UserRow { id: string; capId: number | null; }
  const users = readDB<UserRow>("users");
  const user = users.find(u => u.capId === cap.id);
  if (!user) return 0;

  // Read the cap log and extract "opened" event timestamps
  const raw = readCapLog(hardwareId);
  if (!raw) return 0;

  const openTimes: number[] = [];
  for (const line of raw.split("\n").map(l => l.trim()).filter(Boolean)) {
    const comma = line.indexOf(",");
    if (comma === -1) continue;
    const event = line.slice(0, comma).trim();
    if (event !== "opened") continue;
    const ts = new Date(line.slice(comma + 1).trim()).getTime();
    if (!isNaN(ts)) openTimes.push(ts);
  }
  if (openTimes.length === 0) return 0;

  const FOUR_HOURS = 4 * 60 * 60 * 1000;
  const THIRTY_MIN  = 30 * 60 * 1000;

  interface AdherenceRow {
    id: string;
    date: string;
    userId: string;
    recordedBy: string;
    recordType: string;
    selfReported: boolean;
    capOpened: boolean;
    capTimestamp: string | null;
    reportTimestamp: string | null;
  }
  const records = readDB<AdherenceRow>("adherence-records");
  let changed = 0;

  for (const openTs of openTimes) {
    // 1. Check whether an existing record for this user already covers this event
    //    (either already reconciled, or within ±4 hours of a self-report)
    let matched = false;

    for (const record of records) {
      if (record.userId !== user.id) continue;

      // Already cap-confirmed — is it this event?
      if (record.capOpened && record.capTimestamp) {
        const existingCapTs = new Date(record.capTimestamp).getTime();
        if (Math.abs(existingCapTs - openTs) <= THIRTY_MIN) {
          matched = true;
          break;
        }
      }

      // Unconfirmed record within ±4 hours — corroborate it
      if (!record.capOpened) {
        const reportTs = record.reportTimestamp
          ? new Date(record.reportTimestamp).getTime()
          : NaN;
        if (!isNaN(reportTs) && Math.abs(openTs - reportTs) <= FOUR_HOURS) {
          record.capOpened = true;
          record.capTimestamp = new Date(openTs).toISOString();
          matched = true;
          changed++;
          break;
        }
      }
    }

    if (matched) continue;

    // 2. No existing record covers this cap open — create one so the physical
    //    data is always visible in the dashboard (selfReported=false marks it
    //    as cap-generated rather than a patient tap).
    const isoTs = new Date(openTs).toISOString();
    records.push({
      id: `ar-cap-${openTs}-${Math.random().toString(36).slice(2, 6)}`,
      date: isoTs.split("T")[0],
      userId: user.id,
      recordedBy: "cap",
      recordType: "self",
      selfReported: false,
      capOpened: true,
      capTimestamp: isoTs,
      reportTimestamp: null,
    });
    changed++;
  }

  if (changed > 0) {
    writeDB("adherence-records", records);
  }
  return changed;
}
