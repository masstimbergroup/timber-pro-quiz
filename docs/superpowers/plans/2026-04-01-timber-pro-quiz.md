# Timber Pro Product Quiz Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a step-by-step product recommendation quiz that walks users through branching questions and recommends Timber Pro wood/concrete coating products based on their answers, displaying product images, descriptions, and links scraped from timberprocoatingsusa.com.

**Architecture:** Single-page Next.js app. On load, fetches all 7 sheets from a public Google Sheet via the CSV export endpoint. Parses them into a unified decision matrix. A client-side quiz engine walks the user through questions one at a time, skipping questions marked `(SKIP)`, and renders a results page showing numbered treatment steps with product cards (image, name, description, "View product" link). Product metadata is scraped from timberprocoatingsusa.com at build time and cached as a static JSON file.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4. No database, no auth. Data source is a public Google Sheet. Product data scraped from timberprocoatingsusa.com.

---

## Brand Design (from Figma screenshots)

These are the design specs observed in the client's Figma file "Quiz Flow":

### Colors
- **Page background:** Warm salmon/pink (`#F5D5C8` approximate)
- **Header bar:** Dark teal/charcoal (`#2D3E3F` approximate)
- **Stroke/outline on cards:** Dark olive green `#273618`
- **Product card backgrounds (results page):** Muted sage/olive green
- **Number circle accents:** Brown/dark brown with white numbers
- **Category pill badges:** Olive green or dark brown with white text
- **Bright accent (indicators):** `#E8EC0F` (yellow-green)
- **Yes button:** Burnt orange/terracotta (`#C4622A` approximate) with white text
- **No button:** White/light with dark text
- **Card fill (quiz steps):** White `#FFFFFF`

### Typography
- **"TIMBERPRO"** in header: Bold, wide-tracked uppercase sans-serif
- **"Quiz"** in header: Italic/script companion font
- **Product names on results:** Scandia font, Medium weight, 28pt
- **Question text:** Large dark serif or transitional font, centered

### Layout
- Frame size: 1420 x 750px (desktop)
- Two question UI patterns:
  1. **Image cards** for visual choices (interior/exterior with photos, side by side)
  2. **Pill-shaped/rounded buttons** for yes/no and text-only selections
- Some questions have **circular thumbnail icons** (e.g., texture type)
- Question numbering: "3A.", "4B." etc. (letter = sub-flow identifier)

### Results Page Layout
Three numbered vertical sections, each containing one product card:

1. **Pre-treatment options** - "Recommended to use before coating or treatment"
2. **Main treatment solution** - "Recommended to use to accomplish desired goal and after pre-treatment"
3. **Post-treatment solution** - "Recommended to use for additional protection or enhancement"

Each product card contains:
- Category pill badge (e.g., "One-step cleanser", "Fire-retardant", "Color-series")
- Product name (large, bold)
- Product description paragraph
- Product image (bucket photo, from website)
- "View product" link with arrow icon

Sections with no product are omitted; the count label adjusts (e.g., "2 treatment solutions").

### "What you used prior" Edge Case
When the mapping returns "What you used prior" as the recommendation:
- Show advisory text: "We recommend re-applying the stain you previously used on this project"
- Optionally show "Here are other recommendations" with secondary product suggestions
- No product link for this specific recommendation

---

## Data Model

The Google Sheet has 7 tabs, each representing a different project sub-category. The quiz flow is:

```
Q1: Interior or Exterior?
  Interior:
    Q2: Interior Wood or Concrete?
      Concrete -> skip to results (GID 0)
      Interior Wood -> Q3-Q5 yes/no questions -> results (GID 0)
  Exterior:
    Q2: What type of exterior project? (6 options from Figma)
      - Structural Wood Surfaces -> GID 1623581807
      - Outdoor Living Spaces -> GID 1043945754
      - Concrete & Masonry -> GID 257663984
      - Wood Restoration -> GID 89613080
      - Fencing -> GID 1334082439
      - Roofing / Shakes -> GID 818762569
    Then: category-specific questions -> results
```

Note: Figma shows 6 exterior options including "Wood Docks & Bridges" and "Non-toxic Sealers" but these don't have sheets yet. We'll include them in the UI as disabled/coming-soon or map them once sheets are added.

