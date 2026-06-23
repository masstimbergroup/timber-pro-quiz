// lib/url-codec.ts
//
// Single source of truth for encoding/decoding the shareable `?p=` quiz URL, used by
// both the live quiz (components/Quiz.tsx) and the debug path tester
// (components/DebugPanel.tsx) so the two encoders can never drift.
//
// Categories are now discovered dynamically from the sheet tabs, so a category's URL
// token is its stable `slug` (derived from the tab gid; see lib/sheets.ts), never its
// (mutable) label. Three layers keep every link working:
//   - New links encode the stable slug (>= 2 chars).
//   - Pre-rename links used the shortest unique prefix of the OLD label, always a
//     single character {s, o, c, w, f, r}. Because every slug is >= 2 chars, a 1-char
//     legacy token and a slug can never be confused. The legacy codes map to the
//     successor tab's gid (f -> Docks & Bridges, r -> Non-Toxic).
//   - Resolution is always against the live category list, so a token only resolves to
//     a category that actually exists right now.
//
// Question steps (answers within a category) are still encoded as shortest-unique
// prefixes of the live sheet answer text.

import { CategoryConfig } from "./types";

export interface Selection {
  answer: string;
  options: string[];
  // Stable token override. When set (the exterior category step), it is emitted
  // verbatim instead of a label prefix.
  code?: string;
}

// Find the shortest prefix of `selected` that uniquely identifies it among `options`.
export function shortPrefix(selected: string, options: string[]): string {
  const sel = selected.toLowerCase();
  const others = options.filter((o) => o !== selected).map((o) => o.toLowerCase());

  for (let len = 1; len <= sel.length; len++) {
    const prefix = sel.slice(0, len);
    const ambiguous = others.some((o) => o.startsWith(prefix));
    if (!ambiguous) return prefix;
  }
  return sel;
}

// Match a prefix against options, returning the matching option (or null).
export function matchPrefix(prefix: string, options: string[]): string | null {
  const p = prefix.toLowerCase();
  const matches = options.filter((o) => o.toLowerCase().startsWith(p));
  if (matches.length === 1) return matches[0];
  const exact = options.find((o) => o.toLowerCase() === p);
  if (exact) return exact;
  return matches[0] || null;
}

export function encodeSelections(selections: Selection[]): string {
  return selections
    .map((s) => s.code ?? shortPrefix(s.answer, s.options))
    .join("-");
}

// Frozen legacy 1-char codes (shortest unique prefix of the PRE-RENAME labels) mapped
// to the successor tab's gid. Never edit — purely to keep links created before the
// rename working. f/r intentionally point at the repurposed Docks & Bridges / Non-Toxic
// tabs.
const LEGACY_EXTERIOR_CODES: Record<string, string> = {
  s: "1623581807", // Structural
  o: "1043945754", // Outdoor Living
  c: "257663984", // Concrete
  w: "89613080", // Restoration
  f: "1334082439", // Fencing -> Docks & Bridges
  r: "818762569", // Roofing / Shakes -> Non-Toxic
};

// Resolve an exterior-category token from the `?p=` URL to a live category. Tries the
// stable slug first, then the legacy 1-char -> gid map. Returns null for anything
// unrecognized so the caller can fail safe to the category picker.
export function resolveExteriorToken(
  token: string,
  exteriorCategories: CategoryConfig[]
): CategoryConfig | null {
  const bySlug = exteriorCategories.find((c) => c.slug === token);
  if (bySlug) return bySlug;

  const gid = LEGACY_EXTERIOR_CODES[token.toLowerCase()];
  if (gid) {
    const byGid = exteriorCategories.find((c) => c.gid === gid);
    if (byGid) return byGid;
  }
  return null;
}
