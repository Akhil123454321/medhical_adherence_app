"use client";

import { useState, useMemo } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import StatsCard from "@/components/ui/StatsCard";
import Button from "@/components/ui/Button";
import AdherenceChart from "@/components/admin/AdherenceChart";
import {
  mockCohorts,
  mockAdherenceRecords,
  mockUsers,
} from "@/lib/mock-data";
import { TrendingUp, TrendingDown, BarChart3, Activity } from "lucide-react";

export default function DataPage() {
  const [selectedCohort, setSelectedCohort] = useState("cohort-1");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  const cohortUsers = useMemo(
    () => mockUsers.filter((u) => u.cohortId === selectedCohort && u.role === "patient"),
    [selectedCohort]
  );

  const cohortRecords = useMemo(
    () =>
      mockAdherenceRecords.filter((r) =>
        cohortUsers.some((u) => u.id === r.userId)
      ),
    [cohortUsers]
  );

  const dailyData = useMemo(() => {
    const byDate: Record<
      string,
      { total: number; selfReported: number; capOpened: number }
    > = {};

    cohortRecords.forEach((r) => {
      if (!byDate[r.date]) {
        byDate[r.date] = { total: 0, selfReported: 0, capOpened: 0 };
      }
      byDate[r.date].total++;
      if (r.selfReported) byDate[r.date].selfReported++;
      if (r.capOpened) byDate[r.date].capOpened++;
    });

    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        selfReported: Math.round((data.selfReported / data.total) * 100),
        capOpened: Math.round((data.capOpened / data.total) * 100),
      }));
  }, [cohortRecords]);

  const overallStats = useMemo(() => {
    if (cohortRecords.length === 0)
      return { selfReported: 0, capOpened: 0, discrepancy: 0 };
    const selfReported =
      (cohortRecords.filter((r) => r.selfReported).length /
        cohortRecords.length) *
      100;
    const capOpened =
      (cohortRecords.filter((r) => r.capOpened).length /
        cohortRecords.length) *
      100;
    return {
      selfReported: Math.round(selfReported),
      capOpened: Math.round(capOpened),
      discrepancy: Math.round(selfReported - capOpened),
    };
  }, [cohortRecords]);

  // Per-user adherence
  const userAdherence = useMemo(() => {
    return cohortUsers.map((user) => {
      const records = cohortRecords.filter((r) => r.userId === user.id);
      const total = records.length;
      const selfReported = records.filter((r) => r.selfReported).length;
      const capOpened = records.filter((r) => r.capOpened).length;
      return {
        ...user,
        totalRecords: total,
        selfReportedRate: total ? Math.round((selfReported / total) * 100) : 0,
        capOpenedRate: total ? Math.round((capOpened / total) * 100) : 0,
      };
    });
  }, [cohortUsers, cohortRecords]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Compare self-reported adherence vs actual cap openings
          </p>
        </div>
        <Select
          value={selectedCohort}
          onChange={(e) => setSelectedCohort(e.target.value)}
          options={mockCohorts.map((c) => ({
            value: c.id,
            label: c.name,
          }))}
          className="w-56"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Self-Reported Rate"
          value={`${overallStats.selfReported}%`}
          icon={TrendingUp}
        />
        <StatsCard
          title="Cap-Opened Rate"
          value={`${overallStats.capOpened}%`}
          icon={Activity}
        />
        <StatsCard
          title="Discrepancy"
          value={`${overallStats.discrepancy > 0 ? "+" : ""}${overallStats.discrepancy}%`}
          icon={TrendingDown}
          trend={
            overallStats.discrepancy > 0
              ? "Self-reported higher"
              : "Cap data higher"
          }
          trendUp={overallStats.discrepancy <= 0}
        />
        <StatsCard
          title="Patients Tracked"
          value={cohortUsers.length}
          icon={BarChart3}
        />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Daily Adherence Comparison
          </h3>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            <Button
              size="sm"
              variant={chartType === "bar" ? "primary" : "ghost"}
              onClick={() => setChartType("bar")}
            >
              Bar
            </Button>
            <Button
              size="sm"
              variant={chartType === "line" ? "primary" : "ghost"}
              onClick={() => setChartType("line")}
            >
              Line
            </Button>
          </div>
        </div>
        <AdherenceChart dailyData={dailyData} chartType={chartType} />
      </Card>

      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Per-User Adherence
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-3 font-medium text-gray-500">Name</th>
                <th className="px-3 py-3 font-medium text-gray-500">Cap ID</th>
                <th className="px-3 py-3 font-medium text-gray-500">Dosing</th>
                <th className="px-3 py-3 font-medium text-gray-500">
                  Self-Reported
                </th>
                <th className="px-3 py-3 font-medium text-gray-500">
                  Cap Opened
                </th>
                <th className="px-3 py-3 font-medium text-gray-500">Match</th>
              </tr>
            </thead>
            <tbody>
              {userAdherence.map((user) => {
                const diff = user.selfReportedRate - user.capOpenedRate;
                return (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2.5 font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">
                      #{user.capId}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">
                      {user.dosingRegimen} daily
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-indigo-600">
                        {user.selfReportedRate}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-emerald-600">
                        {user.capOpenedRate}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant={
                          Math.abs(diff) <= 10
                            ? "success"
                            : diff > 0
                              ? "warning"
                              : "danger"
                        }
                      >
                        {diff > 0 ? `+${diff}%` : `${diff}%`}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
