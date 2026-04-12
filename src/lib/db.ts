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
 * records and set capOpened=true where a physical "opened" event falls
 * within ±4 hours of the record's reportTimestamp.
 *
 * This is additive — it only sets capOpened to true, never to false.
 * Returns the number of records updated.
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

  interface AdherenceRow {
    id: string;
    userId: string;
    capOpened: boolean;
    capTimestamp: string | null;
    reportTimestamp: string | null;
  }
  const records = readDB<AdherenceRow>("adherence-records");
  let updated = 0;

  for (const record of records) {
    if (record.userId !== user.id) continue;
    if (record.capOpened) continue; // already confirmed
    const reportTs = record.reportTimestamp ? new Date(record.reportTimestamp).getTime() : NaN;
    if (isNaN(reportTs)) continue;

    // Find the closest "opened" event within ±4 hours
    let closestDiff = Infinity;
    let closestIso = "";
    for (const openTs of openTimes) {
      const diff = Math.abs(openTs - reportTs);
      if (diff <= FOUR_HOURS && diff < closestDiff) {
        closestDiff = diff;
        closestIso = new Date(openTs).toISOString();
      }
    }

    if (closestIso) {
      record.capOpened = true;
      record.capTimestamp = closestIso;
      updated++;
    }
  }

  if (updated > 0) {
    writeDB("adherence-records", records);
  }
  return updated;
}
