"use client";

import { useState, useEffect, useMemo } from "react";
import { CATEGORIES, EXTERIOR_CATEGORIES } from "@/lib/sheets";
import { getNextStep } from "@/lib/quiz-engine";
import { SheetRow } from "@/lib/types";

interface QuizPage {
  label: string;
  url: string;
  type: "question" | "result";
  group: string;
}

function shortPrefix(selected: string, options: string[]): string {
  const sel = selected.toLowerCase();
  const others = options.filter((o) => o !== selected).map((o) => o.toLowerCase());
  for (let len = 1; len <= sel.length; len++) {
    const prefix = sel.slice(0, len);
    const ambiguous = others.some((o) => o.startsWith(prefix));
    if (!ambiguous) return prefix;
  }
  return sel;
}

function generateUniquePages(sheetData: Record<string, SheetRow[]>): QuizPage[] {
  const seen = new Set<string>();
  const pages: QuizPage[] = [];

  // Fixed pages: top-level and sub-category selection
  pages.push({ label: "Interior or Exterior?", url: "/", type: "question", group: "Top Level" });
  pages.push({ label: "What type of exterior project?", url: "/?p=e", type: "question", group: "Top Level" });

  function walkCategory(
    categoryKey: string,
    categoryLabel: string,
    answers: Record<string, string>,
    selections: { answer: string; options: string[] }[],
    group: string
  ) {
    const categoryData = sheetData[categoryKey];
    if (!categoryData) return;

    try {
      const step = getNextStep(categoryKey, categoryData, { ...answers });

      if (step.type === "result") {
        // Deduplicate results by their product combination
        const products = step.result.mainProducts.sort().join("|")
          + "||" + (step.result.preTreatment || "")
          + "||" + (step.result.postTreatment || "");
        if (seen.has("result:" + products)) return;
        seen.add("result:" + products);

        const encoded = selections.map((s) => shortPrefix(s.answer, s.options)).join("-");
        pages.push({
          label: "Result: " + step.result.mainProducts.join(", "),
          url: `/?p=${encoded}`,
          type: "result",
          group,
        });
        return;
      }

      // Deduplicate question pages by question text + sorted options
      const pageKey = step.questionText + "|" + step.options.sort().join("|");
      if (!seen.has(pageKey)) {
        seen.add(pageKey);
        const encoded = selections.map((s) => shortPrefix(s.answer, s.options)).join("-");
        pages.push({
          label: step.questionText + " (" + step.options.length + " options)",
          url: `/?p=${encoded}`,
          type: "question",
          group,
        });
      }

      for (const option of step.options) {
        const newAnswers = { ...answers, [step.questionText]: option };
        const newSelections = [...selections, { answer: option, options: step.options }];
        walkCategory(categoryKey, categoryLabel, newAnswers, newSelections, group);
      }
    } catch {
      // skip errors
    }
  }

  // Interior
  const interiorOptions = ["Interior Project", "Exterior Project"];
  const interiorSel = [{ answer: "Interior Project", options: interiorOptions }];
  walkCategory("interior", "Interior", {}, interiorSel, "Interior");

  // Exterior categories
  for (const cat of EXTERIOR_CATEGORIES) {
    const extCatOptions = EXTERIOR_CATEGORIES.map((c) => c.label);
    const extSelections = [
      { answer: "Exterior Project", options: interiorOptions },
      { answer: cat.label, options: extCatOptions },
    ];
    walkCategory(cat.key, cat.label, {}, extSelections, "Exterior > " + cat.label);
  }

  return pages;
}

interface DebugPanelProps {
  sheetData: Record<string, SheetRow[]>;
}

