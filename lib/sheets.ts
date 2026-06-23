// lib/sheets.ts
import { SheetRow, CategoryConfig, QuizData } from "./types";

const SHEET_ID = "1lASWEOmfA7OXc1W34qSauQfzzlIbbDqhpg2oMhOesq8";

// How long (seconds) the server caches sheet reads before re-fetching from Google.
// Google forbids client caching (`cache-control: no-store`), so caching it server-side
// via Next's Data Cache is what keeps the quiz fast. A sheet edit (including adding /
// renaming a tab) goes live within this window. Mirrored by the `Cache-Control` header
// in app/api/quiz-data/route.ts.
export const SHEET_REVALIDATE_SECONDS = 60;

// Tab-naming convention the quiz reads from. The category list is driven entirely by
// the sheet's tabs: any tab named "Exterior Projects - X" becomes an exterior tile
// titled "X"; "Interior Projects" is the interior flow. Anything else is ignored.
const EXTERIOR_PREFIX = "Exterior Projects - ";
const INTERIOR_TAB = "Interior Projects";

// Frozen stable URL tokens for the original tabs, so existing `?p=` share links keep
// resolving even though categories are now dynamic. New tabs get a deterministic
// gid-derived token (deriveSlug). Never edit these — they are link-stability history,
// not category content. (Keyed by gid.)
const STABLE_SLUGS: Record<string, string> = {
  "0": "in",
  "1623581807": "st",
  "1043945754": "ol",
  "257663984": "co",
  "89613080": "rs",
  "1334082439": "db",
  "818762569": "nx",
};

// Display-only question-title overrides, keyed by gid then by the raw (often blank)
// sheet column header. The Docks & Bridges tab has a blank first-question header in the
// sheet; this gives it a real title without editing the sheet or touching answer
// matching.
const GID_QUESTION_LABELS: Record<string, Record<string, string>> = {
  "1334082439": { "": "What's your goal for the wood's color?" },
};

// A stable, URL-safe, >= 2-char token derived from a tab's gid, for tabs not in
// STABLE_SLUGS. Prefixed with "t" so it can never collide with the 1-char legacy codes
// or the existing letter slugs.
function deriveSlug(gid: string): string {
  const n = Number(gid);
  return "t" + (Number.isFinite(n) ? n.toString(36) : gid);
}

// Last-known-good category skeleton, used only if the live tab list can't be read.
// questionColumns are filled in from the live headers at fetch time, so they are left
// empty here.
const FALLBACK_CATEGORIES: CategoryConfig[] = [
  { key: "0", gid: "0", section: "interior", label: "Interior", slug: "in", questionColumns: [] },
  { key: "1623581807", gid: "1623581807", section: "exterior", label: "Structural Wood", slug: "st", questionColumns: [] },
  { key: "1043945754", gid: "1043945754", section: "exterior", label: "Outdoor Living", slug: "ol", questionColumns: [] },
  { key: "257663984", gid: "257663984", section: "exterior", label: "Concrete", slug: "co", questionColumns: [] },
  { key: "89613080", gid: "89613080", section: "exterior", label: "Restoration", slug: "rs", questionColumns: [] },
  { key: "1334082439", gid: "1334082439", section: "exterior", label: "Docks & Bridges", slug: "db", questionColumns: [], questionLabels: GID_QUESTION_LABELS["1334082439"] },
  { key: "818762569", gid: "818762569", section: "exterior", label: "Non-Toxic", slug: "nx", questionColumns: [] },
];

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

interface ParsedSheet {
  rows: SheetRow[];
  questionColumns: string[];
  hasMainProduct: boolean;
}

function parseSheet(csv: string): ParsedSheet {
  const parsed = parseCSV(csv);
  if (parsed.length < 2) return { rows: [], questionColumns: [], hasMainProduct: false };

  const headers = parsed[0];
  const dataRows = parsed.slice(1).filter((r) => r.some((cell) => cell !== ""));

  const mainIdx = headers.findIndex((h) => h.toLowerCase().includes("main product"));
  const preIdx = headers.findIndex((h) => h.toLowerCase().includes("pre-treatment"));
  // Match both "Post-treatment" and the sheet's actual "Post Treatment" header (space,
  // no hyphen); otherwise postIdx is -1 and post-treatment products never render.
  const postIdx = headers.findIndex((h) => {
    const l = h.toLowerCase();
    return l.includes("post-treatment") || l.includes("post treatment");
  });

  // Question columns = everything left of the product columns, derived from the header
  // row. This is what makes a brand-new tab fully playable with zero config.
  const resultStartIndex = mainIdx !== -1 ? mainIdx : headers.length - 3;
  const questionColumns = headers.slice(0, resultStartIndex);

  const rows = dataRows.map((row) => {
    const questions: Record<string, string> = {};
    questionColumns.forEach((header, i) => {
      questions[header] = row[i] || "";
    });
    return {
      questions,
      mainProduct: mainIdx !== -1 ? row[mainIdx] || "" : "",
      preTreatment: preIdx !== -1 ? row[preIdx] || "" : "",
      postTreatment: postIdx !== -1 ? row[postIdx] || "" : "",
    };
  });

  return { rows, questionColumns, hasMainProduct: mainIdx !== -1 };
}

