"use client";

import RandomizationWizard from "@/components/admin/RandomizationWizard";

export default function RandomizationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Randomization</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a student list and automatically assign roles, dosing regimens,
          and CHW pairings
        </p>
      </div>
      <RandomizationWizard />
    </div>
  );
}
