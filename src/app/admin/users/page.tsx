"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { User, UserRole, Cohort, Cap } from "@/lib/types";
import { ROLE_LABELS } from "@/constants";
import { Upload, CheckCircle, AlertCircle, SkipForward, Wrench } from "lucide-react";

// ---------------------------------------------------------------------------
// CSV parsing helpers
// ---------------------------------------------------------------------------

interface ImportRow {
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

type ParsedResult = { rows: ImportRow[]; parseError: string | null };

function parseCSV(text: string): ParsedResult {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { rows: [], parseError: "File must have a header row and at least one data row." };

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

  // Detect column indices
  const emailIdx = header.findIndex((h) => h === "email");
  const roleIdx = header.findIndex((h) => h === "role");
  const firstIdx = header.findIndex((h) => h.includes("first"));
  const lastIdx = header.findIndex((h) => h.includes("last"));

  if (emailIdx === -1 || roleIdx === -1) {
    return {
      rows: [],
      parseError: `Missing required columns. Found: ${header.join(", ")}. Need at least "email" and "role".`,
    };
  }

  const rows: ImportRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const email = cols[emailIdx] ?? "";
    const role = cols[roleIdx] ?? "";
    const firstName = firstIdx !== -1 ? cols[firstIdx] : undefined;
    const lastName = lastIdx !== -1 ? cols[lastIdx] : undefined;
    if (email) rows.push({ email, role, firstName, lastName });
  }

  return { rows, parseError: null };
}

