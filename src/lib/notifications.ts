// Server-side only — uses Node.js fs via readDB/writeDB.
import { readDB, writeDB } from "./db";
import {
  AppNotification,
  User,
  Cohort,
  AdherenceRecord,
  SurveyResponse,
} from "./types";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function makeId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function push(
  list: AppNotification[],
  existingKeys: Set<string>,
  notif: Omit<AppNotification, "id">
) {
  if (existingKeys.has(notif.dedupeKey)) return;
  existingKeys.add(notif.dedupeKey);
  list.push({ id: makeId(), ...notif });
}

export function generateNotifications(userId: string, role: string): AppNotification[] {
  const allNotifs = readDB<AppNotification>("notifications");
  const existingKeys = new Set(allNotifs.map((n) => n.dedupeKey));
  const newNotifs: AppNotification[] = [];
  const todayStr = today();

  const allUsers = readDB<User>("users");
  const cohorts = readDB<Cohort>("cohorts");
  const surveys = readDB<SurveyResponse>("survey-responses");
  const records = readDB<AdherenceRecord>("adherence-records");

  if (role === "admin") {
    // ── Admin notifications ────────────────────────────────────────────────
    for (const cohort of cohorts) {
      // Cohort started
      if (todayStr >= cohort.startDate) {
        push(newNotifs, existingKeys, {
          userId,
          type: "cohort_start",
          title: `Cohort started: ${cohort.name}`,
          message: `The study period for "${cohort.name}" began on ${cohort.startDate}.`,
          read: false,
          dismissed: false,
          createdAt: cohort.startDate + "T08:00:00.000Z",
          cohortId: cohort.id,
          dedupeKey: `cohort_start:${cohort.id}:${userId}`,
        });
      }

      // Cohort ended
      if (todayStr > cohort.endDate) {
        push(newNotifs, existingKeys, {
          userId,
          type: "cohort_end",
          title: `Cohort ended: ${cohort.name}`,
          message: `The study period for "${cohort.name}" ended on ${cohort.endDate}.`,
          read: false,
          dismissed: false,
          createdAt: cohort.endDate + "T08:00:00.000Z",
          cohortId: cohort.id,
          dedupeKey: `cohort_end:${cohort.id}:${userId}`,
        });
      }

      // Low adherence alert — patients with 0 records for 2+ consecutive days
      const cohortPatients = allUsers.filter(
        (u) => u.cohortId === cohort.id && u.role === "patient"
      );
      for (const patient of cohortPatients) {
        const yesterday = addDays(todayStr, -1);
        const twoDaysAgo = addDays(todayStr, -2);
        const hasYesterday = records.some(
          (r) => r.userId === patient.id && r.date === yesterday
        );
        const hasTwoDaysAgo = records.some(
          (r) => r.userId === patient.id && r.date === twoDaysAgo
        );
        if (!hasYesterday && !hasTwoDaysAgo && todayStr > cohort.startDate) {
          push(newNotifs, existingKeys, {
            userId,
            type: "low_adherence",
            title: "Low adherence alert",
            message: `${patient.firstName} ${patient.lastName} has no adherence records for the past 2 days.`,
            read: false,
            dismissed: false,
            createdAt: new Date().toISOString(),
            cohortId: cohort.id,
            dedupeKey: `low_adherence:${patient.id}:${yesterday}`,
          });
        }
      }

      // New enrollment notifications (users added in last 7 days without a prior notification)
      const recentUsers = allUsers.filter((u) => {
        if (u.cohortId !== cohort.id || u.role === "admin") return false;
        // Use user id as proxy — check if we've already notified about this user
        const key = `new_enrollment:${u.id}:${userId}`;
        return !existingKeys.has(key);
      });
      for (const u of recentUsers) {
        push(newNotifs, existingKeys, {
          userId,
          type: "new_enrollment",
          title: "New participant enrolled",
          message: `${u.firstName} ${u.lastName} (${u.role}) was added to "${cohort.name}".`,
          read: false,
          dismissed: false,
          createdAt: new Date().toISOString(),
          cohortId: cohort.id,
          dedupeKey: `new_enrollment:${u.id}:${userId}`,
        });
      }
    }
  } else {
    // ── Patient / CHW notifications ─────────────────────────────────────────
    const user = allUsers.find((u) => u.id === userId);
    if (!user || !user.cohortId) {
      if (newNotifs.length > 0) {
        allNotifs.push(...newNotifs);
        writeDB("notifications", allNotifs);
      }
      return allNotifs.filter((n) => n.userId === userId && !n.dismissed);
    }

    const cohort = cohorts.find((c) => c.id === user.cohortId);
    if (!cohort) {
      if (newNotifs.length > 0) {
        allNotifs.push(...newNotifs);
        writeDB("notifications", allNotifs);
      }
      return allNotifs.filter((n) => n.userId === userId && !n.dismissed);
    }

    // Cohort started
    if (todayStr >= cohort.startDate) {
      push(newNotifs, existingKeys, {
        userId,
        type: "cohort_start",
        title: "Your study period has begun",
        message: `Your cohort "${cohort.name}" started on ${cohort.startDate}. Remember to log your medication each day.`,
        read: false,
        dismissed: false,
        createdAt: cohort.startDate + "T08:00:00.000Z",
        cohortId: cohort.id,
        dedupeKey: `cohort_start:${cohort.id}:${userId}`,
      });
    }

    // Cohort ended
    if (todayStr > cohort.endDate) {
      push(newNotifs, existingKeys, {
        userId,
        type: "cohort_end",
        title: "Your study period has ended",
        message: `Your cohort "${cohort.name}" ended on ${cohort.endDate}. Please complete your post-exercise survey.`,
        read: false,
        dismissed: false,
        createdAt: cohort.endDate + "T08:00:00.000Z",
        cohortId: cohort.id,
        dedupeKey: `cohort_end:${cohort.id}:${userId}`,
      });
    }

    // Pre-survey reminder — cohort started but pre-survey not completed
    if (todayStr > cohort.startDate) {
      const hasPreSurvey = surveys.some(
        (s) => s.userId === userId && s.surveyType === "pre"
      );
      if (!hasPreSurvey) {
        push(newNotifs, existingKeys, {
          userId,
          type: "pre_survey_reminder",
          title: "Pre-survey reminder",
          message: "You haven't completed your pre-exercise survey yet. Please complete it as soon as possible.",
          read: false,
          dismissed: false,
          createdAt: new Date().toISOString(),
          cohortId: cohort.id,
          dedupeKey: `pre_survey_reminder:${cohort.id}:${userId}`,
        });
      }
    }

    // Post-survey available
    if (todayStr >= cohort.endDate) {
      const hasPostSurvey = surveys.some(
        (s) => s.userId === userId && s.surveyType === "post"
      );
      if (!hasPostSurvey) {
        push(newNotifs, existingKeys, {
          userId,
          type: "post_survey_available",
          title: "Post-survey now available",
          message: "The study period has ended. Please complete your post-exercise survey.",
          read: false,
          dismissed: false,
          createdAt: cohort.endDate + "T08:00:00.000Z",
          cohortId: cohort.id,
          dedupeKey: `post_survey_available:${cohort.id}:${userId}`,
        });
      }
    }

    // CHW: patient hasn't logged today (after 8pm)
    if (role === "chw") {
      const user2 = allUsers.find((u) => u.id === userId);
      const patient = user2?.assignedPatientId
        ? allUsers.find((u) => u.id === user2.assignedPatientId)
        : null;
      if (patient && new Date().getHours() >= 20) {
        const hasTodayRecord = records.some(
          (r) => r.userId === patient.id && r.date === todayStr
        );
        if (!hasTodayRecord) {
          push(newNotifs, existingKeys, {
            userId,
            type: "patient_missed_today",
            title: "Patient hasn't logged today",
            message: `${patient.firstName} ${patient.lastName} has no adherence record for today. Consider reaching out.`,
            read: false,
            dismissed: false,
            createdAt: new Date().toISOString(),
            cohortId: cohort.id,
            dedupeKey: `patient_missed_today:${patient.id}:${todayStr}`,
          });
        }
      }
    }
  }

  if (newNotifs.length > 0) {
    allNotifs.push(...newNotifs);
    writeDB("notifications", allNotifs);
  }

  return allNotifs.filter((n) => n.userId === userId && !n.dismissed);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}
