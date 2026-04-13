"use client";

import { useState, useRef } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Upload, CheckCircle, AlertCircle, FileText } from "lucide-react";

interface CapLogEvent {
  event: "opened" | "closed";
  timestamp: string;
}

interface LogData {
  capId: number;
  events: CapLogEvent[];
}

interface UploadResult {
  uploaded: { capId: number | string; eventsCount: number }[];
  errors?: { name: string; error: string }[];
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
  // ---- Lookup state ----
  const [capIdInput, setCapIdInput] = useState("");
  const [logData, setLogData] = useState<LogData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---- Upload state ----
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState("");

  // ---- MAC mapping state (shown after chip-format upload) ----
  const [vialMappings, setVialMappings] = useState<Record<string, string>>({});
  const [mappingSaving, setMappingSaving] = useState(false);
  const [mappingSaved, setMappingSaved] = useState(false);

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

  function handleUploadFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setUploadFiles(files);
    setUploadResult(null);
    setUploadError("");
    e.target.value = "";
  }

  async function uploadCapFiles() {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    setUploadError("");
    setUploadResult(null);

    try {
      const formData = new FormData();
      uploadFiles.forEach((file, i) => {
        formData.append(`file${i}`, file);
      });

      const res = await fetch("/api/cap-logs/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? `Upload failed (${res.status})`);
        return;
      }
      setUploadResult(data);
      setUploadFiles([]);
      // Pre-populate mapping inputs for chip-format uploads
      const hexUploads = data.uploaded.filter((u: { capId: number | string }) => typeof u.capId === "string");
      if (hexUploads.length > 0) {
        const init: Record<string, string> = {};
        hexUploads.forEach((u: { capId: number | string }) => { init[u.capId as string] = ""; });
        setVialMappings(init);
        setMappingSaved(false);
      } else {
        setVialMappings({});
      }
    } catch {
      setUploadError("Network error — please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function saveMappings() {
    setMappingSaving(true);
    await Promise.all(
      Object.entries(vialMappings)
        .filter(([, vial]) => vial.trim() !== "")
        .map(([mac, vial]) =>
          fetch(`/api/caps/${vial.trim()}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hardwareId: mac }),
          })
        )
    );
    setMappingSaving(false);
    setMappingSaved(true);
    setVialMappings({});
  }

  const openCount = logData?.events.filter((e) => e.event === "opened").length ?? 0;
  const closedCount = logData?.events.filter((e) => e.event === "closed").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cap Event Logs</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload cap data files and view open/close event history
        </p>
      </div>

      {/* ---- Upload Section ---- */}
      <Card>
        <p className="mb-3 text-sm font-semibold text-gray-700">Upload Cap CSV Files</p>
        <p className="mb-4 text-xs text-gray-500">
          Select one or more CSV files from Kyle&apos;s cap collection. Each file must have the cap ID on the first line, followed by <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">event,timestamp</code> rows.
        </p>

        <input
          ref={uploadInputRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          className="hidden"
          onChange={handleUploadFileChange}
        />

        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <Upload className="h-5 w-5" />
          {uploadFiles.length > 0
            ? `${uploadFiles.length} file${uploadFiles.length > 1 ? "s" : ""} selected — click to change`
            : "Click to select CSV files (multiple allowed)"}
        </button>

        {uploadFiles.length > 0 && (
          <ul className="mt-3 space-y-1">
            {uploadFiles.map((f) => (
              <li key={f.name} className="flex items-center gap-2 text-xs text-gray-600">
                <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                {f.name}
              </li>
            ))}
          </ul>
        )}

        {uploadError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {uploadError}
          </div>
        )}

        {uploadResult && (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-green-800">
              <CheckCircle className="h-4 w-4" />
              {uploadResult.uploaded.length} file{uploadResult.uploaded.length !== 1 ? "s" : ""} uploaded successfully
            </div>
            <ul className="space-y-0.5">
              {uploadResult.uploaded.map((u) => (
                <li key={u.capId} className="text-xs text-green-700">
                  Cap #{u.capId} — {u.eventsCount} event{u.eventsCount !== 1 ? "s" : ""}
                </li>
              ))}
            </ul>
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="mt-2 border-t border-green-200 pt-2 space-y-0.5">
                <p className="text-xs font-semibold text-red-700">Errors</p>
                {uploadResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">{e.name}: {e.error}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {Object.keys(vialMappings).length > 0 && !mappingSaved && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-amber-800">Assign MAC addresses to vial numbers</p>
            <p className="text-xs text-amber-700">These files used chip format. Enter the vial # for each MAC address so the data links correctly in exports.</p>
            {Object.entries(vialMappings).map(([mac, vial]) => (
              <div key={mac} className="flex items-center gap-3">
                <span className="font-mono text-xs text-gray-700 w-40 shrink-0">{mac}</span>
                <Input
                  placeholder="Vial # (e.g. 12)"
                  value={vial}
                  onChange={e => setVialMappings(prev => ({ ...prev, [mac]: e.target.value }))}
                  className="w-40"
                />
              </div>
            ))}
            <div className="flex justify-end">
              <Button onClick={saveMappings} disabled={mappingSaving}>
                {mappingSaving ? "Saving…" : "Save Mapping"}
              </Button>
            </div>
          </div>
        )}

        {mappingSaved && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" /> MAC address mapping saved.
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button
            onClick={uploadCapFiles}
            disabled={uploadFiles.length === 0 || uploading}
          >
            {uploading ? "Uploading..." : `Upload ${uploadFiles.length > 0 ? uploadFiles.length + " " : ""}File${uploadFiles.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </Card>

      {/* ---- Lookup Section ---- */}
      <Card>
        <p className="mb-3 text-sm font-semibold text-gray-700">View Cap Log</p>
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
              <p className="mt-1 text-2xl font-bold text-gray-900">#{logData.capId}</p>
            </Card>
            <Card className="flex-1 min-w-[140px]">
              <p className="text-sm text-gray-500">Total Events</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{logData.events.length}</p>
            </Card>
            <Card className="flex-1 min-w-[140px]">
              <p className="text-sm text-gray-500">Opens</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{openCount}</p>
            </Card>
            <Card className="flex-1 min-w-[140px]">
              <p className="text-sm text-gray-500">Closes</p>
              <p className="mt-1 text-2xl font-bold text-gray-600">{closedCount}</p>
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
                    <th className="px-3 py-3 font-medium text-gray-500">Time Since Previous</th>
                  </tr>
                </thead>
                <tbody>
                  {logData.events.map((ev, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={ev.event === "opened" ? "success" : "default"}>
                          {ev.event}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-700">
                        {formatTimestamp(ev.timestamp)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-400 text-xs">
                        {i === 0
                          ? "—"
                          : durationBetween(logData.events[i - 1].timestamp, ev.timestamp)}
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

