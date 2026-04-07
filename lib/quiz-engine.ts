// lib/quiz-engine.ts
import { SheetRow, QuizResult } from "./types";
import { CATEGORIES } from "./sheets";

const SKIP_VALUES = ["(SKIP)", "(Skip)", "(skip)"];

// Split on commas but ignore commas inside parentheses
function splitOptions(val: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  for (const ch of val) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.filter(Boolean);
}

export function getCategory(key: string) {
  return CATEGORIES.find((c) => c.key === key);
}

export function getNextStep(
  categoryKey: string,
  sheetData: SheetRow[],
  answers: Record<string, string>
): { type: "question"; questionText: string; options: string[] } | { type: "result"; result: QuizResult } {
  const category = getCategory(categoryKey);
  if (!category) throw new Error(`Unknown category: ${categoryKey}`);

  let matchingRows = sheetData;
  for (const [question, answer] of Object.entries(answers)) {
    matchingRows = matchingRows.filter((row) => {
      const cellValue = row.questions[question] || "";
      if (cellValue === answer || cellValue === "ANY") return true;
      // Check if the answer is one of the comma-separated values in the cell
      const parts = splitOptions(cellValue);
      return parts.includes(answer);
    });
  }

  if (matchingRows.length === 0) {
    throw new Error(`No matching rows for answers: ${JSON.stringify(answers)}`);
  }

  for (const questionCol of category.questionColumns) {
    if (questionCol in answers) continue;

    const allSkip = matchingRows.every((row) =>
      SKIP_VALUES.includes(row.questions[questionCol] || "")
    );
    if (allSkip) continue;

    const optionsSet = new Set<string>();
    for (const row of matchingRows) {
      const val = row.questions[questionCol] || "";
      if (!SKIP_VALUES.includes(val) && val !== "" && val !== "ANY") {
        const parts = splitOptions(val);
        for (const part of parts) {
          optionsSet.add(part);
        }
      }
    }

    const options = Array.from(optionsSet);

    // Auto-skip questions with only one option
    if (options.length === 1) {
      answers[questionCol] = options[0];
      // Re-filter matching rows with the auto-selected answer
      matchingRows = matchingRows.filter((row) => {
        const cellValue = row.questions[questionCol] || "";
        // Match if the cell contains the auto-selected value (could be part of comma-separated)
        return cellValue === "ANY" || splitOptions(cellValue).includes(options[0]);
      });
      continue;
    }

    if (options.length > 0) {
      return { type: "question", questionText: questionCol, options };
    }
  }

  const row = matchingRows[0];
  const mainProducts = row.mainProduct
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const isAdvisory = mainProducts.some(
    (p) => p.toLowerCase() === "what you used prior"
  );

  return {
    type: "result",
    result: {
      type: "result",
      mainProducts,
      preTreatment: row.preTreatment || null,
      postTreatment: row.postTreatment || null,
      isAdvisory,
    },
  };
}
