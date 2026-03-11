"use client";

interface CheckboxSelectProps {
  question: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}

export default function CheckboxSelect({
  question,
  options,
  values,
  onChange,
}: CheckboxSelectProps) {
  function toggle(opt: string) {
    if (values.includes(opt)) {
      onChange(values.filter((v) => v !== opt));
    } else {
      onChange([...values, opt]);
    }
  }

  return (
    <div className="space-y-2.5">
      <p className="text-sm font-medium text-gray-800 leading-snug">{question}</p>
      <div className="space-y-2">
        {options.map((opt) => {
          const checked = values.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`w-full text-left rounded-lg border px-4 py-2.5 text-sm transition-colors flex items-start gap-2.5 ${
                checked
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span
                className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded border flex items-center justify-center ${
                  checked
                    ? "border-indigo-500 bg-indigo-500"
                    : "border-gray-300 bg-white"
                }`}
              >
                {checked && (
                  <svg
                    className="h-3 w-3 text-white"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
