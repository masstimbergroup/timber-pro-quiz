// lib/sheets.ts
import { SheetRow, CategoryConfig } from "./types";

const SHEET_ID = "1lASWEOmfA7OXc1W34qSauQfzzlIbbDqhpg2oMhOesq8";

export const CATEGORIES: CategoryConfig[] = [
  {
    key: "interior",
    label: "Interior",
    description: "Projects for interior applications",
    gid: "0",
    questionColumns: [
      "What type of interior project?",
      "Do you want to stain the wood a different color?",
      "Is this a high-touch surface that needs to be wiped or cleaned frequently?",
      "Does your project require fire-retardant capabilities?",
    ],
  },
  {
    key: "structural",
    label: "Structural Wood Surfaces",
    description: "Wood or Log Siding, Mass Timber, Timber Frames",
    gid: "1623581807",
    questionColumns: [
      "What Type of Wood Species",
      "What type of texture",
      "What type of siding/structure?",
      "How old is the wood?",
      "What's the current condition?",
      "What's your main goal?",
      "Does your project require fire retardant campabilities?",
      "Does it need to be WUI compliant?",
    ],
  },
  {
    key: "outdoor-living",
    label: "Outdoor Living Spaces",
    description: "Decks, fences, outdoor furniture, gazebos, etc.",
    gid: "1043945754",
    questionColumns: [
      "What Type of Wood Species",
      "What type of texture",
      "How old is the wood?",
      "What's the current condition?",
      "What's your main goal?",
      "Does your project require fire retardant campabilities?",
      "Does it need to be WUI compliant?",
    ],
  },
  {
    key: "concrete-masonry",
    label: "Concrete & Masonry",
    description: "Concrete driveways, patios, walkways, walls, pavers, etc.",
    gid: "257663984",
    questionColumns: [
      "What Type of Project?",
      "What's the current condition?",
      "What's your goal?",
      "Do you want color?",
    ],
  },
  {
    key: "wood-restoration",
    label: "Wood Restoration",
    description: "Restore and maintain exterior wood projects",
    gid: "89613080",
    questionColumns: [
      "What Type of Project?",
      "What's the current condition?",
      "Do you need color enhancement?",
      "Does your project require fire-retardant capabilities?",
      "Does it need to be WUI compliant?",
    ],
  },
  {
    key: "fencing",
    label: "Fencing",
    description: "Fences and fence posts",
    gid: "1334082439",
    questionColumns: [
      "",
      "Does your project require fire-retardant capabilities?",
      "Does it need to be WUI compliant?",
    ],
  },
  {
    key: "roofing",
    label: "Roofing / Shakes",
    description: "Cedar shakes, shingles, and roofing",
    gid: "818762569",
    questionColumns: [
      "What needs protection?",
      "Does your project require fire-retardant capabilities?",
      "Does it need to be WUI compliant?",
    ],
  },
];

export const EXTERIOR_CATEGORIES = CATEGORIES.filter((c) => c.key !== "interior");

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"') {
      if (inQuotes && csv[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if (char === "\n" && !inQuotes) {
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = "";
    } else if (char === "\r" && !inQuotes) {
      // skip
    } else {
      current += char;
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

function csvToSheetRows(csv: string): SheetRow[] {
  const parsed = parseCSV(csv);
  if (parsed.length < 2) return [];

  const headers = parsed[0];
  const dataRows = parsed.slice(1).filter((r) => r.some((cell) => cell !== ""));

  const resultStartIndex = headers.length - 3;
  const questionHeaders = headers.slice(0, resultStartIndex);

  return dataRows.map((row) => {
    const questions: Record<string, string> = {};
    questionHeaders.forEach((header, i) => {
      questions[header] = row[i] || "";
    });
    return {
      questions,
      mainProduct: row[resultStartIndex] || "",
      preTreatment: row[resultStartIndex + 1] || "",
      postTreatment: row[resultStartIndex + 2] || "",
    };
  });
}

export async function fetchAllSheets(): Promise<Record<string, SheetRow[]>> {
  const results: Record<string, SheetRow[]> = {};

  await Promise.all(
    CATEGORIES.map(async (cat) => {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${cat.gid}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch sheet ${cat.key}: ${res.status}`);
      const csv = await res.text();
      results[cat.key] = csvToSheetRows(csv);
    })
  );

  return results;
}
