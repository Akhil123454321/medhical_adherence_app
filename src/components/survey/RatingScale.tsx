"use client";

interface RatingScaleProps {
  question: string;
  value: number | null;
  onChange: (value: number) => void;
  minLabel?: string;
  maxLabel?: string;
  max?: number;
}

export default function RatingScale({
  question,
  value,
  onChange,
  minLabel = "0",
  maxLabel = "5",
  max = 5,
}: RatingScaleProps) {
  return (
    <div className="space-y-2.5">
      <p className="text-sm font-medium text-gray-800 leading-snug">{question}</p>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          {Array.from({ length: max + 1 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i)}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-colors ${
                value === i
                  ? "border-indigo-500 bg-indigo-500 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      </div>
    </div>
  );
}
