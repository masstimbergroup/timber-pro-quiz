// lib/types.ts

export interface SheetRow {
  questions: Record<string, string>;
  mainProduct: string;
  preTreatment: string;
  postTreatment: string;
}

export interface CategoryConfig {
  key: string;
  label: string;
  description: string;
  gid: string;
  questionColumns: string[];
  // Stable, never-changing token used to encode this category into the shareable
  // `?p=` URL. Decoupled from `label` so renaming the label can never break old or
  // new links. Must be >= 2 chars so it can never collide with the legacy 1-char
  // label-prefix codes (see lib/url-codec.ts).
  slug: string;
  // Optional display-only overrides for question titles, keyed by the raw sheet
  // column header. Lets us give a friendly heading to a column whose sheet header
  // is blank, WITHOUT editing the sheet or changing the answer-matching key.
  questionLabels?: Record<string, string>;
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
