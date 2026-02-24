// scripts/seed-database.js
// Run once with: node scripts/seed-database.js
// Generates all JSON files in the database/ folder from the same
// logic used in src/lib/mock-data.ts.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DB_DIR = path.join(__dirname, "../database");

function write(filename, data) {
  fs.writeFileSync(
    path.join(DB_DIR, filename),
    JSON.stringify(data, null, 2),
    "utf-8"
  );
  console.log(`  wrote ${filename} (${data.length} records)`);
}

// ─── Admins ───────────────────────────────────────────────────────────────────
const admins = [
  {
    id: "admin-1",
    firstName: "Sarah",
    lastName: "Chen",
    email: "admin@medadhere.com",
    // SHA-256 of "admin123"
    passwordHash:
      "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
    role: "admin",
    createdAt: "2025-01-01T00:00:00Z",
  },
];

// ─── Cohorts ──────────────────────────────────────────────────────────────────
const cohorts = [
  {
    id: "cohort-1",
    name: "IU Med School Pilot",
    institution: "IU School of Medicine",
    startDate: "2025-03-31",
    endDate: "2025-04-04",
    description: "First pilot cohort with IU medical students",
    status: "active",
    capRangeStart: 1,
    capRangeEnd: 91,
    participantCount: 91,
    questionIds: ["q-1", "q-2", "q-3"],
  },
  {
    id: "cohort-2",
    name: "Purdue Pharmacy Spring",
    institution: "Purdue Pharmacy School",
    startDate: "2025-04-27",
    endDate: "2025-05-02",
    description: "Purdue pharmacy students cohort",
    status: "upcoming",
    capRangeStart: 92,
    capRangeEnd: 200,
    participantCount: 0,
    questionIds: ["q-1", "q-4", "q-5"],
  },
  {
    id: "cohort-3",
    name: "Kenya Pilot Program",
    institution: "Kenya Medical Program",
    startDate: "2025-06-01",
    endDate: "2025-06-07",
    description: "Pilot program with Kenyan medical students",
    status: "upcoming",
    capRangeStart: 201,
    capRangeEnd: 300,
    participantCount: 0,
    questionIds: ["q-1", "q-2"],
  },
];

// ─── Caps ─────────────────────────────────────────────────────────────────────
const caps = Array.from({ length: 300 }, (_, i) => {
  const id = i + 1;
  let status = "available";
  let assignedTo = null;
  let cohortId = null;

  if (id <= 60) {
    status = "assigned";
    assignedTo = `user-${id}`;
    cohortId = "cohort-1";
  }
  if (id === 71 || id === 72) {
    status = "broken";
    assignedTo = null;
    cohortId = null;
  }

  return {
    id,
    status,
    assignedTo,
    cohortId,
    lastSeen: status === "assigned" ? "2025-04-01T10:30:00Z" : null,
  };
});

// ─── Users ────────────────────────────────────────────────────────────────────
const firstNames = [
  "James", "Sarah", "Michael", "Emily", "David", "Jessica", "Robert", "Ashley",
  "William", "Amanda", "Daniel", "Megan", "Christopher", "Lauren", "Matthew",
  "Hannah", "Andrew", "Samantha", "Joshua", "Rachel",
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin",
];

const dosingOptions = ["1x", "2x", "3x"];

const users = Array.from({ length: 60 }, (_, i) => {
  const id = `user-${i + 1}`;
  const isChw = i >= 40 && i < 60;
  const isPatientWithChw = i >= 20 && i < 40;

  return {
    id,
    firstName: firstNames[i % firstNames.length],
    lastName: lastNames[i % lastNames.length],
    email: `${firstNames[i % firstNames.length].toLowerCase()}.${lastNames[i % lastNames.length].toLowerCase()}@example.com`,
    role: isChw ? "chw" : "patient",
    cohortId: "cohort-1",
    capId: isChw ? null : i + 1,
    dosingRegimen: isChw ? null : dosingOptions[i % 3],
    assignedChwId: isPatientWithChw ? `user-${i + 21}` : null,
    assignedPatientId: isChw ? `user-${i - 19}` : null,
  };
});

