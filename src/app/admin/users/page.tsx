"use client";

import { useState, useMemo } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { mockUsers, mockCohorts } from "@/lib/mock-data";
import { User } from "@/lib/types";
import { ROLE_LABELS } from "@/constants";

const roleVariant: Record<string, "info" | "success" | "warning" | "default"> = {
  admin: "default",
  patient: "info",
  chw: "warning",
};

export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState("all");
  const [cohortFilter, setCohortFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filteredUsers = useMemo(() => {
    return mockUsers.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (cohortFilter !== "all" && user.cohortId !== cohortFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName =
          `${user.firstName} ${user.lastName}`.toLowerCase();
        if (!fullName.includes(query) && !user.email.toLowerCase().includes(query))
          return false;
      }
      return true;
    });
  }, [roleFilter, cohortFilter, searchQuery]);

  function getUserName(userId: string | null): string {
    if (!userId) return "—";
    const user = mockUsers.find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : userId;
  }

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
            {filteredUsers.length} users
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
                <th className="px-3 py-3 font-medium text-gray-500">
                  Paired With
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const cohort = mockCohorts.find(
                  (c) => c.id === user.cohortId
                );
                return (
                  <tr
                    key={user.id}
                    className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                    onClick={() => setSelectedUser(user)}
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
                      {user.dosingRegimen
                        ? `${user.dosingRegimen} daily`
                        : "—"}
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
        onClose={() => setSelectedUser(null)}
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
                <p className="text-sm font-medium text-gray-500">Role</p>
                <Badge variant={roleVariant[selectedUser.role]}>
                  {ROLE_LABELS[selectedUser.role]}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Cohort</p>
                <p className="text-gray-900">
                  {mockCohorts.find((c) => c.id === selectedUser.cohortId)
                    ?.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Cap ID</p>
                <p className="text-gray-900">
                  {selectedUser.capId ? `#${selectedUser.capId}` : "—"}
                </p>
              </div>
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
            <div>
              <p className="text-sm font-medium text-gray-500">
                {selectedUser.role === "chw"
                  ? "Assigned Patient"
                  : "Assigned CHW"}
              </p>
              <p className="text-gray-900">
                {getUserName(
                  selectedUser.role === "chw"
                    ? selectedUser.assignedPatientId
                    : selectedUser.assignedChwId
                )}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
