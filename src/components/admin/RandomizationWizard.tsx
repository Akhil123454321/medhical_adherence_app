"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import CsvUploader from "./CsvUploader";
import { mockCohorts } from "@/lib/mock-data";
import { randomizeStudents } from "@/lib/randomization";
import { RandomizationResult } from "@/lib/types";
import { ChevronRight, ChevronLeft, Check, Users, Upload } from "lucide-react";

const STEPS = [
  "Select Cohort",
  "Upload Students",
  "Preview Data",
  "Review Results",
];

export default function RandomizationWizard() {
  const [step, setStep] = useState(0);
  const [selectedCohort, setSelectedCohort] = useState("");
  const [parsedStudents, setParsedStudents] = useState<
    Record<string, string>[]
  >([]);
  const [results, setResults] = useState<RandomizationResult[]>([]);

  function handleCsvUpload(data: Record<string, string>[]) {
    setParsedStudents(data);
  }

  function runRandomization() {
    const students = parsedStudents.map((row) => ({
      firstName: row.firstName || row.first_name || row["First Name"] || "",
      lastName: row.lastName || row.last_name || row["Last Name"] || "",
    }));
    const randomized = randomizeStudents(students);
    setResults(randomized);
    setStep(3);
  }

  return (
    <div className="space-y-6">
      {/* Progress steps */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                i <= step
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`hidden text-sm sm:inline ${
                i <= step ? "font-medium text-gray-900" : "text-gray-400"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-gray-300" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Select a Cohort
            </h3>
            <p className="text-sm text-gray-500">
              Choose which cohort to randomize students for.
            </p>
            <Select
              id="cohort-select"
              label="Cohort"
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              options={[
                { value: "", label: "Select a cohort..." },
                ...mockCohorts.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.institution})`,
                })),
              ]}
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Upload Student List
            </h3>
            <p className="text-sm text-gray-500">
              Upload a CSV file with student names. Expected columns: firstName,
              lastName.
            </p>
            <CsvUploader onUpload={handleCsvUpload} />
            {parsedStudents.length > 0 && (
              <p className="text-sm text-green-600">
                {parsedStudents.length} students loaded
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Preview Uploaded Data
            </h3>
            <p className="text-sm text-gray-500">
              Review the parsed student data before randomization.
            </p>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 py-2 font-medium text-gray-500">#</th>
                    <th className="px-3 py-2 font-medium text-gray-500">
                      First Name
                    </th>
                    <th className="px-3 py-2 font-medium text-gray-500">
                      Last Name
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parsedStudents.slice(0, 20).map((s, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 text-gray-900">
                        {s.firstName || s.first_name || s["First Name"] || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-900">
                        {s.lastName || s.last_name || s["Last Name"] || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedStudents.length > 20 && (
              <p className="text-center text-sm text-gray-400">
                Showing 20 of {parsedStudents.length} students
              </p>
            )}
            <div className="rounded-lg bg-indigo-50 p-4">
              <h4 className="text-sm font-medium text-indigo-900">
                Randomization Plan
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-indigo-700">
                <li>
                  <Users className="mr-1 inline h-4 w-4" />
                  {Math.ceil(parsedStudents.length / 3)} patients without CHW
                </li>
                <li>
                  <Users className="mr-1 inline h-4 w-4" />
                  {Math.floor(parsedStudents.length / 3)} patients with CHW
                </li>
                <li>
                  <Users className="mr-1 inline h-4 w-4" />
                  {Math.floor(parsedStudents.length / 3)} CHWs
                </li>
              </ul>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Randomization Results
            </h3>
            <div className="flex gap-4">
              <Badge variant="info">
                {results.filter((r) => r.role === "patient" && !r.pairedWith).length}{" "}
                Patients (no CHW)
              </Badge>
              <Badge variant="success">
                {results.filter((r) => r.role === "patient" && r.pairedWith).length}{" "}
                Patients (with CHW)
              </Badge>
              <Badge variant="warning">
                {results.filter((r) => r.role === "chw").length} CHWs
              </Badge>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 py-2 font-medium text-gray-500">
                      Name
                    </th>
                    <th className="px-3 py-2 font-medium text-gray-500">
                      Role
                    </th>
                    <th className="px-3 py-2 font-medium text-gray-500">
                      Dosing
                    </th>
                    <th className="px-3 py-2 font-medium text-gray-500">
                      Paired With
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {r.firstName} {r.lastName}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={r.role === "patient" ? "info" : "warning"}
                        >
                          {r.role === "patient" ? "Patient" : "CHW"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {r.dosingRegimen
                          ? `${r.dosingRegimen} daily`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {r.pairedWith || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <Button>
                <Check className="h-4 w-4" />
                Confirm & Save
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="secondary"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        {step < 3 && (
          <Button
            onClick={() => {
              if (step === 2) {
                runRandomization();
              } else {
                setStep(step + 1);
              }
            }}
            disabled={
              (step === 0 && !selectedCohort) ||
              (step === 1 && parsedStudents.length === 0)
            }
          >
            {step === 2 ? (
              <>
                <Upload className="h-4 w-4" />
                Run Randomization
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
