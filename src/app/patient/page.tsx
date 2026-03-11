"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle, Clock, AlertCircle, ClipboardCheck } from "lucide-react";
import { AdherenceRecord } from "@/lib/types";

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

export default function PatientPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<AdherenceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
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
    ]).then(([profile, postResponses]) => {
      const endDate = profile?.cohort?.endDate ?? null;
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Medication</h1>
        <p className="mt-1 text-sm text-gray-500">{today}</p>
      </div>

      {/* Record button */}
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
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
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-700">
                      {r.reportTimestamp
                        ? formatDateTime(r.reportTimestamp)
                        : r.date}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 capitalize">
                    {r.recordType === "self"
                      ? "Self"
                      : r.recordType === "chw_recorded"
                        ? "Recorded by CHW"
                        : "CHW notified"}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