Each sheet row is a unique combination of answers mapping to a product recommendation. Columns are questions, last 3 columns are always: Main Product Recommendation, Pre-treatment Coatings, Post Treatment.

Key rules:
- `(SKIP)` or `(Skip)` in a cell means that question is skipped for this flow
- `ANY` means the question is asked but any answer leads to the same result for that branch
- "What you used prior" as a product recommendation is a special case (advisory, no product link)
- Some recommendations have multiple products comma-separated (e.g., "Internal Concrete Stabilizer, Paver Stain") meaning the user can pick either

## Sheet GID Map

| GID | Category Key | Label | Figma Label |
|-----|-------------|-------|-------------|
| 0 | interior | Interior (Wood + Concrete) | Interior project |
| 1043945754 | outdoor-living | Outdoor Living | Outdoor Living Spaces |
| 1334082439 | fencing | Fencing | Fencing |
| 1623581807 | structural | Structural Wood Surfaces | Structural Wood Surfaces |
| 257663984 | concrete-masonry | Concrete & Masonry | Concrete & Masonry |
| 818762569 | roofing | Roofing / Shakes | Roofing / Shakes |
| 89613080 | wood-restoration | Wood Restoration | Wood Restoration |

## File Structure

```
app/
  layout.tsx              -- root layout, metadata, Scandia font, brand header
  globals.css             -- Tailwind + Timber Pro brand colors as CSS vars
  page.tsx                -- single page: renders <Quiz /> client component

lib/
  sheets.ts               -- fetchSheetData(): fetches all 7 CSVs, parses into typed data
  quiz-engine.ts           -- pure functions: given parsed data + answers, returns next question or result
  types.ts                 -- TypeScript types: SheetRow, QuizStep, QuizResult, Category
  products.ts              -- product URL mapping (product name -> URL on timberprocoatingsusa.com)

components/
  Quiz.tsx                 -- top-level client component, manages state machine
  QuizHeader.tsx           -- "TIMBERPRO Quiz" branded header bar
  QuestionCard.tsx         -- renders a single question with answer options (image or button variants)
  ResultCard.tsx           -- renders the product recommendation output with numbered treatment steps
  ProductCard.tsx          -- individual product card: image, badge, name, description, link
  ProgressBar.tsx          -- shows quiz progress

scripts/
  scrape-products.ts       -- build-time script: scrapes product pages, outputs public/products.json
```

---

## Chunk 1: Data Layer

### Task 1: Types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add quiz TypeScript types"
```

---

### Task 2: Product URL Mapping + Scraper

**Files:**
- Create: `lib/products.ts`
- Create: `scripts/scrape-products.ts`

- [ ] **Step 1: Create the product URL mapping**

Map each product name that appears in the Google Sheet to its URL on timberprocoatingsusa.com. This is a manual mapping since product names in the sheet don't always match URL slugs exactly.

```typescript
// lib/products.ts

export interface ProductMapping {
  sheetName: string;
  slug: string;
  url: string;
  badge: string;
}

