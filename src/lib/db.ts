// Thin wrapper around reading from the database/ JSON files.
// Only usable in Node.js runtime (API routes, server components).
// Not safe for Edge runtime — use auth.ts utilities there instead.

import { readFileSync, writeFileSync } from "fs";
import path from "path";

type Collection =
  | "admins"
  | "cohorts"
  | "caps"
  | "users"
  | "questions"
  | "adherence-records"
  | "activity-log"
  | "survey-responses";

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

export function readCapLog(capId: number): string | null {
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
