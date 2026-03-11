"use client";

import { useState, useMemo, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import StatsCard from "@/components/ui/StatsCard";
import Button from "@/components/ui/Button";
import AdherenceChart from "@/components/admin/AdherenceChart";
import { AdherenceRecord, Cohort, User } from "@/lib/types";
import { TrendingUp, TrendingDown, BarChart3, Activity, CheckCircle, Bell, User as UserIcon } from "lucide-react";

export default function DataPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [records, setRecords] = useState<AdherenceRecord[]>([]);
  const [selectedCohort, setSelectedCohort] = useState("");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [loading, setLoading] = useState(true);

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
      if (r.recordType === "self") byDate[r.date].self++;
      if (r.recordType === "chw_recorded") byDate[r.date].chwRecorded++;
      if (r.recordType === "chw_notified") byDate[r.date].chwNotified++;
      if (r.capOpened) byDate[r.date].capOpened++;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => {
        const total = d.self + d.chwRecorded + d.chwNotified || 1;
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
      self: records.filter((r) => r.recordType === "self").length,
      chwRecorded: records.filter((r) => r.recordType === "chw_recorded").length,
      chwNotified: records.filter((r) => r.recordType === "chw_notified").length,
      capOpened: records.filter((r) => r.capOpened).length,
    };
  }, [records]);

  const userAdherence = useMemo(() => {
    return cohortUsers.map((user) => {
      const userRecords = records.filter((r) => r.userId === user.id);
      const self = userRecords.filter((r) => r.recordType === "self").length;
      const chwRecorded = userRecords.filter((r) => r.recordType === "chw_recorded").length;
      const chwNotified = userRecords.filter((r) => r.recordType === "chw_notified").length;
      const capOpened = userRecords.filter((r) => r.capOpened).length;
      const total = userRecords.length;
      const selfRate = total ? Math.round((self / total) * 100) : 0;
      const capRate = total ? Math.round((capOpened / total) * 100) : 0;

      // Resolve CHW name
      const chw = user.assignedChwId ? users.find((u) => u.id === user.assignedChwId) : null;

      return { ...user, self, chwRecorded, chwNotified, capOpened, total, selfRate, capRate, chw };
    });
  }, [cohortUsers, records, users]);

  const totalRecords = overallStats.self + overallStats.chwRecorded + overallStats.chwNotified;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Adherence breakdown by record type across the cohort
          </p>
        </div>
        <Select
          value={selectedCohort}
          onChange={(e) => setSelectedCohort(e.target.value)}
          options={cohorts.map((c) => ({ value: c.id, label: c.name }))}
          className="w-56"
        />
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
