"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle, Bell, AlertCircle, User, ClipboardCheck, Clock } from "lucide-react";
import { AdherenceRecord, User as UserType } from "@/lib/types";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface PatientWithRecords extends UserType {
  todayRecords: AdherenceRecord[];
}

export default function ChwPage() {
  const [patients, setPatients] = useState<PatientWithRecords[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState<
    Record<string, { loading: boolean; success: string; error: string }>
  >({});
  const [postSurveyStatus, setPostSurveyStatus] = useState<
    "unavailable" | "available" | "completed"
  >("available");
  const [cohortEndDate, setCohortEndDate] = useState<string | null>(null);

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

  useEffect(() => {
    async function load() {
      try {
        const usersRes = await fetch("/api/users");
        const allUsers: UserType[] = await usersRes.json();

        // Find this CHW's assigned patients
        // We fetch the current user via auth context embedded in cookie
        // Users API returns all users; we need to find our assigned ones
        // The CHW's assigned patient is stored in their user record
        // For CHWs, assignedPatientId points to their patient
        // We'll filter users that have this CHW assigned
        const meRes = await fetch("/api/auth/me");
        let myId = "";
        if (meRes.ok) {
          const me = await meRes.json();
          myId = me.id;
        }

        const myPatients = allUsers.filter(
          (u) => u.role === "patient" && u.assignedChwId === myId
        );

        const todayStr = new Date().toISOString().split("T")[0];
        const patientsWithRecords: PatientWithRecords[] = await Promise.all(
          myPatients.map(async (p) => {
            const recRes = await fetch(`/api/adherence?userId=${p.id}`);
            const records: AdherenceRecord[] = recRes.ok ? await recRes.json() : [];
            return {
              ...p,
              todayRecords: records.filter((r) => r.date === todayStr),
            };
          })
        );

        setPatients(patientsWithRecords);
      } catch {
        setPatients([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function recordAction(
    patientId: string,
    recordType: "chw_recorded" | "chw_notified"
  ) {
    setActionState((s) => ({
      ...s,
      [`${patientId}-${recordType}`]: { loading: true, success: "", error: "" },
    }));

    try {
      const res = await fetch("/api/adherence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: patientId,
          recordType,
          takenAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        const successMsg =
          recordType === "chw_recorded" ? "Recorded!" : "Notified!";
        setActionState((s) => ({
          ...s,
          [`${patientId}-${recordType}`]: {
            loading: false,
            success: successMsg,
            error: "",
          },
        }));
        // Refresh patient records
        const todayStr = new Date().toISOString().split("T")[0];
        setPatients((prev) =>
          prev.map((p) => {
            if (p.id !== patientId) return p;
            const newRecord: AdherenceRecord = {
              id: `tmp-${Date.now()}`,
              date: todayStr,
              userId: patientId,
              recordedBy: "chw",
              recordType,
              selfReported: false,
              capOpened: false,
              capTimestamp: null,
              reportTimestamp: new Date().toISOString(),
            };
            return { ...p, todayRecords: [...p.todayRecords, newRecord] };
          })
        );
        setTimeout(() => {
          setActionState((s) => ({
            ...s,
            [`${patientId}-${recordType}`]: {
              loading: false,
              success: "",
              error: "",
            },
          }));
        }, 3000);
      } else {
        const data = await res.json();
        setActionState((s) => ({
          ...s,
          [`${patientId}-${recordType}`]: {
            loading: false,
            success: "",
            error: data.error || "Failed",
          },
        }));
      }
    } catch {
      setActionState((s) => ({
        ...s,
        [`${patientId}-${recordType}`]: {
          loading: false,
          success: "",
          error: "Network error",
        },
      }));
    }
  }

  function getState(patientId: string, type: string) {
    return (
      actionState[`${patientId}-${type}`] || {
        loading: false,
        success: "",
        error: "",
      }
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Patients</h1>
        <p className="mt-1 text-sm text-gray-500">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
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

      {loading ? (
        <p className="text-sm text-gray-400">Loading patients…</p>
      ) : patients.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <User className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No patients assigned to you yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {patients.map((patient) => {
            const hasTaken = patient.todayRecords.some(
              (r) =>
                r.recordType === "self" || r.recordType === "chw_recorded"
            );
            const hasNotified = patient.todayRecords.some(
              (r) => r.recordType === "chw_notified"
            );
            const recordState = getState(patient.id, "chw_recorded");
            const notifyState = getState(patient.id, "chw_notified");

            return (
              <div
                key={patient.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{patient.email}</p>
                  </div>
                  <div className="flex gap-2">
                    {hasTaken && (
                      <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Taken today
                      </span>
                    )}
                    {hasNotified && (
                      <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                        <Bell className="h-3 w-3" />
                        Notified
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Record taken */}
                  <div>
                    <button
                      onClick={() => recordAction(patient.id, "chw_recorded")}
                      disabled={recordState.loading}
                      className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 transition-colors"
                    >
                      {recordState.loading
                        ? "Recording…"
                        : "Record taken"}
                    </button>
                    {recordState.success && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        {recordState.success}
                      </p>
                    )}
                    {recordState.error && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="h-3 w-3" />
                        {recordState.error}
                      </p>
                    )}
                  </div>

                  {/* Record notified */}
                  <div>
                    <button
                      onClick={() => recordAction(patient.id, "chw_notified")}
                      disabled={notifyState.loading}
                      className="w-full rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-60 transition-colors"
                    >
                      {notifyState.loading
                        ? "Recording…"
                        : "Notified patient"}
                    </button>
                    {notifyState.success && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        {notifyState.success}
                      </p>
                    )}
                    {notifyState.error && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="h-3 w-3" />
                        {notifyState.error}
                      </p>
                    )}
                  </div>
                </div>

                {/* Today's log */}
                {patient.todayRecords.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="mb-1.5 text-xs font-medium text-gray-500">
                      Today&apos;s log
                    </p>
                    <div className="space-y-1">
                      {patient.todayRecords.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className={`flex items-center gap-1 ${r.recordType === "chw_notified" ? "text-blue-600" : "text-gray-600"}`}>
                            {r.recordType === "chw_notified"
                              ? <Bell className="h-3 w-3" />
                              : <CheckCircle className="h-3 w-3 text-green-500" />}
                            {r.recordType === "self"
                              ? "Self-reported"
                              : r.recordType === "chw_recorded"
                                ? "Recorded by you"
                                : "Notified by you"}
                          </span>
                          <span className="text-gray-400">
                            {r.reportTimestamp
                              ? formatDateTime(r.reportTimestamp)
                              : r.date}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
