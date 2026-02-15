"use client";

import { useState, useMemo } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatsCard from "@/components/ui/StatsCard";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { mockCaps } from "@/lib/mock-data";
import { Cap } from "@/lib/types";
import { Package, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

const statusVariant: Record<string, "success" | "info" | "danger" | "default"> = {
  available: "success",
  assigned: "info",
  broken: "danger",
};

export default function CapsPage() {
  const [caps, setCaps] = useState<Cap[]>(mockCaps);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCaps, setSelectedCaps] = useState<Set<number>>(new Set());

  const stats = useMemo(() => {
    const available = caps.filter((c) => c.status === "available").length;
    const assigned = caps.filter((c) => c.status === "assigned").length;
    const broken = caps.filter((c) => c.status === "broken").length;
    return { total: caps.length, available, assigned, broken };
  }, [caps]);

  const filteredCaps = useMemo(() => {
    return caps.filter((cap) => {
      if (statusFilter !== "all" && cap.status !== statusFilter) return false;
      if (searchQuery && !cap.id.toString().includes(searchQuery)) return false;
      return true;
    });
  }, [caps, statusFilter, searchQuery]);

  function toggleCapSelection(capId: number) {
    setSelectedCaps((prev) => {
      const next = new Set(prev);
      if (next.has(capId)) {
        next.delete(capId);
      } else {
        next.add(capId);
      }
      return next;
    });
  }

  function bulkUpdateStatus(newStatus: Cap["status"]) {
    setCaps((prev) =>
      prev.map((cap) =>
        selectedCaps.has(cap.id)
          ? { ...cap, status: newStatus, assignedTo: null, cohortId: null }
          : cap
      )
    );
    setSelectedCaps(new Set());
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cap Inventory</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage and track vial cap inventory
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Caps" value={stats.total} icon={Package} />
        <StatsCard
          title="Available"
          value={stats.available}
          icon={CheckCircle}
        />
        <StatsCard
          title="Assigned"
          value={stats.assigned}
          icon={AlertTriangle}
        />
        <StatsCard title="Broken" value={stats.broken} icon={XCircle} />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <Input
            placeholder="Search by cap ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "All Status" },
              { value: "available", label: "Available" },
              { value: "assigned", label: "Assigned" },
              { value: "broken", label: "Broken" },
            ]}
            className="w-40"
          />
          {selectedCaps.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {selectedCaps.size} selected
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => bulkUpdateStatus("available")}
              >
                Mark Available
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => bulkUpdateStatus("broken")}
              >
                Mark Broken
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-3 font-medium text-gray-500">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCaps(
                          new Set(filteredCaps.map((c) => c.id))
                        );
                      } else {
                        setSelectedCaps(new Set());
                      }
                    }}
                    checked={
                      filteredCaps.length > 0 &&
                      filteredCaps.every((c) => selectedCaps.has(c.id))
                    }
                  />
                </th>
                <th className="px-3 py-3 font-medium text-gray-500">Cap ID</th>
                <th className="px-3 py-3 font-medium text-gray-500">Status</th>
                <th className="px-3 py-3 font-medium text-gray-500">
                  Assigned To
                </th>
                <th className="px-3 py-3 font-medium text-gray-500">Cohort</th>
              </tr>
            </thead>
            <tbody>
              {filteredCaps.slice(0, 50).map((cap) => (
                <tr
                  key={cap.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selectedCaps.has(cap.id)}
                      onChange={() => toggleCapSelection(cap.id)}
                    />
                  </td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">
                    #{cap.id}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={statusVariant[cap.status]}>
                      {cap.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">
                    {cap.assignedTo || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">
                    {cap.cohortId || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCaps.length > 50 && (
            <p className="mt-3 text-center text-sm text-gray-400">
              Showing 50 of {filteredCaps.length} caps
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
