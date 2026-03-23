"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  ClipboardCheck,
  User,
  Users,
  Building2,
  Pill,
  Package,
  CalendarDays,
  Bell,
} from "lucide-react";
import { AdherenceRecord } from "@/lib/types";

function contactMethodLabel(method: string) {
  const map: Record<string, string> = {
    text: "Text",
    email: "Email",
    phone: "Phone call",
    in_person: "In person",
    other: "Other",
  };
  return map[method] ?? method;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(dateStr: string): number {
  const end = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function dosingLabel(regimen: string | null) {
  if (regimen === "1x") return "Once daily";
  if (regimen === "2x") return "Twice daily (BID)";
  if (regimen === "3x") return "Three times daily (TID)";
  return "—";
}

interface Profile {
  firstName: string;
  lastName: string;
  dosingRegimen: string | null;
  capId: number | null;
  cohort: {
    name: string;
    institution: string;
    startDate: string;
    endDate: string;
  } | null;
  assignedChw: { firstName: string; lastName: string } | null;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  highlight?: "green" | "amber" | "red";
}) {
  const valueClass =
    highlight === "green"
      ? "text-green-700 font-semibold"
      : highlight === "amber"
        ? "text-amber-700 font-semibold"
        : highlight === "red"
          ? "text-red-700 font-semibold"
          : "text-gray-900";

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <span className="text-sm text-gray-500 w-32 flex-shrink-0">{label}</span>
      <span className={`text-sm ${valueClass}`}>{value}</span>
    </div>
  );
}

export default function PatientPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<AdherenceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [postSurveyStatus, setPostSurveyStatus] = useState<
    "unavailable" | "available" | "completed"
  >("available");
  const [cohortEndDate, setCohortEndDate] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/adherence")
      .then((r) => r.json())
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .catch(() => setRecords([]))
      .finally(() => setLoadingRecords(false));
  }, [success]);

  useEffect(() => {
    Promise.all([
      fetch("/api/user/profile").then((r) => r.json()),
      fetch("/api/survey-responses?surveyType=post").then((r) => r.json()),
    ]).then(([profileData, postResponses]) => {
      setProfile(profileData);
      const endDate = profileData?.cohort?.endDate ?? null;
      setCohortEndDate(endDate);
      const today = new Date().toISOString().split("T")[0];
      if (endDate && today < endDate) {
        setPostSurveyStatus("unavailable");
      } else if (Array.isArray(postResponses) && postResponses.length > 0) {
        setPostSurveyStatus("completed");
      } else {
        setPostSurveyStatus("available");
      }
    }).catch(() => {});
  }, []);

  async function handleRecord() {
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/adherence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordType: "self",
          takenAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to record. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const today = formatDate(new Date().toISOString());
  const todayStr = new Date().toISOString().split("T")[0];
  const takenToday = records.some((r) => r.date === todayStr);

  // Days remaining badge
  const daysLeft = cohortEndDate ? daysUntil(cohortEndDate) : null;
  const daysHighlight =
    daysLeft === null ? undefined
    : daysLeft <= 0 ? "red"
    : daysLeft <= 3 ? "amber"
    : "green";
  const daysLabel =
    daysLeft === null ? "—"
    : daysLeft <= 0 ? "Session ended"
    : daysLeft === 1 ? "1 day left"
    : `${daysLeft} days left`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Medication</h1>
        <p className="mt-1 text-sm text-gray-500">{today}</p>
      </div>

      {/* Top row: medication button + study info side by side */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Record button */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center flex flex-col justify-between">
          <div>
            {takenToday ? (
              <div className="space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-gray-900">Taken today</p>
                <p className="text-sm text-gray-500">
                  You&apos;ve already recorded your medication for today.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                  <Clock className="h-8 w-8 text-indigo-600" />
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  Did you take your medication?
                </p>
                <p className="text-sm text-gray-500">
                  Tap the button below when you take your medication.
                </p>
              </div>
            )}
          </div>

          <div>
            <button
              onClick={handleRecord}
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-indigo-600 px-6 py-4 text-base font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              {loading ? "Recording…" : "I took my medication"}
            </button>

            {success && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                Recorded successfully!
              </div>
            )}

            {error && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Study info card */}
        {profile && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Study Information
              </h2>
            </div>
            <div className="px-5">
              {profile.cohort ? (
                <>
                  <InfoRow icon={Building2} label="Cohort" value={profile.cohort.name} />
                  <InfoRow icon={Building2} label="Institution" value={profile.cohort.institution} />
                  <InfoRow
                    icon={CalendarDays}
                    label="Session dates"
                    value={`${formatShortDate(profile.cohort.startDate)} – ${formatShortDate(profile.cohort.endDate)}`}
                  />
                  <InfoRow
                    icon={Clock}
                    label="Time remaining"
                    value={daysLabel}
                    highlight={daysHighlight}
                  />
                </>
              ) : (
                <InfoRow icon={Building2} label="Cohort" value="Not assigned" />
              )}
              <InfoRow
                icon={Pill}
                label="Dosing regimen"
                value={dosingLabel(profile.dosingRegimen)}
              />
              {profile.capId !== null && (
                <InfoRow icon={Package} label="Cap ID" value={`#${profile.capId}`} />
              )}
              <InfoRow
                icon={profile.assignedChw ? Users : User}
                label="Community HW"
                value={
                  profile.assignedChw
                    ? `${profile.assignedChw.firstName} ${profile.assignedChw.lastName}`
                    : "None assigned"
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Post-survey card */}
      {postSurveyStatus === "completed" ? (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Post-Exercise Survey</p>
            <p className="text-xs text-green-600">Completed — thank you!</p>
          </div>
        </div>
      ) : postSurveyStatus === "unavailable" ? (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
          <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-500">Post-Exercise Survey</p>
            <p className="text-xs text-gray-400">
              Available from{" "}
              {cohortEndDate
                ? new Date(cohortEndDate + "T00:00:00").toLocaleDateString(
                    "en-US",
                    { month: "long", day: "numeric", year: "numeric" }
                  )
                : "cohort end date"}
            </p>
          </div>
        </div>
      ) : (
        <Link
          href="/survey/post"
          className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-5 py-4 hover:bg-teal-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-teal-600" />
            <div>
              <p className="text-sm font-semibold text-teal-800">Post-Exercise Survey</p>
              <p className="text-xs text-teal-600">Complete after the simulation ends</p>
            </div>
          </div>
          <span className="text-xs font-medium text-teal-600">Start →</span>
        </Link>
      )}

      {/* History */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Recent History
        </h2>
        {loadingRecords ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-gray-400">No records yet.</p>
        ) : (
          <div className="space-y-2">
            {[...records]
              .sort(
                (a, b) =>
                  new Date(b.reportTimestamp || b.date).getTime() -
                  new Date(a.reportTimestamp || a.date).getTime()
              )
              .slice(0, 14)
              .map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {r.recordType === "chw_notified" ? (
                      <Bell className="h-4 w-4 text-blue-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm text-gray-700">
                      {r.reportTimestamp
                        ? formatDateTime(r.reportTimestamp)
                        : r.date}
                    </span>
                  </div>
                  <span className={`text-xs ${r.recordType === "chw_notified" ? "text-blue-500" : "text-gray-400"}`}>
                    {r.recordType === "self"
                      ? "Self"
                      : r.recordType === "chw_recorded"
                        ? "Recorded by CHW"
                        : "CHW notified"}
                    {r.contactMethod && ` · ${contactMethodLabel(r.contactMethod)}`}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
