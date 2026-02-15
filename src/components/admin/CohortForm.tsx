"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface CohortFormProps {
  onSubmit: (data: {
    name: string;
    institution: string;
    startDate: string;
    endDate: string;
    description: string;
    capRangeStart: number;
    capRangeEnd: number;
  }) => void;
  onCancel: () => void;
}

export default function CohortForm({ onSubmit, onCancel }: CohortFormProps) {
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [capRangeStart, setCapRangeStart] = useState("");
  const [capRangeEnd, setCapRangeEnd] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      institution,
      startDate,
      endDate,
      description,
      capRangeStart: parseInt(capRangeStart),
      capRangeEnd: parseInt(capRangeEnd),
    });
  }

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
          required
        />
        <Input
          id="cap-end"
          label="Cap Range End"
          type="number"
          value={capRangeEnd}
          onChange={(e) => setCapRangeEnd(e.target.value)}
          placeholder="91"
          required
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          rows={3}
          placeholder="Describe this cohort..."
        />
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