// Map sheet product names to their website URLs and category badges
export const PRODUCT_MAP: ProductMapping[] = [
  { sheetName: "LS Pro", slug: "ls-pro", url: "https://timberprocoatingsusa.com/products/log-siding-classic-semi-solid-series", badge: "Color-series" },
  { sheetName: "LS PRO (Color Series)", slug: "ls-pro-color", url: "https://timberprocoatingsusa.com/products/log-siding-classic-semi-solid-series", badge: "Color-series" },
  { sheetName: "LS Pro (Color Series)", slug: "ls-pro-color", url: "https://timberprocoatingsusa.com/products/log-siding-classic-semi-solid-series", badge: "Color-series" },
  { sheetName: "LS Pro (Clear)", slug: "ls-pro-clear", url: "https://timberprocoatingsusa.com/products/log-siding-classic-semi-solid-series", badge: "Clear sealer" },
  { sheetName: "LSS Formula", slug: "lss-formula", url: "https://timberprocoatingsusa.com/products/lss-formula", badge: "Smooth wood" },
  { sheetName: "LSS (Color Series)", slug: "lss-color", url: "https://timberprocoatingsusa.com/products/lss-formula", badge: "Color-series" },
  { sheetName: "LSS (Clear)", slug: "lss-clear", url: "https://timberprocoatingsusa.com/products/lss-formula", badge: "Clear sealer" },
  { sheetName: "LLS Formula", slug: "lls-formula", url: "https://timberprocoatingsusa.com/products/lss-formula", badge: "Smooth wood" },
  { sheetName: "Clear LS Pro", slug: "clear-ls-pro", url: "https://timberprocoatingsusa.com/products/log-siding-classic-semi-solid-series", badge: "Clear sealer" },
  { sheetName: "Crystal Urethane", slug: "crystal-urethane", url: "https://timberprocoatingsusa.com/products/crystal-urethane", badge: "Interior finish" },
  { sheetName: "Ember Guard", slug: "ember-guard", url: "https://timberprocoatingsusa.com/products/ember-guard", badge: "Fire-retardant" },
  { sheetName: "Ember Guard Pro", slug: "ember-guard-pro", url: "https://timberprocoatingsusa.com/products/ember-guard-pro", badge: "Fire-retardant" },
  { sheetName: "Internal Wood Stabilizer", slug: "internal-wood-stabilizer", url: "https://timberprocoatingsusa.com/products/internal-wood-stabilizer", badge: "Wood protection" },
  { sheetName: "Internal Concrete Stabilizer", slug: "internal-concrete-stabilizer", url: "https://timberprocoatingsusa.com/products/internal-concrete-stabilizer", badge: "Concrete sealer" },
  { sheetName: "Internal Concrete Sealer", slug: "internal-concrete-sealer", url: "https://timberprocoatingsusa.com/products/internal-concrete-stabilizer", badge: "Concrete sealer" },
  { sheetName: "Paver Stain", slug: "paver-stain", url: "https://timberprocoatingsusa.com/products/paver-stain", badge: "Color enhancement" },
  { sheetName: "Clean and Brite", slug: "clean-and-brite", url: "https://timberprocoatingsusa.com/products/clean-brite", badge: "One-step cleanser" },
  { sheetName: "Clean & Brite", slug: "clean-and-brite", url: "https://timberprocoatingsusa.com/products/clean-brite", badge: "One-step cleanser" },
  { sheetName: "Strip & Brite", slug: "strip-and-brite", url: "https://timberprocoatingsusa.com/products/strip-brite", badge: "Wood stripper" },
  { sheetName: "Strip and Brite", slug: "strip-and-brite", url: "https://timberprocoatingsusa.com/products/strip-brite", badge: "Wood stripper" },
  { sheetName: "Deck & Fence", slug: "deck-and-fence", url: "https://timberprocoatingsusa.com/products/deck-fence", badge: "Outdoor protection" },
];

export function findProduct(sheetName: string): ProductMapping | null {
  return PRODUCT_MAP.find((p) => p.sheetName === sheetName) || null;
}
```

Note: Some URLs above are guesses based on naming patterns. The scraper (Task 2 Step 2) will verify which URLs are valid and fill in actual scraped data. Invalid URLs get flagged so we can fix them.

- [ ] **Step 2: Create the build-time scraper script**

This script hits each product URL, scrapes the title, description, and image, and writes a `public/products.json` file that the app reads at runtime.

```typescript
// scripts/scrape-products.ts
// Run with: npx tsx scripts/scrape-products.ts

import { PRODUCT_MAP } from "../lib/products";

interface ScrapedProduct {
  sheetName: string;
  slug: string;
  url: string;
  badge: string;
  name: string;
  description: string;
  image: string;
  price: string;
}

async function scrapeProduct(url: string): Promise<{ name: string; description: string; image: string; price: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();

    // Extract from Open Graph / meta tags (Webflow sites use these reliably)
    const ogTitle = html.match(/<meta property="og:title" content="([^"]*)"/)
    const ogDesc = html.match(/<meta property="og:description" content="([^"]*)"/)
    const ogImage = html.match(/<meta property="og:image" content="([^"]*)"/)

    // Fallback to title tag
    const titleTag = html.match(/<title>([^<]*)<\/title>/);

    const name = ogTitle?.[1] || titleTag?.[1] || "";
    const description = ogDesc?.[1] || "";
    const image = ogImage?.[1] || "";

    // Try to find price
    const priceMatch = html.match(/\$[\d,]+\.?\d*/);
    const price = priceMatch?.[0] || "";

    return { name, description, image, price };
  } catch {
    return null;
  }
}

