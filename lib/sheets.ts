// lib/sheets.ts
import { SheetRow, CategoryConfig } from "./types";

const SHEET_ID = "1lASWEOmfA7OXc1W34qSauQfzzlIbbDqhpg2oMhOesq8";

// How long (seconds) the server caches each sheet tab before re-fetching from
// Google. Google forbids client caching (`cache-control: no-store`), so caching it
// server-side via Next's Data Cache is what keeps the quiz fast. A sheet edit goes
// live within this window. Consumed by fetchAllSheets and mirrored by the
// `revalidate` export in app/api/quiz-data/route.ts.
export const SHEET_REVALIDATE_SECONDS = 60;

export const CATEGORIES: CategoryConfig[] = [
  {
    key: "interior",
    label: "Interior",
    description: "Projects for interior applications",
    gid: "0",
    slug: "in",
    questionColumns: [
      "What type of interior project?",
      "Do you want to stain the wood a different color?",
      "Is this a high-touch surface that needs to be wiped or cleaned frequently?",
      "Does your project require fire-retardant capabilities?",
    ],
  },
  {
    key: "structural",
    label: "Structural Wood",
    description: "Wood or log siding, mass timber frames, timber frames, etc.",
    gid: "1623581807",
    slug: "st",
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
    label: "Outdoor Living",
    description: "Decks, fences, outdoor furniture, gazebos, etc.",
    gid: "1043945754",
    slug: "ol",
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
    key: "concrete",
    label: "Concrete",
    description: "Patios, walkways, pavers, driveways, retaining walls, foundations, etc.",
    gid: "257663984",
    slug: "co",
    questionColumns: [
      "What Type of Project?",
      "What's the current condition?",
      "What's your goal?",
      "Do you want color?",
    ],
  },
  {
    key: "restoration",
    label: "Restoration",
    description: "Weathered, faded, greyed, or previously stained wood that needs reviving, etc.",
    gid: "89613080",
    slug: "rs",
    questionColumns: [
      "What Type of Project?",
      "What's the current condition?",
      "Do you need color enhancement?",
      "Does your project require fire-retardant capabilities?",
      "Does it need to be WUI compliant?",
    ],
  },
  {
    key: "docks-bridges",
    label: "Docks & Bridges",
    description: "Docks, piers, boardwalks, pilings, wood bridges, waterfront structures, etc.",
    gid: "1334082439",
    slug: "db",
    // The sheet's first question column for this tab has a blank header, so its
    // raw key is "". We keep "" as the answer-matching key (do not change it), and
    // only override the DISPLAYED title here so it doesn't fall back to the generic
    // "What's your main goal?" placeholder.
    questionLabels: {
      "": "What's your goal for the wood's color?",
    },
    questionColumns: [
      "",
      "Does your project require fire-retardant capabilities?",
      "Does it need to be WUI compliant?",
    ],
  },
  {
    key: "non-toxic",
    label: "Non-Toxic",
    description: "Garden beds, raised planters, chicken coops, beehives, animal enclosures, play structures, etc.",
    gid: "818762569",
    slug: "nx",
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

  const mainIdx = headers.findIndex((h) => h.toLowerCase().includes("main product"));
  const preIdx = headers.findIndex((h) => h.toLowerCase().includes("pre-treatment"));
  // Match both "Post-treatment" and the sheet's actual "Post Treatment" header (space,
  // no hyphen). Without the space variant, postIdx is always -1 and post-treatment
  // product recommendations never render.
  const postIdx = headers.findIndex((h) => {
    const l = h.toLowerCase();
    return l.includes("post-treatment") || l.includes("post treatment");
  });

  const resultStartIndex = mainIdx !== -1 ? mainIdx : headers.length - 3;
  const questionHeaders = headers.slice(0, resultStartIndex);

  return dataRows.map((row) => {
    const questions: Record<string, string> = {};
    questionHeaders.forEach((header, i) => {
      questions[header] = row[i] || "";
    });
    return {
      questions,
      mainProduct: mainIdx !== -1 ? row[mainIdx] || "" : "",
      preTreatment: preIdx !== -1 ? row[preIdx] || "" : "",
      postTreatment: postIdx !== -1 ? row[postIdx] || "" : "",
    };
  });
}

export async function fetchAllSheets(): Promise<Record<string, SheetRow[]>> {
  const results: Record<string, SheetRow[]> = {};

  await Promise.all(
    CATEGORIES.map(async (cat) => {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${cat.gid}`;
      // Cache each tab in Next's server-side Data Cache for SHEET_REVALIDATE_SECONDS.
      // (No-op in the browser, but fetchAllSheets now only runs server-side via the
      // /api/quiz-data route handler.)
      const res = await fetch(url, { next: { revalidate: SHEET_REVALIDATE_SECONDS } });
      if (!res.ok) throw new Error(`Failed to fetch sheet ${cat.key}: ${res.status}`);
      const csv = await res.text();
      results[cat.key] = csvToSheetRows(csv);
    })
  );

  return results;
}