// ─── Questions ────────────────────────────────────────────────────────────────
const questions = [
  {
    id: "q-1",
    text: "What is your current GPA?",
    type: "number",
    category: "Academic",
    cohortIds: ["cohort-1", "cohort-2"],
  },
  {
    id: "q-2",
    text: "Have you ever taken a course in public health?",
    type: "boolean",
    category: "Academic",
    cohortIds: ["cohort-1", "cohort-3"],
  },
  {
    id: "q-3",
    text: "What year are you in your program?",
    type: "select",
    category: "Academic",
    options: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
    cohortIds: ["cohort-1"],
  },
  {
    id: "q-4",
    text: "How many hours per week do you work outside of school?",
    type: "number",
    category: "Lifestyle",
    cohortIds: ["cohort-2"],
  },
  {
    id: "q-5",
    text: "Do you currently take any daily medications?",
    type: "boolean",
    category: "Health",
    cohortIds: ["cohort-2"],
  },
  {
    id: "q-6",
    text: "What is your primary mode of transportation?",
    type: "select",
    category: "Lifestyle",
    options: ["Car", "Bus", "Bicycle", "Walking"],
    cohortIds: [],
  },
];

// ─── Adherence Records (seeded PRNG — identical to mock-data.ts) ───────────────
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

const rand = seededRandom(42);
const adherenceRecords = [];
const dates = [
  "2025-03-31",
  "2025-04-01",
  "2025-04-02",
  "2025-04-03",
  "2025-04-04",
];

for (const dateStr of dates) {
  for (let userId = 1; userId <= 40; userId++) {
    const selfReported = rand() > 0.15;
    const capOpened = rand() > 0.25;
    const capHour = 8 + Math.floor(rand() * 12);
    const capMin = Math.floor(rand() * 60);
    const repHour = 8 + Math.floor(rand() * 14);
    const repMin = Math.floor(rand() * 60);
    adherenceRecords.push({
      date: dateStr,
      userId: `user-${userId}`,
      selfReported,
      capOpened,
      capTimestamp: capOpened
        ? `${dateStr}T${String(capHour).padStart(2, "0")}:${String(capMin).padStart(2, "0")}:00Z`
        : null,
      reportTimestamp: selfReported
        ? `${dateStr}T${String(repHour).padStart(2, "0")}:${String(repMin).padStart(2, "0")}:00Z`
        : null,
    });
  }
}

// ─── Activity Log ─────────────────────────────────────────────────────────────
const activityLog = [
  {
    id: "act-1",
    message: "Cohort 'IU Med School Pilot' was activated",
    timestamp: "2025-03-31T08:00:00Z",
    type: "cohort",
  },
  {
    id: "act-2",
    message: "60 users enrolled in IU Med School Pilot",
    timestamp: "2025-03-31T08:15:00Z",
    type: "user",
  },
  {
    id: "act-3",
    message: "Caps 1-60 assigned to IU cohort patients",
    timestamp: "2025-03-31T08:30:00Z",
    type: "cap",
  },
  {
    id: "act-4",
    message: "Caps 71, 72 marked as broken",
    timestamp: "2025-03-30T14:00:00Z",
    type: "cap",
  },
  {
    id: "act-5",
    message: "Cohort 'Purdue Pharmacy Spring' created",
    timestamp: "2025-03-28T10:00:00Z",
    type: "cohort",
  },
  {
    id: "act-6",
    message: "3 new questions added to question bank",
    timestamp: "2025-03-27T16:00:00Z",
    type: "system",
  },
];

// ─── Write all files ──────────────────────────────────────────────────────────
console.log("Seeding database/...");
write("admins.json", admins);
write("cohorts.json", cohorts);
write("caps.json", caps);
write("users.json", users);
write("questions.json", questions);
write("adherence-records.json", adherenceRecords);
write("activity-log.json", activityLog);
console.log("Done.");
