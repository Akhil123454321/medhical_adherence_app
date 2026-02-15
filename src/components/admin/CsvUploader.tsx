"use client";

import { useCallback, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import Button from "@/components/ui/Button";

interface CsvUploaderProps {
  onUpload: (data: Record<string, string>[]) => void;
}

export default function CsvUploader({ onUpload }: CsvUploaderProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      const Papa = (await import("papaparse")).default;
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          onUpload(results.data);
        },
      });
    },
    [onUpload]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      handleFile(file);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }

  return (
    <div>
      {!fileName ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? "border-indigo-400 bg-indigo-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <Upload className="mb-3 h-10 w-10 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">
            Drop a CSV file here, or click to browse
          </p>
          <p className="mt-1 text-xs text-gray-400">
            CSV with columns: firstName, lastName
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleInputChange}
            className="hidden"
          />
        </label>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">
              {fileName}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFileName(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
