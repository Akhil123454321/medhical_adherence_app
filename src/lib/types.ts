export type CohortStatus = "active" | "upcoming" | "completed";

export interface Cohort {
  id: string;
  name: string;
  institution: string;
  startDate: string;
  endDate: string;
  description: string;
  status: CohortStatus;
  capRangeStart: number;
  capRangeEnd: number;
  participantCount: number;
  questionIds: string[];
}

export type CapStatus = "available" | "assigned" | "broken";

export interface Cap {
  id: number;
  status: CapStatus;
  assignedTo: string | null;
  cohortId: string | null;
  lastSeen: string | null;
}

export type UserRole = "admin" | "patient" | "chw";

export type DosingRegimen = "1x" | "2x" | "3x";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  cohortId: string | null;
  capId: number | null;
  dosingRegimen: DosingRegimen | null;
  assignedChwId: string | null;
  assignedPatientId: string | null;
}

export interface Question {
  id: string;
  text: string;
  type: "text" | "number" | "select" | "boolean";
  category: string;
  options?: string[];
  cohortIds: string[];
}

export interface AdherenceRecord {
  date: string;
  userId: string;
  selfReported: boolean;
  capOpened: boolean;
  capTimestamp: string | null;
  reportTimestamp: string | null;
}

export interface ActivityItem {
  id: string;
  message: string;
  timestamp: string;
  type: "cohort" | "user" | "cap" | "system";
}

export interface RandomizationResult {
  firstName: string;
  lastName: string;
  role: UserRole;
  dosingRegimen: DosingRegimen | null;
  pairedWith: string | null;
}
