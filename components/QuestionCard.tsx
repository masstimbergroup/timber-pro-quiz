"use client";

const IMAGE_MAP: Record<string, string> = {
  "Interior Project": "/images/interior.jpg",
  "Exterior Project": "/images/exterior.jpg",
};

interface QuestionCardProps {
  question: string;
  options: string[];
  onSelect: (answer: string) => void;
  variant?: "image-cards" | "buttons" | "grid";
  descriptions?: Record<string, string>;
}

function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function QuestionCard({ question, options, onSelect, variant = "buttons", descriptions }: QuestionCardProps) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <style>{`
        .btn-ghost:hover {
          background: var(--color-btn-yes) !important;
          color: #FFFFFF !important;
          border-color: var(--color-btn-yes) !important;
        }
        .btn-grid:hover {
          border-color: var(--color-btn-yes) !important;
        }
        .image-card:hover {
          border-color: var(--color-btn-yes) !important;
          transform: translateY(-2px);
        }
      `}</style>

      <h2
        className={`${variant === "buttons" ? "text-4xl font-bold" : "text-2xl font-bold"} mb-10 text-center`}
        style={{ color: "var(--color-text-heading)" }}
      >
        {question}
      </h2>

      {variant === "image-cards" ? (
        <div className="grid grid-cols-2 gap-5 max-w-xl mx-auto">
          {options.map((option) => {
            const imgSrc = IMAGE_MAP[option];
            return (
              <button
                key={option}
                onClick={() => onSelect(option)}
                className="image-card overflow-hidden transition-all duration-200 cursor-pointer border"
                style={{
                  background: "var(--color-bg-card)",
                  borderColor: "var(--color-stroke)",
                  borderRadius: "5px",
                }}
              >
                <div className="w-full aspect-[4/3] overflow-hidden">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={option}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        background: "var(--color-bg-product)",
                        color: "var(--color-text-light)",
                      }}
                    >
                      <span className="text-lg font-medium opacity-80">{capitalizeFirst(option)}</span>
                    </div>
                  )}
                </div>
                <div className="px-4 py-3">
                  <span className="text-sm" style={{ color: "var(--color-text)" }}>
                    {capitalizeFirst(option)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : variant === "grid" ? (
        <div className="grid grid-cols-2 gap-4">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => onSelect(option)}
              className="btn-grid p-5 rounded-lg text-left transition-all duration-200 cursor-pointer border"
              style={{
                background: "var(--color-bg-card)",
                borderColor: "var(--color-stroke)",
                color: "var(--color-text)",
              }}
            >
              <span className="text-lg font-semibold block">{capitalizeFirst(option)}</span>
              {descriptions?.[option] && (
                <span className="text-sm mt-1 block" style={{ color: "var(--color-text-muted)" }}>
                  {descriptions[option]}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => onSelect(option)}
              className="btn-ghost w-full sm:flex-1 sm:max-w-[250px] px-6 py-4 text-lg font-semibold transition-all duration-200 cursor-pointer border"
              style={{
                background: "transparent",
                borderColor: "var(--color-stroke)",
                color: "var(--color-text)",
                borderRadius: "5px",
              }}
            >
              {capitalizeFirst(option)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
