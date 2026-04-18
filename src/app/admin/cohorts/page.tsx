"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import CohortForm from "@/components/admin/CohortForm";
import { formatDate } from "@/lib/utils";
import { Cohort } from "@/lib/types";
import { Plus, Calendar, MapPin, Users, Key, Pencil } from "lucide-react";

interface CreatedUser {
  email: string;
  role: string;
  dosing?: string | null;
}

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [createdUsers, setCreatedUsers] = useState<CreatedUser[]>([]);
  const [showCredentials, setShowCredentials] = useState(false);
  const [editingDates, setEditingDates] = useState(false);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [savingDates, setSavingDates] = useState(false);

  useEffect(() => {
    fetch("/api/cohorts")
      .then((r) => r.json())
      .then((data) => setCohorts(Array.isArray(data) ? data : []))
      .catch(() => setCohorts([]));
  }, []);

  async function handleCreate(data: {
    name: string;
    institution: string;
    startDate: string;
    endDate: string;
    description: string;
    capRangeStart: number;
    capRangeEnd: number;
    patientEmails: string[];
    chwEmails: string[];
    students: unknown[];
  }) {
    const res = await fetch("/api/cohorts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const { cohort, createdUsers: newUsers } = await res.json();
      setCohorts((prev) => [...prev, cohort]);
      setShowCreateModal(false);
      if (newUsers && newUsers.length > 0) {
        setCreatedUsers(newUsers);
        setShowCredentials(true);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Cohort Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage experiment cohorts
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Create Cohort
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {cohorts.map((cohort) => (
          <Card
            key={cohort.id}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => setSelectedCohort(cohort)}
          >
            <div className="mb-3 flex items-start justify-between">
              <h3 className="font-semibold text-gray-900">{cohort.name}</h3>
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
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {cohort.institution}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(cohort.startDate)} - {formatDate(cohort.endDate)}
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {cohort.participantCount} participants
              </div>
              {cohort.emails && cohort.emails.length > 0 && (
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  {cohort.emails.length} email{cohort.emails.length !== 1 ? "s" : ""} enrolled
                </div>
              )}
            </div>
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400">
                Caps {cohort.capRangeStart} - {cohort.capRangeEnd}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Create modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Cohort"
      >
        <CohortForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Credentials modal (shown after cohort created with emails) */}
      <Modal
        open={showCredentials}
        onClose={() => setShowCredentials(false)}
        title="Cohort Created — Share Credentials"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            The following accounts were created. Share these credentials with participants.
          </p>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Dosing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {createdUsers.map((u) => (
                  <tr key={u.email}>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{u.email}</td>
                    <td className="px-4 py-2.5 text-xs capitalize text-gray-700">{u.role}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {u.dosing === "2x" ? "BID" : u.dosing === "3x" ? "TID" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-amber-600">
            Users log in with their email address only — no password needed.
            They will be prompted for survey questions on first login.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => setShowCredentials(false)}>Done</Button>
          </div>
        </div>
      </Modal>

      {/* Cohort detail modal */}
      <Modal
        open={!!selectedCohort}
        onClose={() => { setSelectedCohort(null); setEditingDates(false); }}
        title={selectedCohort?.name || ""}
      >
        {selectedCohort && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Institution</p>
              <p className="text-gray-900">{selectedCohort.institution}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Start Date</p>
                {editingDates ? (
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                ) : (
                  <p className="text-gray-900">{formatDate(selectedCohort.startDate)}</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">End Date</p>
                {editingDates ? (
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                ) : (
                  <p className="text-gray-900">{formatDate(selectedCohort.endDate)}</p>
                )}
              </div>
            </div>
            {editingDates ? (
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setSavingDates(true);
                    const res = await fetch(`/api/cohorts/${selectedCohort.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ startDate: editStartDate, endDate: editEndDate }),
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      setCohorts((prev) => prev.map((c) => c.id === updated.id ? updated : c));
                      setSelectedCohort(updated);
                    }
                    setSavingDates(false);
                    setEditingDates(false);
                  }}
                  disabled={savingDates}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {savingDates ? "Saving…" : "Save dates"}
                </button>
                <button
                  onClick={() => setEditingDates(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditStartDate(selectedCohort.startDate);
                  setEditEndDate(selectedCohort.endDate);
                  setEditingDates(true);
                }}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit dates
              </button>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Description</p>
              <p className="text-gray-900">{selectedCohort.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Cap Range</p>
                <p className="text-gray-900">
                  {selectedCohort.capRangeStart} - {selectedCohort.capRangeEnd}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Participants</p>
                <p className="text-gray-900">{selectedCohort.participantCount}</p>
              </div>
            </div>
            {selectedCohort.emails && selectedCohort.emails.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Enrolled Emails</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedCohort.emails.map((email) => (
                    <p key={email} className="text-sm font-mono text-gray-700">{email}</p>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <Badge
                variant={
                  selectedCohort.status === "active"
                    ? "success"
                    : selectedCohort.status === "upcoming"
                      ? "info"
                      : "default"
                }
              >
                {selectedCohort.status}
              </Badge>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