async function main() {
  // Deduplicate by URL
  const uniqueUrls = [...new Set(PRODUCT_MAP.map((p) => p.url))];
  const scraped: Record<string, Awaited<ReturnType<typeof scrapeProduct>>> = {};

  for (const url of uniqueUrls) {
    console.log(`Scraping: ${url}`);
    scraped[url] = await scrapeProduct(url);
    if (!scraped[url]) console.warn(`  FAILED: ${url}`);
    else console.log(`  OK: ${scraped[url]!.name}`);
  }

  // Build output: merge mapping + scraped data
  const seenSlugs = new Set<string>();
  const products: ScrapedProduct[] = [];

  for (const mapping of PRODUCT_MAP) {
    if (seenSlugs.has(mapping.slug)) continue;
    seenSlugs.add(mapping.slug);

    const data = scraped[mapping.url];
    products.push({
      sheetName: mapping.sheetName,
      slug: mapping.slug,
      url: mapping.url,
      badge: mapping.badge,
      name: data?.name || mapping.sheetName,
      description: data?.description || "",
      image: data?.image || "",
      price: data?.price || "",
    });
  }

  const fs = await import("fs");
  const path = await import("path");
  const outPath = path.join(__dirname, "..", "public", "products.json");
  fs.writeFileSync(outPath, JSON.stringify(products, null, 2));
  console.log(`\nWrote ${products.length} products to ${outPath}`);
}

main();
```

- [ ] **Step 3: Run the scraper and verify output**

Run: `cd /Users/alexzanderflores/Desktop/Clients/WiredStudio/TimberPro/quiz && npx tsx scripts/scrape-products.ts`
Expected: `public/products.json` created with product data. Fix any broken URLs.

- [ ] **Step 4: Commit**

```bash
git add lib/products.ts scripts/scrape-products.ts public/products.json
git commit -m "feat: add product mapping and build-time scraper"
```

---

### Task 3: Sheet Fetcher

**Files:**
- Create: `lib/sheets.ts`

- [ ] **Step 1: Create the sheet fetcher**

Fetches all 7 sheets as CSV, parses into `SheetRow[]` per category.

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/sheets.ts
git commit -m "feat: add Google Sheets CSV fetcher and parser"
```

---

### Task 4: Quiz Engine

**Files:**
- Create: `lib/quiz-engine.ts`

- [ ] **Step 1: Create the quiz engine**

Pure functions that take parsed sheet data and user answers, determine next question or final result. Handles `(SKIP)` logic, `ANY` values, and multi-product results.

```typescript
// lib/quiz-engine.ts
import { SheetRow, QuizResult } from "./types";
import { CATEGORIES } from "./sheets";

const SKIP_VALUES = ["(SKIP)", "(Skip)", "(skip)"];

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
      return cellValue === answer || cellValue === "ANY";
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
        optionsSet.add(val);
      }
    }

    const options = Array.from(optionsSet);
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
      mainProducts,
      preTreatment: row.preTreatment || null,
      postTreatment: row.postTreatment || null,
      isAdvisory,
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/quiz-engine.ts
git commit -m "feat: add quiz engine with branching logic and skip handling"
```

---

## Chunk 2: UI Components

### Task 5: Brand Colors & Layout

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update globals.css with Timber Pro brand colors from Figma**

```css
@import "tailwindcss";

:root {
  --color-bg: #F5D5C8;
  --color-bg-header: #2D3E3F;
  --color-bg-card: #FFFFFF;
  --color-bg-card-hover: #FFF5F0;
  --color-bg-product: #6B8F71;
  --color-stroke: #273618;
  --color-accent-yellow: #E8EC0F;
  --color-accent-brown: #5C4033;
  --color-btn-yes: #C4622A;
  --color-btn-yes-hover: #A8511F;
  --color-btn-no: #FFFFFF;
  --color-text: #1A1A1A;
  --color-text-light: #FFFFFF;
  --color-text-muted: #6B7280;
  --color-badge-olive: #3D5A3E;
  --color-badge-brown: #5C4033;
  --color-number-bg: #5C4033;
}

@theme inline {
  --color-background: var(--color-bg);
  --color-foreground: var(--color-text);
  --font-sans: var(--font-geist-sans);
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: Arial, Helvetica, sans-serif;
  min-height: 100vh;
}
```

