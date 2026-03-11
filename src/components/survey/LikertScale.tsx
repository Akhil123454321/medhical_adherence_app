"use client";

interface LikertScaleProps {
  question: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export default function LikertScale({
  question,
  options,
  value,
  onChange,
}: LikertScaleProps) {
  return (
    <div className="space-y-2.5">
      <p className="text-sm font-medium text-gray-800 leading-snug">{question}</p>
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`w-full text-left rounded-lg border px-4 py-2.5 text-sm transition-colors flex items-center gap-2.5 ${
              value === opt
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-medium"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span
              className={`flex-shrink-0 h-4 w-4 rounded-full border flex items-center justify-center ${
                value === opt
                  ? "border-indigo-500 bg-indigo-500"
                  : "border-gray-300 bg-white"
              }`}
            >
              {value === opt && (
                <span className="h-2 w-2 rounded-full bg-white" />
              )}
            </span>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
