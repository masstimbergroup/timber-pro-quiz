"use client";

export default function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2" style={{ color: "var(--color-text-muted)" }}>
        <span>Question {current} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ background: "var(--color-stroke)", opacity: 0.2 }}>
        <div
          className="h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: "var(--color-btn-yes)" }}
        />
      </div>
    </div>
  );
}
