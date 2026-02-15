"use client";

import StatsCard from "@/components/ui/StatsCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { FlaskConical, Package, Users, TrendingUp } from "lucide-react";
import {
  mockCohorts,
  mockCaps,
  mockUsers,
  mockAdherenceRecords,
  mockActivity,
} from "@/lib/mock-data";
import { formatDateTime } from "@/lib/utils";

const activityTypeColors: Record<string, "info" | "success" | "warning" | "default"> = {
  cohort: "info",
  user: "success",
  cap: "warning",
  system: "default",
};

export default function DashboardPage() {
  const totalCaps = mockCaps.length;
  const activeCaps = mockCaps.filter((c) => c.status === "assigned").length;
  const totalUsers = mockUsers.length;
  const activeCohorts = mockCohorts.filter((c) => c.status === "active").length;

  const totalRecords = mockAdherenceRecords.length;
  const capOpenedCount = mockAdherenceRecords.filter((r) => r.capOpened).length;
  const adherenceRate =
    totalRecords > 0 ? Math.round((capOpenedCount / totalRecords) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your medication adherence tracking system
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Cohorts"
          value={activeCohorts}
          icon={FlaskConical}
          trend={`${mockCohorts.length} total`}
          trendUp
        />
        <StatsCard
          title="Active Caps"
          value={activeCaps}
          icon={Package}
          trend={`${totalCaps} total`}
          trendUp
        />
        <StatsCard
          title="Total Users"
          value={totalUsers}
          icon={Users}
        />
        <StatsCard
          title="Adherence Rate"
          value={`${adherenceRate}%`}
          icon={TrendingUp}
          trend="Based on cap data"
          trendUp={adherenceRate >= 80}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Active Cohorts
          </h3>
          <div className="space-y-3">
            {mockCohorts.map((cohort) => (
              <div
                key={cohort.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
              >
                <div>
                  <p className="font-medium text-gray-900">{cohort.name}</p>
                  <p className="text-sm text-gray-500">{cohort.institution}</p>
                </div>
                <Badge
                  variant={
                    cohort.status === "active"
                      ? "success"
                      : cohort.status === "upcoming"
                        ? "info"
                        : "default"
                  }
                >
                  {cohort.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {mockActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg border border-gray-100 p-3"
              >
                <Badge variant={activityTypeColors[item.type]}>
                  {item.type}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{item.message}</p>
                  <p className="text-xs text-gray-400">
                    {formatDateTime(item.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
