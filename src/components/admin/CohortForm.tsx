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
    patientEmails: string[];
    chwEmails: string[];
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
      patientEmails: parseEmails(patientEmailsText),
      chwEmails: parseEmails(chwEmailsText),
    });
  }

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

      {/* Email sections */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Participant Emails — roles are assigned here
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
        <p className="text-xs text-gray-400">
          Users log in with email only — no password required.
        </p>
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
