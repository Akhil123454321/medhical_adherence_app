"use client";

import { useState, useMemo, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { mockCohorts } from "@/lib/mock-data";
import { User, UserRole } from "@/lib/types";
import { ROLE_LABELS } from "@/constants";

const roleVariant: Record<string, "info" | "success" | "warning" | "default"> = {
  admin: "default",
  patient: "info",
  chw: "warning",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [cohortFilter, setCohortFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Edit state
  const [editRole, setEditRole] = useState<UserRole>("patient");
  const [editChwId, setEditChwId] = useState<string>("");
  const [editPatientId, setEditPatientId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: User[]) => {
        setUsers(data);
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
    setEditRole(user.role);
    setEditChwId(user.assignedChwId ?? "");
    setEditPatientId(user.assignedPatientId ?? "");
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

    const body: Record<string, unknown> = { role: editRole };
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
    (editRole !== selectedUser.role ||
      (editChwId || null) !== selectedUser.assignedChwId ||
      (editPatientId || null) !== selectedUser.assignedPatientId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and manage all users across cohorts
        </p>
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
              ...mockCohorts.map((c) => ({
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
                const cohort = mockCohorts.find((c) => c.id === user.cohortId);
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
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-gray-900">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Cohort</p>
                <p className="text-gray-900">
                  {mockCohorts.find((c) => c.id === selectedUser.cohortId)
                    ?.name || "—"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Cap ID</p>
                <p className="text-gray-900">
                  {selectedUser.capId ? `#${selectedUser.capId}` : "—"}
                </p>
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
    </div>
  );
}
