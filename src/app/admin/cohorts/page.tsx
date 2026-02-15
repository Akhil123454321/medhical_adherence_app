"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import CohortForm from "@/components/admin/CohortForm";
import { mockCohorts } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { Cohort } from "@/lib/types";
import { Plus, Calendar, MapPin, Users } from "lucide-react";

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>(mockCohorts);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);

  function handleCreate(data: {
    name: string;
    institution: string;
    startDate: string;
    endDate: string;
    description: string;
    capRangeStart: number;
    capRangeEnd: number;
  }) {
    const newCohort: Cohort = {
      id: `cohort-${Date.now()}`,
      ...data,
      status: "upcoming",
      participantCount: 0,
      questionIds: [],
    };
    setCohorts([...cohorts, newCohort]);
    setShowCreateModal(false);
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
            </div>
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400">
                Caps {cohort.capRangeStart} - {cohort.capRangeEnd}
              </p>
            </div>
          </Card>
        ))}
      </div>

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

      <Modal
        open={!!selectedCohort}
        onClose={() => setSelectedCohort(null)}
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
                <p className="text-gray-900">
                  {formatDate(selectedCohort.startDate)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">End Date</p>
                <p className="text-gray-900">
                  {formatDate(selectedCohort.endDate)}
                </p>
              </div>
            </div>
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
                <p className="text-sm font-medium text-gray-500">
                  Participants
                </p>
                <p className="text-gray-900">
                  {selectedCohort.participantCount}
                </p>
              </div>
            </div>
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
