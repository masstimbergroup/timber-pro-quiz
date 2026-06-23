"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getNextStep, getCategory } from "@/lib/quiz-engine";
import { SheetRow, CategoryConfig, QuizState, ProductInfo } from "@/lib/types";
import { Selection, matchPrefix, encodeSelections, resolveExteriorToken } from "@/lib/url-codec";
import QuizHeader from "./QuizHeader";
import QuestionCard from "./QuestionCard";
import ResultCard from "./ResultCard";
import DebugPanel from "./DebugPanel";

const TOP_LEVEL_OPTIONS = ["Interior Project", "Exterior Project"];

// Display-only title for a question, applying any per-category override (e.g. a blank
// sheet header). Never used as the answer-matching key.
function questionTitle(category: CategoryConfig | undefined, questionText: string): string {
  return category?.questionLabels?.[questionText] ?? questionText;
}

function updateURL(selections: Selection[]) {
  const url = new URL(window.location.href);
  if (selections.length === 0) {
    url.searchParams.delete("p");
  } else {
    url.searchParams.set("p", encodeSelections(selections));
  }
  window.history.replaceState({}, "", url.toString());
}

export default function Quiz() {
  const [categories, setCategories] = useState<CategoryConfig[] | null>(null);
  const [sheets, setSheets] = useState<Record<string, SheetRow[]> | null>(null);
  const [products, setProducts] = useState<Record<string, ProductInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<QuizState>({ phase: "top-level" });
  const [history, setHistory] = useState<QuizState[]>([]);
  const [selections, setSelections] = useState<Selection[]>([]);
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
      // One fast, same-origin request to our server-cached route. It returns the
      // dynamically-built category list (titles from the sheet tabs) plus each
      // category's rows. See app/api/quiz-data/route.ts.
      fetch("/api/quiz-data").then((r) => {
        if (!r.ok) throw new Error(`Failed to load quiz data: ${r.status}`);
        return r.json();
      }),
      fetch("/products.json").then((r) => r.ok ? r.json() : []),
    ])
      .then(([quizData, productList]) => {
        setCategories(quizData.categories);
        setSheets(quizData.sheets);
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
    if (!sheets || !categories || !replayPending.current) return;
    const exteriorCategories = categories.filter((c) => c.section === "exterior");
    const interiorCategory = categories.find((c) => c.section === "interior");
    const prefixes = replayPending.current.split("-");
    replayPending.current = null;

    let currentState: QuizState = { phase: "top-level" };
    const currentHistory: QuizState[] = [];
    const currentSelections: Selection[] = [];

    // Replay is wrapped in try/catch so a malformed or now-incompatible link (e.g. an
    // old deep-link into a tab whose sheet content has since changed) can never throw
    // to the error screen. On any failure we simply stop at the last consistent state,
    // which is always a valid screen the user can continue from.
    try {
      for (const prefix of prefixes) {
        if (currentState.phase === "top-level") {
          const selection = matchPrefix(prefix, TOP_LEVEL_OPTIONS);
          if (!selection) break;
          currentSelections.push({ answer: selection, options: TOP_LEVEL_OPTIONS });
          currentHistory.push(currentState);
          if (selection === "Interior Project") {
            if (!interiorCategory) break;
            currentState = { phase: "questions", categoryKey: interiorCategory.key, answers: {}, currentQuestionIndex: 0 };
          } else {
            currentState = { phase: "sub-category" };
          }
        } else if (currentState.phase === "sub-category") {
          const options = exteriorCategories.map((c) => c.label);
          // Resolve via stable slug (new links) or the frozen legacy 1-char codes (old
          // links). Re-encode as the slug so visiting an old link upgrades the URL to
          // the new canonical form.
          const cat = resolveExteriorToken(prefix, exteriorCategories);
          if (!cat) break;
          currentSelections.push({ answer: cat.label, options, code: cat.slug });
          currentHistory.push(currentState);
          currentState = { phase: "questions", categoryKey: cat.key, answers: {}, currentQuestionIndex: 0 };
        } else if (currentState.phase === "questions") {
          const category = getCategory(categories, currentState.categoryKey);
          const rows = sheets[currentState.categoryKey];
          if (!category || !rows) break;
          const step = getNextStep(category, rows, currentState.answers);
          if (step.type !== "question") break;
          const selection = matchPrefix(prefix, step.options);
          if (!selection) break;
          currentSelections.push({ answer: selection, options: step.options });
          const newAnswers: Record<string, string> = { ...currentState.answers, [step.questionText]: selection };
          currentHistory.push(currentState);
          const nextStep = getNextStep(category, rows, newAnswers);
          if (nextStep.type === "result") {
            currentState = { phase: "result", result: nextStep.result };
          } else {
            currentState = { phase: "questions", categoryKey: currentState.categoryKey, answers: newAnswers, currentQuestionIndex: currentState.currentQuestionIndex + 1 };
          }
        }
      }
    } catch {
      // Incompatible link — keep whatever consistent state we reached above.
    }

    setState(currentState);
    setHistory(currentHistory);
    setSelections(currentSelections);
  }, [sheets, categories]);

  // Sync URL whenever selections change
  useEffect(() => {
    updateURL(selections);
  }, [selections]);

  // Refs to read current state/history without nesting setState calls
  const stateRef = useRef(state);
  stateRef.current = state;
  const historyRef = useRef(history);
  historyRef.current = history;

  const addSelection = useCallback((answer: string, options: string[], code?: string) => {
    setSelections((prev) => [...prev, { answer, options, code }]);
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
    const interiorCategory = categories?.find((c) => c.section === "interior");
    // If the interior tab is somehow absent, the Interior button is a no-op — bail
    // BEFORE mutating selections/history so the user isn't stranded mid-state.
    if (answer === "Interior Project" && !interiorCategory) return;
    addSelection(answer, TOP_LEVEL_OPTIONS);
    setHistory((h) => [...h, stateRef.current]);
    if (answer === "Interior Project") {
      setState({ phase: "questions", categoryKey: interiorCategory!.key, answers: {}, currentQuestionIndex: 0 });
    } else {
      setState({ phase: "sub-category" });
    }
  }, [addSelection, categories]);

  const handleSubCategory = useCallback((cat: CategoryConfig) => {
    const options = (categories?.filter((c) => c.section === "exterior") ?? []).map((c) => c.label);
    // Encode the category step with its stable slug, never the (mutable) label.
    addSelection(cat.label, options, cat.slug);
    setHistory((h) => [...h, stateRef.current]);
    setState({ phase: "questions", categoryKey: cat.key, answers: {}, currentQuestionIndex: 0 });
  }, [addSelection, categories]);

  const handleAnswer = useCallback((question: string, answer: string, options: string[]) => {
    if (!sheets || !categories) return;
    addSelection(answer, options);
    const prev = stateRef.current;
    if (prev.phase !== "questions") return;
    const category = getCategory(categories, prev.categoryKey);
    const rows = sheets[prev.categoryKey];
    if (!category || !rows) return;
    const newAnswers = { ...prev.answers, [question]: answer };
    const nextStep = getNextStep(category, rows, newAnswers);
    setHistory((h) => [...h, prev]);
    if (nextStep.type === "result") {
      setState({ phase: "result" as const, result: nextStep.result });
    } else {
      setState({ ...prev, answers: newAnswers, currentQuestionIndex: prev.currentQuestionIndex + 1 });
    }
  }, [sheets, categories, addSelection]);

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

  if (error || !categories || !sheets || categories.length === 0) {
    return (
      <div className="w-full">
        <QuizHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-red-600">Failed to load quiz{error ? `: ${error}` : ""}</p>
        </div>
      </div>
    );
  }

  const exteriorCategories = categories.filter((c) => c.section === "exterior");

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
            options={TOP_LEVEL_OPTIONS}
            variant="image-cards"
            onSelect={handleTopLevel}
          />
        )}

        {state.phase === "sub-category" && (
          <QuestionCard
            question="What type of exterior project?"
            options={exteriorCategories.map((c) => c.label)}
            variant="grid"
            onSelect={(label) => {
              const cat = exteriorCategories.find((c) => c.label === label);
              if (cat) handleSubCategory(cat);
            }}
          />
        )}

        {state.phase === "questions" && (() => {
          const category = getCategory(categories, state.categoryKey);
          const rows = sheets[state.categoryKey];
          if (!category || !rows) {
            return <p className="text-red-600 text-center">This category is unavailable.</p>;
          }
          const step = getNextStep(category, rows, state.answers);
          if (step.type === "result") {
            return <ResultCard result={step.result} products={products} onRestart={restart} />;
          }
          return (
            <QuestionCard
              question={questionTitle(category, step.questionText)}
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
      {debugMode && <DebugPanel categories={categories} sheets={sheets} />}
    </div>
  );
}
