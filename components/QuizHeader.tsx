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
        <a href="/" className="inline-block">
          <img src="/images/logo.svg" alt="TimberPro Quiz" className="h-8 cursor-pointer" />
        </a>
      </div>
    </header>
  );
}