- [ ] **Step 2: Update layout.tsx with brand header and metadata**

```typescript
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Timber Pro Product Finder",
  description: "Find the right Timber Pro coating product for your project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: set up Timber Pro brand colors and layout from Figma"
```

---

### Task 6: QuizHeader Component

**Files:**
- Create: `components/QuizHeader.tsx`

- [ ] **Step 1: Create branded header bar**

Matches the Figma design: dark teal bar with "TIMBERPRO" bold uppercase + "Quiz" in italic script.

```tsx
"use client";

export default function QuizHeader() {
  return (
    <header
      className="w-full py-4 px-6"
      style={{ background: "var(--color-bg-header)" }}
    >
      <div className="max-w-5xl mx-auto">
        <span className="text-xl font-bold tracking-widest uppercase" style={{ color: "var(--color-text-light)" }}>
          TIMBERPRO
        </span>
        <span className="text-xl italic ml-2" style={{ color: "var(--color-text-light)", fontStyle: "italic" }}>
          Quiz
        </span>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/QuizHeader.tsx
git commit -m "feat: add branded quiz header component"
```

---

### Task 7: ProgressBar Component

**Files:**
- Create: `components/ProgressBar.tsx`

- [ ] **Step 1: Create progress bar**

```tsx
"use client";

export default function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2" style={{ color: "var(--color-text-muted)" }}>
        <span>Question {current} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ background: "var(--color-stroke)", opacity: 0.2 }}>
        <div
          className="h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: "var(--color-btn-yes)" }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ProgressBar.tsx
git commit -m "feat: add progress bar component"
```

---

### Task 8: QuestionCard Component

**Files:**
- Create: `components/QuestionCard.tsx`

- [ ] **Step 1: Create question card with two display modes**

Supports image cards (for the first interior/exterior question and exterior sub-categories) and pill-style buttons (for yes/no and text options). Matches the Figma: white card backgrounds with `#273618` stroke outlines.

```tsx
"use client";

interface QuestionCardProps {
  question: string;
  options: string[];
  onSelect: (answer: string) => void;
  variant?: "image-cards" | "buttons" | "grid";
  descriptions?: Record<string, string>;
}

export default function QuestionCard({ question, options, onSelect, variant = "buttons", descriptions }: QuestionCardProps) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-8 text-center" style={{ color: "var(--color-text)" }}>
        {question}
      </h2>

      {variant === "grid" ? (
        <div className="grid grid-cols-2 gap-4">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => onSelect(option)}
              className="p-5 rounded-xl text-left transition-all duration-200 cursor-pointer border-2"
              style={{
                background: "var(--color-bg-card)",
                borderColor: "var(--color-stroke)",
                color: "var(--color-text)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-btn-yes)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-stroke)";
              }}
            >
              <span className="text-lg font-semibold block">{option}</span>
              {descriptions?.[option] && (
                <span className="text-sm mt-1 block" style={{ color: "var(--color-text-muted)" }}>
                  {descriptions[option]}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 items-center">
          {options.map((option) => {
            const isYes = option.toLowerCase() === "yes";
            const isNo = option.toLowerCase() === "no";
            const isBinary = options.length === 2 && options.some((o) => o.toLowerCase() === "yes");

            return (
              <button
                key={option}
                onClick={() => onSelect(option)}
                className="w-full max-w-md px-6 py-4 rounded-xl text-lg font-medium transition-all duration-200 cursor-pointer border-2"
                style={{
                  background: isBinary && isYes ? "var(--color-btn-yes)" : "var(--color-bg-card)",
                  borderColor: "var(--color-stroke)",
                  color: isBinary && isYes ? "var(--color-text-light)" : "var(--color-text)",
                }}
                onMouseEnter={(e) => {
                  if (!(isBinary && isYes)) {
                    e.currentTarget.style.background = "var(--color-bg-card-hover)";
                  }
                  e.currentTarget.style.borderColor = "var(--color-btn-yes)";
                }}
                onMouseLeave={(e) => {
                  if (!(isBinary && isYes)) {
                    e.currentTarget.style.background = "var(--color-bg-card)";
                  }
                  e.currentTarget.style.borderColor = "var(--color-stroke)";
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/QuestionCard.tsx
git commit -m "feat: add question card with image and button variants"
```

