"use client";

import { useState, useMemo, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import StatsCard from "@/components/ui/StatsCard";
import Button from "@/components/ui/Button";
import AdherenceChart from "@/components/admin/AdherenceChart";
import { AdherenceRecord, Cohort, User } from "@/lib/types";
import { Activity, CheckCircle, Bell, User as UserIcon, Download, Clock } from "lucide-react";

// Dosing time windows per Sonak's spec
const TIME_WINDOWS = {
  morning: { label: "Morning", range: "6–10 am", start: 6, end: 10 },
  midday:  { label: "Midday",  range: "12–3 pm",  start: 12, end: 15 },
  evening: { label: "Evening", range: "6–11 pm",  start: 18, end: 23 },
};

type WindowKey = keyof typeof TIME_WINDOWS;

function getWindow(isoTimestamp: string): WindowKey | null {
  const h = new Date(isoTimestamp).getHours();
  if (h >= 6  && h < 10) return "morning";
  if (h >= 12 && h < 15) return "midday";
  if (h >= 18 && h < 23) return "evening";
  return null;
}

function expectedWindows(regimen: string | null): WindowKey[] {
  if (regimen === "2x") return ["morning", "evening"];
  if (regimen === "3x") return ["morning", "midday", "evening"];
  return [];
}

export default function DataPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [records, setRecords] = useState<AdherenceRecord[]>([]);
  const [selectedCohort, setSelectedCohort] = useState("");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  // Load cohorts and users once
  useEffect(() => {
    Promise.all([
      fetch("/api/cohorts").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([cohortData, userData]) => {
      const cohortList: Cohort[] = Array.isArray(cohortData) ? cohortData : [];
      setCohorts(cohortList);
      setUsers(Array.isArray(userData) ? userData : []);
      if (cohortList.length > 0) setSelectedCohort(cohortList[0].id);
    });
  }, []);

  // Load records when cohort changes
  useEffect(() => {
    if (!selectedCohort) return;
    setLoading(true);
    fetch(`/api/adherence?cohortId=${selectedCohort}`)
      .then((r) => r.json())
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [selectedCohort]);

  const cohortUsers = useMemo(
    () => users.filter((u) => u.cohortId === selectedCohort && u.role === "patient"),
    [users, selectedCohort]
  );

  const dailyData = useMemo(() => {
    const byDate: Record<string, { self: number; chwRecorded: number; chwNotified: number; capOpened: number }> = {};
    records.forEach((r) => {
      if (!byDate[r.date]) byDate[r.date] = { self: 0, chwRecorded: 0, chwNotified: 0, capOpened: 0 };
      // selfReported=true means patient tapped the button; selfReported=false
      // means the record was generated from the physical cap log.
      if (r.selfReported) byDate[r.date].self++;
      if (r.recordType === "chw_recorded") byDate[r.date].chwRecorded++;
      if (r.recordType === "chw_notified") byDate[r.date].chwNotified++;
      if (r.capOpened) byDate[r.date].capOpened++;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => {
        const total = d.self + d.chwRecorded + d.chwNotified + d.capOpened || 1;
        return {
          date: new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          selfReported: Math.round((d.self / total) * 100),
          capOpened: Math.round((d.capOpened / total) * 100),
        };
      });
  }, [records]);

  const overallStats = useMemo(() => {
    const total = records.length;
    if (total === 0) return { self: 0, chwRecorded: 0, chwNotified: 0, capOpened: 0 };
    return {
      self: records.filter((r) => r.selfReported).length,
      chwRecorded: records.filter((r) => r.recordType === "chw_recorded").length,
      chwNotified: records.filter((r) => r.recordType === "chw_notified").length,
      capOpened: records.filter((r) => r.capOpened).length,
    };
  }, [records]);

  const userAdherence = useMemo(() => {
    return cohortUsers.map((user) => {
      const userRecords = records.filter((r) => r.userId === user.id);
      const self = userRecords.filter((r) => r.selfReported).length;
      const chwRecorded = userRecords.filter((r) => r.recordType === "chw_recorded").length;
      const chwNotified = userRecords.filter((r) => r.recordType === "chw_notified").length;
      const capOpened = userRecords.filter((r) => r.capOpened).length;
      const total = userRecords.length;
      const selfRate = total ? Math.round((self / total) * 100) : 0;
      const capRate = total ? Math.round((capOpened / total) * 100) : 0;

      // Resolve CHW name
      const chw = user.assignedChwId ? users.find((u) => u.id === user.assignedChwId) : null;

      // Time window analysis — uses capTimestamp if available, else reportTimestamp
      const windows: Record<WindowKey, number> = { morning: 0, midday: 0, evening: 0 };
      const inWindow: Record<WindowKey, number> = { morning: 0, midday: 0, evening: 0 };
      const expected = expectedWindows(user.dosingRegimen);
      userRecords.forEach((r) => {
        const ts = r.capTimestamp ?? r.reportTimestamp;
        if (!ts) return;
        const w = getWindow(ts);
        if (!w) return;
        windows[w]++;
        if (expected.includes(w)) inWindow[w]++;
      });

      return { ...user, self, chwRecorded, chwNotified, capOpened, total, selfRate, capRate, chw, windows, inWindow, expectedWindows: expected };
    });
  }, [cohortUsers, records, users]);

  const totalRecords = overallStats.self + overallStats.chwRecorded + overallStats.chwNotified;

  async function downloadCSV() {
    if (!selectedCohort) return;
    setExporting(true);
    setExportError("");
    try {
      const res = await fetch(`/api/export?cohortId=${selectedCohort}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setExportError(data.error ?? `Export failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1]
        ?? "export.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Network error — please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Adherence breakdown by record type across the cohort
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedCohort}
            onChange={(e) => setSelectedCohort(e.target.value)}
            options={cohorts.map((c) => ({ value: c.id, label: c.name }))}
            className="w-56"
          />
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={downloadCSV}
              disabled={!selectedCohort || exporting}
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
            {exportError && (
              <p className="text-xs text-red-600">{exportError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard
          title="Self-Reported"
          value={overallStats.self}
          icon={UserIcon}
          trend={totalRecords ? `${Math.round((overallStats.self / totalRecords) * 100)}% of records` : undefined}
          trendUp
        />
        <StatsCard
          title="CHW Recorded"
          value={overallStats.chwRecorded}
          icon={CheckCircle}
          trend={totalRecords ? `${Math.round((overallStats.chwRecorded / totalRecords) * 100)}% of records` : undefined}
          trendUp
        />
        <StatsCard
          title="CHW Notified"
          value={overallStats.chwNotified}
          icon={Bell}
          trend={totalRecords ? `${Math.round((overallStats.chwNotified / totalRecords) * 100)}% of records` : undefined}
          trendUp={false}
        />
        <StatsCard
          title="Cap Confirmed"
          value={overallStats.capOpened}
          icon={Activity}
          trend={totalRecords ? `${Math.round((overallStats.capOpened / totalRecords) * 100)}% verified` : undefined}
          trendUp
        />
      </div>

      {/* Chart */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Daily Adherence</h3>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            <Button size="sm" variant={chartType === "bar" ? "primary" : "ghost"} onClick={() => setChartType("bar")}>Bar</Button>
            <Button size="sm" variant={chartType === "line" ? "primary" : "ghost"} onClick={() => setChartType("line")}>Line</Button>
          </div>
        </div>
        <AdherenceChart dailyData={dailyData} chartType={chartType} />
      </Card>

      {/* Per-user table */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Per-Patient Breakdown</h3>
        {loading ? (
          <p className="text-sm text-gray-400 py-4">Loading…</p>
        ) : userAdherence.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">No patients in this cohort.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-3 font-medium text-gray-500">Patient</th>
                  <th className="px-3 py-3 font-medium text-gray-500">CHW</th>
                  <th className="px-3 py-3 font-medium text-gray-500">Dosing</th>
                  <th className="px-3 py-3 font-medium text-gray-500 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <UserIcon className="h-3.5 w-3.5 text-indigo-400" />
                      Self
                    </span>
                  </th>
                  <th className="px-3 py-3 font-medium text-gray-500 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      CHW Recorded
                    </span>
                  </th>
                  <th className="px-3 py-3 font-medium text-gray-500 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Bell className="h-3.5 w-3.5 text-blue-500" />
                      CHW Notified
                    </span>
                  </th>
                  <th className="px-3 py-3 font-medium text-gray-500 text-center">Cap ✓</th>
                  <th className="px-3 py-3 font-medium text-gray-500 text-center">Self vs Cap</th>
                </tr>
              </thead>
              <tbody>
                {userAdherence.map((user) => {
                  const diff = user.selfRate - user.capRate;
                  return (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-gray-400">Cap #{user.capId ?? "—"}</p>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">
                        {user.chw ? `${user.chw.firstName} ${user.chw.lastName}` : <span className="text-gray-300">None</span>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{user.dosingRegimen ?? "—"}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-medium text-indigo-600">{user.self}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-medium text-green-600">{user.chwRecorded}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-medium ${user.chwNotified > 0 ? "text-blue-600" : "text-gray-300"}`}>
                          {user.chwNotified}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-medium text-emerald-600">{user.capOpened}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {user.total === 0 ? (
                          <span className="text-gray-300 text-xs">—</span>
                        ) : (
                          <Badge variant={Math.abs(diff) <= 10 ? "success" : diff > 0 ? "warning" : "danger"}>
                            {diff > 0 ? `+${diff}%` : `${diff}%`}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Time Window Compliance */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900">Dosing Time Window Compliance</h3>
        </div>
        <div className="mb-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span><strong>BID (2x):</strong> Morning 6–10 am · Evening 6–11 pm</span>
          <span><strong>TID (3x):</strong> Morning 6–10 am · Midday 12–3 pm · Evening 6–11 pm</span>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400 py-4">Loading…</p>
        ) : userAdherence.filter(u => u.expectedWindows.length > 0).length === 0 ? (
          <p className="text-sm text-gray-400 py-4">No BID or TID patients in this cohort.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-3 font-medium text-gray-500">Patient</th>
                  <th className="px-3 py-3 font-medium text-gray-500">Dosing</th>
                  <th className="px-3 py-3 font-medium text-gray-500 text-center">Morning<br /><span className="text-xs font-normal text-gray-400">6–10 am</span></th>
                  <th className="px-3 py-3 font-medium text-gray-500 text-center">Midday<br /><span className="text-xs font-normal text-gray-400">12–3 pm</span></th>
                  <th className="px-3 py-3 font-medium text-gray-500 text-center">Evening<br /><span className="text-xs font-normal text-gray-400">6–11 pm</span></th>
                  <th className="px-3 py-3 font-medium text-gray-500 text-center">Outside Window</th>
                </tr>
              </thead>
              <tbody>
                {userAdherence
                  .filter(u => u.expectedWindows.length > 0)
                  .map((user) => {
                    const outsideWindow = user.total - Object.values(user.windows).reduce((a, b) => a + b, 0)
                      + Object.entries(user.windows).reduce((acc, [w, count]) =>
                        acc + (user.expectedWindows.includes(w as WindowKey) ? 0 : count), 0);
                    return (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                        </td>
                        <td className="px-3 py-2.5 text-gray-500">{user.dosingRegimen}</td>
                        {(["morning", "midday", "evening"] as WindowKey[]).map((w) => {
                          const expected = user.expectedWindows.includes(w);
                          const count = user.windows[w] ?? 0;
                          return (
                            <td key={w} className="px-3 py-2.5 text-center">
                              {expected ? (
                                <span className={`font-medium ${count > 0 ? "text-emerald-600" : "text-gray-300"}`}>
                                  {count}
                                </span>
                              ) : (
                                <span className="text-gray-200">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2.5 text-center">
                          <span className={`font-medium ${outsideWindow > 0 ? "text-amber-600" : "text-gray-300"}`}>
                            {outsideWindow > 0 ? outsideWindow : "0"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5 text-indigo-400" /> Self — patient tapped &quot;I took my medication&quot;</span>
        <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" /> CHW Recorded — CHW confirmed dose on patient&apos;s behalf</span>
        <span className="flex items-center gap-1.5"><Bell className="h-3.5 w-3.5 text-blue-500" /> CHW Notified — CHW sent a reminder, dose not yet confirmed</span>
        <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-emerald-500" /> Cap ✓ — physical cap opening detected</span>
      </div>
    </div>
  );
}
