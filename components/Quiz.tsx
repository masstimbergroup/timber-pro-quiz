"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAllSheets, CATEGORIES, EXTERIOR_CATEGORIES } from "@/lib/sheets";
import { getNextStep } from "@/lib/quiz-engine";
import { SheetRow, QuizState, ProductInfo } from "@/lib/types";
import QuizHeader from "./QuizHeader";
import QuestionCard from "./QuestionCard";
import ResultCard from "./ResultCard";
import DebugPanel from "./DebugPanel";

// Find the shortest prefix of `selected` that uniquely identifies it among `options`
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

// Match a prefix against options, returning the matching option
function matchPrefix(prefix: string, options: string[]): string | null {
  const p = prefix.toLowerCase();
  const matches = options.filter((o) => o.toLowerCase().startsWith(p));
  if (matches.length === 1) return matches[0];
  // Exact match fallback
  const exact = options.find((o) => o.toLowerCase() === p);
  if (exact) return exact;
  return matches[0] || null;
}

function encodeSelections(selections: { answer: string; options: string[] }[]): string {
  return selections
    .map((s) => shortPrefix(s.answer, s.options))
    .join("-");
}

function updateURL(selections: { answer: string; options: string[] }[]) {
  const url = new URL(window.location.href);
  if (selections.length === 0) {
    url.searchParams.delete("p");
  } else {
    url.searchParams.set("p", encodeSelections(selections));
  }
  window.history.replaceState({}, "", url.toString());
}