const roleVariant: Record<string, "info" | "success" | "warning" | "default"> = {
  admin: "default",
  patient: "info",
  chw: "warning",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [cohortFilter, setCohortFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Edit state
  const [editEmail, setEditEmail] = useState<string>("");
  const [editRole, setEditRole] = useState<UserRole>("patient");
  const [editChwId, setEditChwId] = useState<string>("");
  const [editPatientId, setEditPatientId] = useState<string>("");
  const [editDosing, setEditDosing] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [editCapId, setEditCapId] = useState<string>("");
  const [caps, setCaps] = useState<Cap[]>([]);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<string>("");

  // ---------- Bulk import state ----------
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importParseError, setImportParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: string[];
    skipped: string[];
    errors: { email: string; reason: string }[];
  } | null>(null);

  function openImportModal() {
    setImportRows([]);
    setImportParseError("");
    setImportResult(null);
    setImportModalOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, parseError } = parseCSV(text);
      setImportRows(rows);
      setImportParseError(parseError ?? "");
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-selected if needed
    e.target.value = "";
  }

  async function confirmImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/users/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importRows),
      });
      const data = await res.json();
      setImportResult(data);
      // Refresh user list
      const updated = await fetch("/api/users").then((r) => r.json());
      setUsers(updated);
    } catch {
      setImportParseError("Network error — please try again.");
    } finally {
      setImporting(false);
    }
  }
  // ---------------------------------------

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/cohorts").then((r) => r.json()),
      fetch("/api/caps").then((r) => r.json()),
    ])
      .then(([usersData, cohortsData, capsData]: [User[], Cohort[], Cap[]]) => {
        setUsers(usersData);
        setCohorts(cohortsData);
        setCaps(capsData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (cohortFilter !== "all" && user.cohortId !== cohortFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        if (!fullName.includes(query) && !user.email.toLowerCase().includes(query))
          return false;
      }
      return true;
    });
  }, [users, roleFilter, cohortFilter, searchQuery]);

  const chws = useMemo(() => users.filter((u) => u.role === "chw"), [users]);
  const patients = useMemo(() => users.filter((u) => u.role === "patient"), [users]);

  function getUserName(userId: string | null): string {
    if (!userId) return "—";
    const user = users.find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : userId;
  }

  function openModal(user: User) {
    setSelectedUser(user);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditChwId(user.assignedChwId ?? "");
    setEditPatientId(user.assignedPatientId ?? "");
    setEditDosing(user.dosingRegimen ?? "");
    setEditCapId(user.capId ? String(user.capId) : "");
    setSaveError("");
    setSaveSuccess(false);
    setResetSuccess(false);
  }

  function closeModal() {
    setSelectedUser(null);
    setSaveError("");
    setSaveSuccess(false);
  }

  async function saveChanges() {
    if (!selectedUser) return;
    setSaving(true);
    setSaveError("");

    const body: Record<string, unknown> = {
      email: editEmail.trim(),
      role: editRole,
      dosingRegimen: editDosing || null,
      capId: editCapId ? parseInt(editCapId, 10) : null,
    };
    if (editRole === "patient") {
      body.assignedChwId = editChwId || null;
      body.assignedPatientId = null;
    } else if (editRole === "chw") {
      body.assignedPatientId = editPatientId || null;
      body.assignedChwId = null;
    } else {
      body.assignedChwId = null;
      body.assignedPatientId = null;
    }

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        setSaveError(err.error ?? "Failed to save");
        return;
      }
      const updated: User = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setSelectedUser(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  }

  const isDirty =
    selectedUser &&
    (editEmail.trim() !== selectedUser.email ||
      editRole !== selectedUser.role ||
      (editChwId || null) !== selectedUser.assignedChwId ||
      (editPatientId || null) !== selectedUser.assignedPatientId ||
      (editDosing || null) !== selectedUser.dosingRegimen ||
      (editCapId ? parseInt(editCapId, 10): null) !== selectedUser.capId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage all users across cohorts
          </p>
        </div>
        <div className="flex items-center gap-2">
          {repairResult && (
            <span className="text-xs text-green-700">{repairResult}</span>
          )}
          <button
            onClick={async () => {
              setRepairing(true);
              setRepairResult("");
              try {
                const res = await fetch("/api/admin/repair-assignments", { method: "POST" });
                const data = await res.json();
                if (res.ok) {
                  setRepairResult(`Fixed ${data.chwPatientLinksFixed} CHW links, ${data.capAssignmentsFixed} cap assignments`);
                  const updated = await fetch("/api/users").then((r) => r.json());
                  setUsers(updated);
                } else {
                  setRepairResult(data.error ?? "Repair failed");
                }
              } finally {
                setRepairing(false);
              }
            }}
            disabled={repairing}
            title="Sync CHW-patient links and cap assignments from user records"
            className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-60 transition-colors"
          >
            <Wrench className="h-4 w-4" />
            {repairing ? "Repairing…" : "Repair Assignments"}
          </button>
          <button
            onClick={openImportModal}
            className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: "all", label: "All Roles" },
              { value: "patient", label: "Patient" },
              { value: "chw", label: "CHW" },
              { value: "admin", label: "Admin" },
            ]}
            className="w-36"
          />
          <Select
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
            options={[
              { value: "all", label: "All Cohorts" },
              ...cohorts.map((c) => ({
                value: c.id,
                label: c.name,
              })),
            ]}
            className="w-48"
          />
          <span className="text-sm text-gray-400">
            {loading ? "Loading..." : `${filteredUsers.length} users`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-3 font-medium text-gray-500">Name</th>
                <th className="px-3 py-3 font-medium text-gray-500">Email</th>
                <th className="px-3 py-3 font-medium text-gray-500">Role</th>
                <th className="px-3 py-3 font-medium text-gray-500">Cohort</th>
                <th className="px-3 py-3 font-medium text-gray-500">Cap ID</th>
                <th className="px-3 py-3 font-medium text-gray-500">Dosing</th>
                <th className="px-3 py-3 font-medium text-gray-500">Paired With</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const cohort = cohorts.find((c) => c.id === user.cohortId);
                return (
                  <tr
                    key={user.id}
                    className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                    onClick={() => openModal(user)}
                  >
                    <td className="px-3 py-2.5 font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">{user.email}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={roleVariant[user.role]}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">
                      {cohort?.name || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">
                      {user.capId ? `#${user.capId}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">
                      {user.dosingRegimen ? `${user.dosingRegimen} daily` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">
                      {getUserName(
                        user.role === "chw"
                          ? user.assignedPatientId
                          : user.assignedChwId
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={!!selectedUser}
        onClose={closeModal}
        title={
          selectedUser
            ? `${selectedUser.firstName} ${selectedUser.lastName}`
            : ""
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1.5 text-sm font-medium text-gray-500">Email</p>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Cohort</p>
                <p className="text-gray-900">
                  {cohorts.find((c) => c.id === selectedUser.cohortId)
                    ?.name || "—"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Cap / Vial #</p>
                <Input
                  placeholder="e.g. 30"
                  value={editCapId}
                  onChange={(e) => setEditCapId(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              {selectedUser.dosingRegimen && (
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Dosing Regimen
                  </p>
                  <p className="text-gray-900">
                    {selectedUser.dosingRegimen} daily
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="mb-3 text-sm font-semibold text-gray-700">
                Edit Role &amp; Assignment
              </p>
              <div className="space-y-3">
                <Select
                  label="Role"
                  value={editRole}
                  onChange={(e) => {
                    setEditRole(e.target.value as UserRole);
                    setEditChwId("");
                    setEditPatientId("");
                  }}
                  options={[
                    { value: "patient", label: "Patient" },
                    { value: "chw", label: "CHW" },
                    { value: "admin", label: "Admin" },
                  ]}
                />

                <Select
                  label="Dosing Frequency"
                  value={editDosing}
                  onChange={(e) => setEditDosing(e.target.value)}
                  options={[
                    { value: "", label: "Not assigned" },
                    { value: "1x", label: "1x daily" },
                    { value: "2x", label: "2x daily" },
                    { value: "3x", label: "3x daily" },
                  ]}
                />

                {editRole === "patient" && (
                  <Select
                    label="Assigned CHW"
                    value={editChwId}
                    onChange={(e) => setEditChwId(e.target.value)}
                    options={[
                      { value: "", label: "None" },
                      ...chws.map((u) => ({
                        value: u.id,
                        label: `${u.firstName} ${u.lastName}`,
                      })),
                    ]}
                  />
                )}

                {editRole === "chw" && (
                  <Select
                    label="Assigned Patient"
                    value={editPatientId}
                    onChange={(e) => setEditPatientId(e.target.value)}
                    options={[
                      { value: "", label: "None" },
                      ...patients.map((u) => ({
                        value: u.id,
                        label: `${u.firstName} ${u.lastName}`,
                      })),
                    ]}
                  />
                )}
              </div>
            </div>

            {/* Reset Onboarding */}
            {selectedUser.role !== "admin" && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                <p className="mb-1.5 text-xs font-semibold text-red-700">
                  Reset Onboarding
                </p>
                <p className="mb-2 text-xs text-red-600">
                  Sets firstLoginComplete to false and deletes their survey responses. They will be sent through onboarding again on next login.
                </p>
                {resetSuccess && (
                  <p className="mb-2 text-xs text-green-700 font-medium">
                    ✓ Onboarding reset. User will re-complete onboarding on next login.
                  </p>
                )}
                <button
                  onClick={async () => {
                    if (!selectedUser) return;
                    setResetting(true);
                    setResetSuccess(false);
                    try {
                      const res = await fetch(`/api/admin/reset-onboarding/${selectedUser.id}`, { method: "POST" });
                      if (res.ok) {
                        setUsers((prev) =>
                          prev.map((u) =>
                            u.id === selectedUser.id ? { ...u, firstLoginComplete: false } : u
                          )
                        );
                        setSelectedUser((u) => u ? { ...u, firstLoginComplete: false } : u);
                        setResetSuccess(true);
                      }
                    } finally {
                      setResetting(false);
                    }
                  }}
                  disabled={resetting}
                  className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors"
                >
                  {resetting ? "Resetting…" : "Reset Onboarding"}
                </button>
              </div>
            )}

            {saveSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                Changes saved successfully.
              </div>
            )}

            {saveError && (
              <p className="text-sm text-red-600">{saveError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={saveChanges}
                disabled={!isDirty || saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ---- Bulk Import Modal ---- */}
      <Modal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Users from CSV"
      >
        <div className="space-y-4">
          {!importResult ? (
            <>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
                <p className="font-semibold text-gray-700">Required CSV format</p>
                <p>Columns: <code className="rounded bg-white px-1 py-0.5 border border-gray-200">email</code>, <code className="rounded bg-white px-1 py-0.5 border border-gray-200">role</code> (patient or chw)</p>
                <p>Optional columns: <code className="rounded bg-white px-1 py-0.5 border border-gray-200">first name</code>, <code className="rounded bg-white px-1 py-0.5 border border-gray-200">last name</code></p>
                <p className="text-gray-400">If first/last name are missing, they will be derived from the email address.</p>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  <Upload className="h-5 w-5" />
                  {importRows.length > 0
                    ? `${importRows.length} rows loaded — click to replace`
                    : "Click to select a CSV file"}
                </button>
              </div>

              {importParseError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {importParseError}
                </div>
              )}

              {importRows.length > 0 && !importParseError && (
                <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="border-b border-gray-200">
                        <th className="px-3 py-2 font-medium text-gray-500">Email</th>
                        <th className="px-3 py-2 font-medium text-gray-500">Role</th>
                        <th className="px-3 py-2 font-medium text-gray-500">Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((row, i) => {
                        const invalid = row.role !== "patient" && row.role !== "chw";
                        return (
                          <tr key={i} className={`border-b border-gray-100 ${invalid ? "bg-red-50" : ""}`}>
                            <td className="px-3 py-1.5 text-gray-700">{row.email}</td>
                            <td className={`px-3 py-1.5 font-medium ${invalid ? "text-red-600" : "text-gray-700"}`}>
                              {row.role || <span className="text-red-400 italic">missing</span>}
                            </td>
                            <td className="px-3 py-1.5 text-gray-400">
                              {[row.firstName, row.lastName].filter(Boolean).join(" ") || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setImportModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmImport}
                  disabled={importRows.length === 0 || !!importParseError || importing}
                >
                  {importing ? "Importing…" : `Import ${importRows.length} users`}
                </Button>
              </div>
            </>
          ) : (
            /* Results screen */
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                  <CheckCircle className="mx-auto mb-1 h-5 w-5 text-green-600" />
                  <p className="text-lg font-bold text-green-800">{importResult.created.length}</p>
                  <p className="text-xs text-green-600">Created</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
                  <SkipForward className="mx-auto mb-1 h-5 w-5 text-gray-400" />
                  <p className="text-lg font-bold text-gray-600">{importResult.skipped.length}</p>
                  <p className="text-xs text-gray-400">Already existed</p>
                </div>
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-center">
                  <AlertCircle className="mx-auto mb-1 h-5 w-5 text-red-400" />
                  <p className="text-lg font-bold text-red-700">{importResult.errors.length}</p>
                  <p className="text-xs text-red-400">Errors</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 space-y-1">
                  <p className="text-xs font-semibold text-red-700">Errors</p>
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">{e.email}: {e.reason}</p>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-400">
                New accounts will receive a verification email when you send one from the Users list.
              </p>

              <div className="flex justify-end">
                <Button onClick={() => setImportModalOpen(false)}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
