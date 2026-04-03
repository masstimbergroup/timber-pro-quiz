"use client";

export default function QuizHeader() {
  return (
    <header
      className="w-full py-4 px-6"
      style={{
        background: "var(--color-bg-header)",
        borderBottom: "1px solid var(--color-header-border)",
      }}
    >
      <div className="max-w-5xl mx-auto text-center">
        <span className="text-xl font-bold tracking-widest uppercase" style={{ color: "var(--color-text)" }}>
          TIMBERPRO
        </span>
        <span className="text-xl ml-2 italic" style={{ color: "var(--color-btn-yes)" }}>
          Quiz
        </span>
      </div>
    </header>
  );
}
