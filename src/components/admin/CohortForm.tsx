"use client";

import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react";

interface ParsedStudent {
  name: string;
  email: string;
  role: "patient" | "chw";
  vialNumber: string | null;
  dosing: "2x" | "3x" | null;
  chwEmail: string | null;
}

interface CohortFormProps {
  onSubmit: (data: {
    name: string;
    institution: string;
    startDate: string;
    endDate: string;
    description: string;
    capRangeStart: number;
    capRangeEnd: number;
    patientEmails: string[];
    chwEmails: string[];
    students: ParsedStudent[];
  }) => void;
  onCancel: () => void;
}

function parseEmails(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export default function CohortForm({ onSubmit, onCancel }: CohortFormProps) {
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [capRangeStart, setCapRangeStart] = useState("");
  const [capRangeEnd, setCapRangeEnd] = useState("");
  const [patientEmailsText, setPatientEmailsText] = useState("");
  const [chwEmailsText, setChwEmailsText] = useState("");

  // CSV/XLSX import state
  const [importedStudents, setImportedStudents] = useState<ParsedStudent[]>([]);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/cohorts/parse-import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error || "Failed to parse file");
        return;
      }
      setImportedStudents(data.students);
      setImportFileName(file.name);
      // Auto-fill cap range if detected
      if (data.capRangeStart != null) setCapRangeStart(String(data.capRangeStart));
      if (data.capRangeEnd != null) setCapRangeEnd(String(data.capRangeEnd));
    } catch {
      setImportError("Network error uploading file");
    } finally {
      setImportLoading(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function clearImport() {
    setImportedStudents([]);
    setImportFileName(null);
    setImportError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      institution,
      startDate,
      endDate,
      description,
      capRangeStart: parseInt(capRangeStart) || 0,
      capRangeEnd: parseInt(capRangeEnd) || 0,
      patientEmails: importedStudents.length > 0 ? [] : parseEmails(patientEmailsText),
      chwEmails: importedStudents.length > 0 ? [] : parseEmails(chwEmailsText),
      students: importedStudents,
    });
  }

  const patients = importedStudents.filter((s) => s.role === "patient");
  const chws = importedStudents.filter((s) => s.role === "chw");

  const textareaClass =
    "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="cohort-name"
        label="Cohort Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., IU Med School Pilot"
        required
      />
      <Input
        id="institution"
        label="Institution"
        value={institution}
        onChange={(e) => setInstitution(e.target.value)}
        placeholder="e.g., IU School of Medicine"
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          id="start-date"
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
        <Input
          id="end-date"
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          id="cap-start"
          label="Cap Range Start"
          type="number"
          value={capRangeStart}
          onChange={(e) => setCapRangeStart(e.target.value)}
          placeholder="1"
        />
        <Input
          id="cap-end"
          label="Cap Range End"
          type="number"
          value={capRangeEnd}
          onChange={(e) => setCapRangeEnd(e.target.value)}
          placeholder="91"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          rows={2}
          placeholder="Describe this cohort…"
        />
      </div>

      {/* Participant section */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Participants
          </p>
          {/* Upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importLoading}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {importLoading ? "Parsing…" : "Upload CSV / XLSX"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
            disabled={importLoading}
          />
        </div>

        {importError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {importError}
          </div>
        )}

        {importedStudents.length > 0 ? (
          /* Imported preview */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-green-700">
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="font-medium">{importFileName}</span>
                <span className="text-gray-400">—</span>
                <span>{patients.length} patients, {chws.length} CHWs</span>
              </div>
              <button
                type="button"
                onClick={clearImport}
                className="rounded p-0.5 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Email</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Role</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Dosing</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Cap</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">CHW</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {importedStudents.map((s) => (
                    <tr key={s.email} className={s.role === "chw" ? "bg-blue-50/40" : ""}>
                      <td className="px-3 py-1.5 font-mono text-gray-700">{s.email}</td>
                      <td className="px-3 py-1.5">
                        <span className={`rounded-full px-1.5 py-0.5 font-medium ${
                          s.role === "chw"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {s.role === "chw" ? "CHW" : "Patient"}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">
                        {s.dosing === "2x" ? "BID" : s.dosing === "3x" ? "TID" : "—"}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">
                        {s.vialNumber ?? <span className="text-gray-300">app only</span>}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-gray-400 truncate max-w-[120px]">
                        {s.chwEmail ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400">
              Dosing regimens, cap assignments, and CHW pairings will be set automatically.
            </p>
          </div>
        ) : (
          /* Manual entry fallback */
          <div className="space-y-4">
            <p className="text-xs text-gray-400">
              Or enter emails manually below — upload CSV/XLSX above to auto-fill from a spreadsheet.
            </p>
            <div className="space-y-1">
              <label htmlFor="patient-emails" className="block text-sm font-medium text-gray-700">
                Patient emails
                <span className="ml-1 font-normal text-gray-400">(one per line or comma-separated)</span>
              </label>
              <textarea
                id="patient-emails"
                value={patientEmailsText}
                onChange={(e) => setPatientEmailsText(e.target.value)}
                className={textareaClass}
                rows={3}
                placeholder={"alice@example.com\nbob@example.com"}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="chw-emails" className="block text-sm font-medium text-gray-700">
                CHW emails
                <span className="ml-1 font-normal text-gray-400">(one per line or comma-separated)</span>
              </label>
              <textarea
                id="chw-emails"
                value={chwEmailsText}
                onChange={(e) => setChwEmailsText(e.target.value)}
                className={textareaClass}
                rows={3}
                placeholder={"carol@example.com\ndave@example.com"}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Cohort</Button>
      </div>
    </form>
  );
}