export default function Quiz() {
  const [sheetData, setSheetData] = useState<Record<string, SheetRow[]> | null>(null);
  const [products, setProducts] = useState<Record<string, ProductInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<QuizState>({ phase: "top-level" });
  const [history, setHistory] = useState<QuizState[]>([]);
  const [selections, setSelections] = useState<{ answer: string; options: string[] }[]>([]);
  const replayPending = useRef<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const encoded = url.searchParams.get("p");
    if (encoded) {
      replayPending.current = encoded;
    }
    if (url.searchParams.get("debug") === "true") {
      setDebugMode(true);
    }

    Promise.all([
      fetchAllSheets(),
      fetch("/products.json").then((r) => r.ok ? r.json() : []),
    ])
      .then(([sheets, productList]) => {
        setSheetData(sheets);
        const productMap: Record<string, ProductInfo> = {};
        for (const p of productList) {
          productMap[p.sheetName] = p;
          const altAnd = p.sheetName.replace(/ and /gi, " & ");
          const altAnd2 = p.sheetName.replace(/ & /g, " and ");
          if (!productMap[altAnd]) productMap[altAnd] = p;
          if (!productMap[altAnd2]) productMap[altAnd2] = p;
          const upper = p.sheetName.toUpperCase();
          if (!productMap[upper]) productMap[upper] = p;
          const titleCase = p.sheetName.replace(/\b\w+/g, (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
          if (!productMap[titleCase]) productMap[titleCase] = p;
        }
        setProducts(productMap);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Replay selections from URL after data loads
  useEffect(() => {
    if (!sheetData || !replayPending.current) return;
    const prefixes = replayPending.current.split("-");
    replayPending.current = null;

    let currentState: QuizState = { phase: "top-level" };
    const currentHistory: QuizState[] = [];
    const currentSelections: { answer: string; options: string[] }[] = [];

    for (const prefix of prefixes) {
      if (currentState.phase === "top-level") {
        const options = ["Interior Project", "Exterior Project"];
        const selection = matchPrefix(prefix, options);
        if (!selection) break;
        currentSelections.push({ answer: selection, options });
        currentHistory.push(currentState);
        if (selection === "Interior Project") {
          currentState = { phase: "questions", categoryKey: "interior", answers: {}, currentQuestionIndex: 0 };
        } else {
          currentState = { phase: "sub-category" };
        }
      } else if (currentState.phase === "sub-category") {
        const options = EXTERIOR_CATEGORIES.map((c) => c.label);
        const selection = matchPrefix(prefix, options);
        if (!selection) break;
        const cat = EXTERIOR_CATEGORIES.find((c) => c.label === selection);
        if (!cat) break;
        currentSelections.push({ answer: selection, options });
        currentHistory.push(currentState);
        currentState = { phase: "questions", categoryKey: cat.key, answers: {}, currentQuestionIndex: 0 };
      } else if (currentState.phase === "questions") {
        const categoryData = sheetData[currentState.categoryKey];
        const step = getNextStep(currentState.categoryKey, categoryData, currentState.answers);
        if (step.type !== "question") break;
        const selection = matchPrefix(prefix, step.options);
        if (!selection) break;
        currentSelections.push({ answer: selection, options: step.options });
        const newAnswers: Record<string, string> = { ...currentState.answers, [step.questionText]: selection };
        currentHistory.push(currentState);
        const nextStep = getNextStep(currentState.categoryKey, categoryData, newAnswers);
        if (nextStep.type === "result") {
          currentState = { phase: "result", result: nextStep.result };
        } else {
          currentState = { phase: "questions", categoryKey: currentState.categoryKey, answers: newAnswers, currentQuestionIndex: currentState.currentQuestionIndex + 1 };
        }
      }
    }

    setState(currentState);
    setHistory(currentHistory);
    setSelections(currentSelections);
  }, [sheetData]);

  // Sync URL whenever selections change
  useEffect(() => {
    updateURL(selections);
  }, [selections]);

  // Refs to read current state/history without nesting setState calls
  const stateRef = useRef(state);
  stateRef.current = state;
  const historyRef = useRef(history);
  historyRef.current = history;

  const addSelection = useCallback((answer: string, options: string[]) => {
    setSelections((prev) => [...prev, { answer, options }]);
  }, []);

  const goBack = useCallback(() => {
    const prev = historyRef.current;
    if (prev.length === 0) return;
    setState(prev[prev.length - 1]);
    setHistory(prev.slice(0, -1));
    setSelections((s) => s.slice(0, -1));
  }, []);

  const restart = useCallback(() => {
    setState({ phase: "top-level" });
    setHistory([]);
    setSelections([]);
  }, []);

  const handleTopLevel = useCallback((answer: string) => {
    const options = ["Interior Project", "Exterior Project"];
    addSelection(answer, options);
    setHistory((h) => [...h, stateRef.current]);
    if (answer === "Interior Project") {
      setState({ phase: "questions", categoryKey: "interior", answers: {}, currentQuestionIndex: 0 });
    } else {
      setState({ phase: "sub-category" });
    }
  }, [addSelection]);

  const handleSubCategory = useCallback((categoryKey: string, label: string) => {
    const options = EXTERIOR_CATEGORIES.map((c) => c.label);
    addSelection(label, options);
    setHistory((h) => [...h, stateRef.current]);
    setState({ phase: "questions", categoryKey, answers: {}, currentQuestionIndex: 0 });
  }, [addSelection]);

  const handleAnswer = useCallback((question: string, answer: string, options: string[]) => {
    if (!sheetData) return;
    addSelection(answer, options);
    const prev = stateRef.current;
    if (prev.phase !== "questions") return;
    const newAnswers = { ...prev.answers, [question]: answer };
    const categoryData = sheetData[prev.categoryKey];
    const nextStep = getNextStep(prev.categoryKey, categoryData, newAnswers);
    setHistory((h) => [...h, prev]);
    if (nextStep.type === "result") {
      setState({ phase: "result" as const, result: nextStep.result });
    } else {
      setState({ ...prev, answers: newAnswers, currentQuestionIndex: prev.currentQuestionIndex + 1 });
    }
  }, [sheetData, addSelection]);

  if (loading) {
    return (
      <div className="w-full">
        <QuizHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div
              className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-4"
              style={{ borderColor: "var(--color-stroke)", borderTopColor: "var(--color-btn-yes)", opacity: 0.6 }}
            />
            <p style={{ color: "var(--color-text-muted)" }}>Loading quiz...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <QuizHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-red-600">Failed to load quiz: {error}</p>
        </div>
      </div>
    );
  }

  const extDescriptions: Record<string, string> = {};
  for (const cat of EXTERIOR_CATEGORIES) {
    extDescriptions[cat.label] = cat.description;
  }

  return (
    <div className="w-full min-h-screen flex flex-col relative">
      <QuizHeader />
      {history.length > 0 && state.phase !== "result" && (
        <button
          onClick={goBack}
          className="absolute left-6 top-20 text-sm cursor-pointer z-10"
          style={{ color: "var(--color-text-muted)" }}
        >
          &larr; Back
        </button>
      )}
      <div className="max-w-3xl mx-auto px-4 flex-1 flex flex-col justify-center">

        {state.phase === "top-level" && (
          <QuestionCard
            question="What type of project are you working on?"
            options={["Interior Project", "Exterior Project"]}
            variant="image-cards"
            onSelect={handleTopLevel}
          />
        )}

        {state.phase === "sub-category" && (
          <QuestionCard
            question="What type of exterior project?"
            options={EXTERIOR_CATEGORIES.map((c) => c.label)}
            variant="grid"
            descriptions={extDescriptions}
            onSelect={(label) => {
              const cat = EXTERIOR_CATEGORIES.find((c) => c.label === label);
              if (cat) handleSubCategory(cat.key, label);
            }}
          />
        )}

        {state.phase === "questions" && sheetData && (() => {
          const categoryData = sheetData[state.categoryKey];
          const step = getNextStep(state.categoryKey, categoryData, state.answers);
          if (step.type === "result") {
            return <ResultCard result={step.result} products={products} onRestart={restart} />;
          }
          return (
            <QuestionCard
              question={step.questionText}
              options={step.options}
              variant={step.options.length > 3 ? "grid" : "buttons"}
              onSelect={(answer) => handleAnswer(step.questionText, answer, step.options)}
            />
          );
        })()}

        {state.phase === "result" && (
          <ResultCard result={state.result} products={products} onRestart={restart} />
        )}
      </div>
      {debugMode && sheetData && <DebugPanel sheetData={sheetData} />}
    </div>
  );
}
