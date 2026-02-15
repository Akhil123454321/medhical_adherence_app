"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { X, Plus } from "lucide-react";

interface QuestionFormProps {
  onSubmit: (data: {
    text: string;
    type: "text" | "number" | "select" | "boolean";
    category: string;
    options?: string[];
  }) => void;
  onCancel: () => void;
}

export default function QuestionForm({ onSubmit, onCancel }: QuestionFormProps) {
  const [text, setText] = useState("");
  const [type, setType] = useState<"text" | "number" | "select" | "boolean">(
    "text"
  );
  const [category, setCategory] = useState("");
  const [options, setOptions] = useState<string[]>([""]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      text,
      type,
      category,
      options: type === "select" ? options.filter(Boolean) : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label
          htmlFor="question-text"
          className="block text-sm font-medium text-gray-700"
        >
          Question Text
        </label>
        <textarea
          id="question-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          rows={2}
          placeholder="Enter the question..."
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select
          id="question-type"
          label="Answer Type"
          value={type}
          onChange={(e) =>
            setType(e.target.value as "text" | "number" | "select" | "boolean")
          }
          options={[
            { value: "text", label: "Text" },
            { value: "number", label: "Number" },
            { value: "select", label: "Multiple Choice" },
            { value: "boolean", label: "Yes/No" },
          ]}
        />
        <Input
          id="category"
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g., Academic, Health"
          required
        />
      </div>
      {type === "select" && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Options
          </label>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={opt}
                onChange={(e) => {
                  const newOpts = [...options];
                  newOpts[i] = e.target.value;
                  setOptions(newOpts);
                }}
                placeholder={`Option ${i + 1}`}
              />
              {options.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOptions([...options, ""])}
          >
            <Plus className="h-4 w-4" />
            Add Option
          </Button>
        </div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Add Question</Button>
      </div>
    </form>
  );
}
