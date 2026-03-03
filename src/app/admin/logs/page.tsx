"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface CapLogEvent {
  event: "opened" | "closed";
  timestamp: string;
}

interface LogData {
  capId: number;
  events: CapLogEvent[];
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function durationBetween(prev: string, curr: string): string {
  const ms = new Date(curr).getTime() - new Date(prev).getTime();
  if (ms < 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export default function LogsPage() {
  const [capIdInput, setCapIdInput] = useState("");
  const [logData, setLogData] = useState<LogData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchLog() {
    const id = capIdInput.trim();
    if (!id) return;
    setLoading(true);
    setError("");
    setLogData(null);

    try {
      const res = await fetch(`/api/cap-logs/${id}`);
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? `Error ${res.status}`);
        return;
      }
      const data: LogData = await res.json();
      setLogData(data);
    } catch {
      setError("Network error — could not fetch log.");
    } finally {
      setLoading(false);
    }
  }

  const openCount = logData?.events.filter((e) => e.event === "opened").length ?? 0;
  const closedCount = logData?.events.filter((e) => e.event === "closed").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cap Event Logs</h1>
        <p className="mt-1 text-sm text-gray-500">
          View open/close event history for a specific cap
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48">
            <Input
              label="Cap ID"
              placeholder="e.g. 1"
              value={capIdInput}
              onChange={(e) => setCapIdInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLog()}
            />
          </div>
          <Button onClick={fetchLog} disabled={loading || !capIdInput.trim()}>
            {loading ? "Loading..." : "View Log"}
          </Button>
        </div>
      </Card>

      {error && (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {logData && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Card className="flex-1 min-w-[140px]">
              <p className="text-sm text-gray-500">Cap</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                #{logData.capId}
              </p>
            </Card>
            <Card className="flex-1 min-w-[140px]">
              <p className="text-sm text-gray-500">Total Events</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {logData.events.length}
              </p>
            </Card>
            <Card className="flex-1 min-w-[140px]">
              <p className="text-sm text-gray-500">Opens</p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                {openCount}
              </p>
            </Card>
            <Card className="flex-1 min-w-[140px]">
              <p className="text-sm text-gray-500">Closes</p>
              <p className="mt-1 text-2xl font-bold text-gray-600">
                {closedCount}
              </p>
            </Card>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-3 font-medium text-gray-500">#</th>
                    <th className="px-3 py-3 font-medium text-gray-500">Event</th>
                    <th className="px-3 py-3 font-medium text-gray-500">Timestamp</th>
                    <th className="px-3 py-3 font-medium text-gray-500">
                      Time Since Previous
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logData.events.map((ev, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-3 py-2.5 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant={ev.event === "opened" ? "success" : "default"}
                        >
                          {ev.event}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-700">
                        {formatTimestamp(ev.timestamp)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-400 text-xs">
                        {i === 0
                          ? "—"
                          : durationBetween(
                              logData.events[i - 1].timestamp,
                              ev.timestamp
                            )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
