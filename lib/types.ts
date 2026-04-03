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