---

### Task 9: ProductCard Component

**Files:**
- Create: `components/ProductCard.tsx`

- [ ] **Step 1: Create individual product card**

Matches the Figma results page: sage green background, product image on left, category badge pill, product name, description, "View product" link with arrow.

```tsx
"use client";

import { ProductInfo } from "@/lib/types";

interface ProductCardProps {
  product: ProductInfo | null;
  productName: string;
}

export default function ProductCard({ product, productName }: ProductCardProps) {
  if (!product) {
    return (
      <div
        className="p-5 rounded-xl"
        style={{ background: "var(--color-bg-product)" }}
      >
        <h4 className="text-lg font-semibold" style={{ color: "var(--color-text-light)" }}>
          {productName}
        </h4>
      </div>
    );
  }

  return (
    <div
      className="p-5 rounded-xl flex gap-5"
      style={{ background: "var(--color-bg-product)" }}
    >
      {product.image && (
        <div className="flex-shrink-0 w-28 h-28 rounded-lg overflow-hidden">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {product.badge && (
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-2"
            style={{ background: "var(--color-badge-olive)", color: "var(--color-text-light)" }}
          >
            {product.badge}
          </span>
        )}
        <h4 className="text-lg font-semibold mb-1" style={{ color: "var(--color-text-light)" }}>
          {product.name}
        </h4>
        {product.description && (
          <p className="text-sm mb-3 line-clamp-3" style={{ color: "var(--color-text-light)", opacity: 0.85 }}>
            {product.description}
          </p>
        )}
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium"
          style={{ color: "var(--color-text-light)" }}
        >
          View product
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ProductCard.tsx
git commit -m "feat: add product card component matching Figma design"
```

---

### Task 10: ResultCard Component

**Files:**
- Create: `components/ResultCard.tsx`

- [ ] **Step 1: Create results page with numbered treatment steps**

Matches Figma: "Your results" / "Recommended products" heading, then numbered sections (1. Pre-treatment, 2. Main treatment, 3. Post-treatment) each containing a ProductCard. Handles the "What you used prior" advisory case.

```tsx
"use client";

import { QuizResult, ProductInfo } from "@/lib/types";
import ProductCard from "./ProductCard";

interface ResultCardProps {
  result: QuizResult;
  products: Record<string, ProductInfo>;
  onRestart: () => void;
}

interface TreatmentStep {
  label: string;
  subtitle: string;
  productNames: string[];
}

export default function ResultCard({ result, products, onRestart }: ResultCardProps) {
  const steps: TreatmentStep[] = [];

  if (result.preTreatment) {
    steps.push({
      label: "Pre-treatment options",
      subtitle: "Recommended to use before coating or treatment",
      productNames: result.preTreatment.split(",").map((p) => p.trim()).filter(Boolean),
    });
  }

  steps.push({
    label: "Main treatment solution",
    subtitle: "Recommended to use to accomplish desired goal and after pre-treatment",
    productNames: result.mainProducts.filter((p) => p.toLowerCase() !== "what you used prior"),
  });

  if (result.postTreatment) {
    steps.push({
      label: "Post-treatment solution",
      subtitle: "Recommended to use for additional protection or enhancement",
      productNames: result.postTreatment.split(",").map((p) => p.trim()).filter(Boolean),
    });
  }

  // Filter out empty steps
  const activeSteps = steps.filter((s) => s.productNames.length > 0);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <p className="text-center text-sm italic mb-1" style={{ color: "var(--color-text-muted)" }}>
        Your results
      </p>
      <h2 className="text-3xl font-bold mb-8 text-center" style={{ color: "var(--color-text)" }}>
        Recommended products
      </h2>

      {result.isAdvisory && (
        <div
          className="p-5 rounded-xl mb-6 text-center border-2"
          style={{ borderColor: "var(--color-btn-yes)", background: "var(--color-bg-card)" }}
        >
          <p className="text-lg font-medium" style={{ color: "var(--color-text)" }}>
            We recommend re-applying the stain you previously used on this project.
          </p>
          {activeSteps.length > 0 && (
            <p className="text-sm mt-2" style={{ color: "var(--color-text-muted)" }}>
              Here are additional recommended products:
            </p>
          )}
        </div>
      )}

      <div className="space-y-6">
        {activeSteps.map((step, i) => (
          <div key={step.label}>
            <div className="flex items-center gap-3 mb-3">
              <span
                className="flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold"
                style={{ background: "var(--color-number-bg)", color: "var(--color-text-light)" }}
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
                  {step.label}
                </h3>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {step.subtitle}
                </p>
              </div>
            </div>
            <div className="ml-12 space-y-3">
              {step.productNames.map((name) => (
                <ProductCard
                  key={name}
                  productName={name}
                  product={products[name] || null}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-center mt-6 text-sm" style={{ color: "var(--color-text-muted)" }}>
        {activeSteps.length} treatment {activeSteps.length === 1 ? "solution" : "solutions"} recommended
      </p>

      <div className="mt-8 text-center">
        <button
          onClick={onRestart}
          className="px-8 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer"
          style={{ background: "var(--color-btn-yes)", color: "var(--color-text-light)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-btn-yes-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-btn-yes)")}
        >
          Take Quiz Again
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ResultCard.tsx
git commit -m "feat: add result card with numbered treatment steps and product cards"
```