// Unescape the JS-string-escaped tab names embedded in the htmlview page
// (e.g. "Docks \x26 Bridges" -> "Docks & Bridges").
function unescapeTabName(s: string): string {
  return s
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\(.)/g, "$1");
}

interface TabInfo {
  name: string;
  gid: string;
}

// Read the spreadsheet's full tab list (name + gid, in tab order) without an API key,
// by parsing the public htmlview page. (gviz-by-name is deliberately NOT used: it
// silently returns the first sheet on any name miss, which would serve wrong data.)
async function fetchTabList(): Promise<TabInfo[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/htmlview`;
  const res = await fetch(url, { next: { revalidate: SHEET_REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`Failed to fetch tab list: ${res.status}`);
  const html = await res.text();

  const tabs: TabInfo[] = [];
  const re = /items\.push\(\{name: "((?:[^"\\]|\\.)*)",\s*pageUrl: "([^"]*?)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const name = unescapeTabName(m[1]);
    const gidMatch = m[2].match(/gid=(\d+)/);
    if (gidMatch) tabs.push({ name, gid: gidMatch[1] });
  }
  if (tabs.length === 0) throw new Error("No tabs parsed from htmlview");
  return tabs;
}

// Turn the raw tab list into the category skeleton (everything except questionColumns,
// which are filled from the live headers later). Tabs that aren't Interior/Exterior
// categories are ignored. Order follows the sheet's tab order.
function buildCategorySkeleton(tabs: TabInfo[]): CategoryConfig[] {
  const categories: CategoryConfig[] = [];
  for (const { name, gid } of tabs) {
    let section: "interior" | "exterior";
    let label: string;
    if (name === INTERIOR_TAB) {
      section = "interior";
      label = "Interior";
    } else if (name.startsWith(EXTERIOR_PREFIX)) {
      section = "exterior";
      label = name.slice(EXTERIOR_PREFIX.length).trim();
    } else {
      continue; // not a category tab
    }
    categories.push({
      key: gid,
      gid,
      section,
      label,
      slug: STABLE_SLUGS[gid] ?? deriveSlug(gid),
      questionColumns: [],
      questionLabels: GID_QUESTION_LABELS[gid],
    });
  }
  return categories;
}

async function fetchTabCsv(gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { next: { revalidate: SHEET_REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`Failed to fetch sheet ${gid}: ${res.status}`);
  return res.text();
}

// Build the full quiz dataset: the dynamic category list (titles from tab names) plus
// each category's rows, keyed by gid. Falls back to the built-in skeleton if the live
// tab list can't be read, so the quiz never renders blank. A category whose tab is
// missing, malformed (no "Main Product Recommendation" header), or empty is skipped.
export async function fetchQuizData(): Promise<QuizData> {
  let skeleton: CategoryConfig[];
  try {
    skeleton = buildCategorySkeleton(await fetchTabList());
    if (!skeleton.some((c) => c.section === "exterior")) skeleton = FALLBACK_CATEGORIES;
  } catch {
    skeleton = FALLBACK_CATEGORIES;
  }

  const fetched = await Promise.all(
    skeleton.map(async (cat) => {
      try {
        return { cat, parsed: parseSheet(await fetchTabCsv(cat.gid)) };
      } catch {
        return { cat, parsed: null as ParsedSheet | null };
      }
    })
  );

  const sheets: Record<string, SheetRow[]> = {};
  const categories: CategoryConfig[] = [];
  for (const { cat, parsed } of fetched) {
    if (!parsed || !parsed.hasMainProduct || parsed.rows.length === 0) continue;
    sheets[cat.gid] = parsed.rows;
    categories.push({ ...cat, questionColumns: parsed.questionColumns });
  }

  return { categories, sheets };
}
