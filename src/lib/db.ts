// Thin wrapper around reading from the database/ JSON files.
// Only usable in Node.js runtime (API routes, server components).
// Not safe for Edge runtime — use auth.ts utilities there instead.

import { readFileSync } from "fs";
import path from "path";

type Collection =
  | "admins"
  | "cohorts"
  | "caps"
  | "users"
  | "questions"
  | "adherence-records"
  | "activity-log";

export function readDB<T = unknown>(collection: Collection): T[] {
  const filePath = path.join(
    process.cwd(),
    "database",
    `${collection}.json`
  );
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T[];
}