---

## Chunk 3: Main Quiz + Page

### Task 11: Quiz Component (State Machine)

**Files:**
- Create: `components/Quiz.tsx`

- [ ] **Step 1: Create main quiz component**

Manages the state machine: loading -> top-level -> sub-category (if exterior) -> category questions -> result. Loads products.json for the results page. Handles back navigation with history stack.

The Quiz component should:
1. Fetch sheet data and products.json on mount
2. Render QuizHeader at top
3. Show ProgressBar during questions
4. Show QuestionCard with `variant="grid"` for the exterior sub-category selection (6 options in 2-column grid with descriptions)
5. Show QuestionCard with `variant="buttons"` for yes/no and other text questions
6. Show ResultCard when quiz is complete
7. Support back button with full history

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAllSheets, CATEGORIES, EXTERIOR_CATEGORIES } from "@/lib/sheets";
import { getNextStep } from "@/lib/quiz-engine";
import { SheetRow, QuizState, QuizResult, ProductInfo } from "@/lib/types";
import QuizHeader from "./QuizHeader";
import QuestionCard from "./QuestionCard";
import ResultCard from "./ResultCard";
import ProgressBar from "./ProgressBar";

export default function Quiz() {
  const [sheetData, setSheetData] = useState<Record<string, SheetRow[]> | null>(null);
  const [products, setProducts] = useState<Record<string, ProductInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<QuizState>({ phase: "top-level" });
  const [history, setHistory] = useState<QuizState[]>([]);

  useEffect(() => {
    Promise.all([
      fetchAllSheets(),
      fetch("/products.json").then((r) => r.ok ? r.json() : []),
    ])
      .then(([sheets, productList]) => {
        setSheetData(sheets);
        const productMap: Record<string, ProductInfo> = {};
        for (const p of productList) {
          productMap[p.sheetName] = p;
        }
        setProducts(productMap);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const pushState = useCallback((newState: QuizState) => {
    setState((prev) => {
      setHistory((h) => [...h, prev]);
      return newState;
    });
  }, []);

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const previous = newHistory.pop()!;
      setState(previous);
      return newHistory;
    });
  }, []);

  const restart = useCallback(() => {
    setState({ phase: "top-level" });
    setHistory([]);
  }, []);

  const handleTopLevel = useCallback((answer: string) => {
    if (answer === "Interior Project") {
      pushState({ phase: "questions", categoryKey: "interior", answers: {}, currentQuestionIndex: 0 });
    } else {
      pushState({ phase: "sub-category" });
    }
  }, [pushState]);

  const handleSubCategory = useCallback((categoryKey: string) => {
    pushState({ phase: "questions", categoryKey, answers: {}, currentQuestionIndex: 0 });
  }, [pushState]);

  const handleAnswer = useCallback((question: string, answer: string) => {
    if (!sheetData) return;
    setState((prev) => {
      if (prev.phase !== "questions") return prev;
      const newAnswers = { ...prev.answers, [question]: answer };
      const categoryData = sheetData[prev.categoryKey];
      const nextStep = getNextStep(prev.categoryKey, categoryData, newAnswers);
      setHistory((h) => [...h, prev]);
      if (nextStep.type === "result") {
        return { phase: "result", result: nextStep.result };
      }
      return { ...prev, answers: newAnswers, currentQuestionIndex: prev.currentQuestionIndex + 1 };
    });
  }, [sheetData]);

  const getProgress = (): { current: number; total: number } => {
    if (state.phase === "top-level") return { current: 1, total: 1 };
    if (state.phase === "sub-category") return { current: 2, total: 2 };
    if (state.phase === "questions") {
      const cat = CATEGORIES.find((c) => c.key === state.categoryKey);
      const extraSteps = state.categoryKey === "interior" ? 1 : 2;
      const total = (cat?.questionColumns.length || 0) + extraSteps;
      return { current: state.currentQuestionIndex + 1 + extraSteps, total };
    }
    return { current: 1, total: 1 };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div
            className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: "var(--color-stroke)", borderTopColor: "var(--color-btn-yes)", opacity: 0.6 }}
          />
          <p style={{ color: "var(--color-text-muted)" }}>Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-red-600">Failed to load quiz: {error}</p>
      </div>
    );
  }

  const progress = getProgress();
  const extDescriptions: Record<string, string> = {};
  for (const cat of EXTERIOR_CATEGORIES) {
    extDescriptions[cat.label] = cat.description;
  }

  return (
    <div className="w-full">
      <QuizHeader />
      <div className="max-w-3xl mx-auto px-4 py-10">
        {state.phase !== "result" && (
          <div className="mb-8">
            <ProgressBar current={progress.current} total={progress.total} />
          </div>
        )}

        {history.length > 0 && state.phase !== "result" && (
          <button onClick={goBack} className="mb-6 text-sm cursor-pointer" style={{ color: "var(--color-text-muted)" }}>
            &larr; Back
          </button>
        )}

        {state.phase === "top-level" && (
          <QuestionCard
            question="What type of project are you working on?"
            options={["Interior Project", "Exterior Project"]}
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
              if (cat) handleSubCategory(cat.key);
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
              onSelect={(answer) => handleAnswer(step.questionText, answer)}
            />
          );
        })()}

        {state.phase === "result" && (
          <ResultCard result={state.result} products={products} onRestart={restart} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Quiz.tsx
git commit -m "feat: add main quiz state machine with all phases"
```

---

### Task 12: Wire Up the Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace page.tsx**

```tsx
import Quiz from "@/components/Quiz";

export default function Home() {
  return <Quiz />;
}
```

- [ ] **Step 2: Clean up scaffold files**

```bash
rm -f public/next.svg public/vercel.svg public/file-text.svg public/globe.svg public/window.svg
```

- [ ] **Step 3: Build and verify**

Run: `cd /Users/alexzanderflores/Desktop/Clients/WiredStudio/TimberPro/quiz && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: wire up quiz page and clean scaffold"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | TypeScript types | `lib/types.ts` |
| 2 | Product URL mapping + scraper | `lib/products.ts`, `scripts/scrape-products.ts` |
| 3 | Google Sheets CSV fetcher/parser | `lib/sheets.ts` |
| 4 | Quiz engine (branching, skip, ANY) | `lib/quiz-engine.ts` |
| 5 | Brand colors & layout (from Figma) | `app/globals.css`, `app/layout.tsx` |
| 6 | Branded header | `components/QuizHeader.tsx` |
| 7 | Progress bar | `components/ProgressBar.tsx` |
| 8 | Question card (image + button variants) | `components/QuestionCard.tsx` |
| 9 | Product card (image, badge, desc, link) | `components/ProductCard.tsx` |
| 10 | Result card (numbered treatment steps) | `components/ResultCard.tsx` |
| 11 | Main quiz state machine | `components/Quiz.tsx` |
| 12 | Wire to page + cleanup | `app/page.tsx` |

**Key design decisions:**
- Warm salmon/pink background, dark teal header, sage green product cards (all from Figma)
- Product data scraped at build time from timberprocoatingsusa.com, cached as static JSON
- Two question UI modes: grid cards (for multi-option) and pill buttons (for yes/no)
- Yes button = burnt orange/terracotta, No button = white (from Figma)
- Back button with full history stack
- "What you used prior" renders as advisory text with optional secondary recommendations
- Dynamic section count on results page (omit empty pre/post treatment)
- Google Sheet fetched client-side via public CSV endpoint (no auth, works on Vercel)
