// lib/types.ts

export interface SheetRow {
  questions: Record<string, string>;
  mainProduct: string;
  preTreatment: string;
  postTreatment: string;
}

export interface CategoryConfig {
  // Stable identity = the sheet tab's gid. Used to key the per-category row data and
  // to look the category up everywhere.
  key: string;
  // Display title. Derived from the sheet tab name (the "Exterior Projects - " prefix
  // stripped), so renaming/adding a tab updates the quiz with no code change.
  label: string;
  // Which top-level path this category belongs to.
  section: "interior" | "exterior";
  gid: string;
  // The category's question columns, derived from the tab's header row (everything
  // left of "Main Product Recommendation").
  questionColumns: string[];
  // Stable token used to encode this category into the shareable `?p=` URL. Decoupled
  // from `label` so renaming the tab can never break links. Always >= 2 chars so it
  // can never collide with the legacy 1-char codes (see lib/url-codec.ts).
  slug: string;
  // Optional display-only overrides for question titles, keyed by the raw sheet column
  // header. Lets us give a friendly heading to a column whose sheet header is blank,
  // without editing the sheet or changing the answer-matching key.
  questionLabels?: Record<string, string>;
}

// The payload returned by /api/quiz-data: the dynamically-built category list plus
// each category's row data, keyed by gid.
export interface QuizData {
  categories: CategoryConfig[];
  sheets: Record<string, SheetRow[]>;
}

export interface QuizStep {
  type: "question";
  questionText: string;
  options: string[];
  categoryKey: string;
}

export interface ProductInfo {
  name: string;
  slug: string;
  url: string;
  image: string;
  description: string;
  badge: string;
}

export interface QuizResult {
  type: "result";
  mainProducts: string[];
  preTreatment: string | null;
  postTreatment: string | null;
  isAdvisory: boolean;
}

export type QuizState = {
  phase: "top-level";
} | {
  phase: "sub-category";
} | {
  phase: "questions";
  categoryKey: string;
  answers: Record<string, string>;
  currentQuestionIndex: number;
} | {
  phase: "result";
  result: QuizResult;
};