export default function DebugPanel({ sheetData }: DebugPanelProps) {
  const [checked, setChecked] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = localStorage.getItem("debug-checked");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [hideChecked, setHideChecked] = useState(true);

  const pages = useMemo(() => generateUniquePages(sheetData), [sheetData]);

  useEffect(() => {
    localStorage.setItem("debug-checked", JSON.stringify([...checked]));
  }, [checked]);

  const grouped = useMemo(() => {
    const groups: Record<string, QuizPage[]> = {};
    for (const p of pages) {
      if (!groups[p.group]) groups[p.group] = [];
      groups[p.group].push(p);
    }
    // Put results at the bottom of each group
    for (const items of Object.values(groups)) {
      items.sort((a, b) => {
        if (a.type === "result" && b.type !== "result") return 1;
        if (a.type !== "result" && b.type === "result") return -1;
        return 0;
      });
    }
    return groups;
  }, [pages]);

  const filteredGroups = useMemo(() => {
    const result: Record<string, QuizPage[]> = {};
    const lower = filter.toLowerCase();
    for (const [group, items] of Object.entries(grouped)) {
      let filtered = items;
      if (filter) filtered = filtered.filter((p) => p.label.toLowerCase().includes(lower));
      if (hideChecked) filtered = filtered.filter((p) => !checked.has(p.url));
      if (filtered.length > 0) result[group] = filtered;
    }
    return result;
  }, [grouped, filter, hideChecked, checked]);

  const totalPages = pages.length;
  const checkedCount = pages.filter((p) => checked.has(p.url)).length;
  const remaining = totalPages - checkedCount;

  function toggleCheck(url: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function toggleGroup(group: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        width: "380px",
        background: "#1a1a1a",
        color: "#e0e0e0",
        overflowY: "auto",
        zIndex: 9999,
        fontSize: "12px",
        borderLeft: "2px solid #333",
      }}
    >
      <div style={{ padding: "12px", borderBottom: "1px solid #333", position: "sticky", top: 0, background: "#1a1a1a", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <strong style={{ fontSize: "14px" }}>Quiz Path Tester</strong>
          <span style={{ color: remaining === 0 ? "#4ade80" : "#fbbf24" }}>
            {remaining} remaining
          </span>
        </div>
        <div style={{ fontSize: "11px", color: "#888", marginBottom: "8px" }}>
          {checkedCount}/{totalPages} checked (deduplicated unique pages)
        </div>
        <input
          type="text"
          placeholder="Filter pages..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            width: "100%",
            padding: "6px 8px",
            background: "#2a2a2a",
            border: "1px solid #444",
            color: "#e0e0e0",
            fontSize: "12px",
            borderRadius: "4px",
          }}
        />
        <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={() => setChecked(new Set())}
            style={{ padding: "4px 8px", background: "#333", border: "1px solid #555", color: "#e0e0e0", cursor: "pointer", borderRadius: "4px", fontSize: "11px" }}
          >
            Reset all
          </button>
          <button
            onClick={() => setChecked(new Set(pages.map((p) => p.url)))}
            style={{ padding: "4px 8px", background: "#333", border: "1px solid #555", color: "#e0e0e0", cursor: "pointer", borderRadius: "4px", fontSize: "11px" }}
          >
            Check all
          </button>
          <button
            onClick={() => setHideChecked((h) => !h)}
            style={{ padding: "4px 8px", background: hideChecked ? "#2d4a2d" : "#333", border: "1px solid #555", color: "#e0e0e0", cursor: "pointer", borderRadius: "4px", fontSize: "11px" }}
          >
            {hideChecked ? "Hiding checked" : "Showing all"}
          </button>
        </div>
      </div>

      <div style={{ padding: "8px" }}>
        {Object.entries(filteredGroups).map(([group, items]) => {
          const allInGroup = grouped[group] || [];
          const groupChecked = allInGroup.filter((p) => checked.has(p.url)).length;
          const isCollapsed = collapsed.has(group);
          return (
            <div key={group} style={{ marginBottom: "4px" }}>
              <div
                onClick={() => toggleGroup(group)}
                style={{
                  padding: "6px 8px",
                  background: "#252525",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderRadius: "4px",
                  userSelect: "none",
                }}
              >
                <span>
                  <span style={{ marginRight: "6px" }}>{isCollapsed ? "+" : "-"}</span>
                  <strong>{group}</strong>
                </span>
                <span style={{ color: groupChecked === allInGroup.length ? "#4ade80" : "#888" }}>
                  {groupChecked}/{allInGroup.length}
                </span>
              </div>
              {!isCollapsed && (
                <div style={{ paddingLeft: "8px" }}>
                  {items.map((p) => {
                    const isChecked = checked.has(p.url);
                    return (
                      <div
                        key={p.url}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px",
                          padding: "4px 4px",
                          borderBottom: "1px solid #222",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCheck(p.url)}
                          style={{ marginTop: "2px", cursor: "pointer", flexShrink: 0 }}
                        />
                        <a
                          href={p.url + (p.url.includes("?") ? "&" : "?") + "debug=true"}
                          onClick={() => toggleCheck(p.url)}
                          style={{
                            color: p.type === "result" ? "#c084fc" : "#8bb4ff",
                            textDecoration: isChecked ? "line-through" : "none",
                            wordBreak: "break-word",
                            lineHeight: "1.4",
                          }}
                        >
                          {p.type === "result" ? "** " : ""}{p.label}
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
