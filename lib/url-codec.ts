// lib/url-codec.ts
//
// Single source of truth for encoding/decoding the shareable `?p=` quiz URL.
// Both the live quiz (components/Quiz.tsx) and the debug path tester
// (components/DebugPanel.tsx) use these helpers so the two encoders can never drift.
//
// Design goals (bulletproof against label changes):
//   - The EXTERIOR CATEGORY step is encoded with a stable `slug` (>= 2 chars) that
//     never changes when a label is renamed. New links are therefore immune to
//     future label edits.
//   - OLD links (created before categories were renamed) encoded the category as the
//     shortest unique prefix of the OLD label, which was always a single character
//     {s, o, c, w, f, r}. Because every new slug is >= 2 chars, there is ZERO overlap
//     between the two schemes, so an old token and a new token can never be confused.
//   - The two repurposed tabs (old "Fencing" gid -> Docks & Bridges, old "Roofing"
//     gid -> Non-Toxic) map their legacy codes to the CURRENT successor category, so
//     an old Roofing link resolves to Non-Toxic (the correct successor) instead of
//     silently matching "Restoration" by prefix.
//
// Question steps (the answers within a category) are still encoded as shortest-unique
// prefixes of the live sheet answer text. For the 4 categories whose sheet content is
// unchanged, old question prefixes still replay perfectly. For the 2 repurposed tabs
// whose content changed, old question prefixes simply stop matching and the replay
// halts gracefully at that category's first question (handled by the caller). No
// crash, no wrong category, no wrong product.

import { CategoryConfig } from "./types";
import { EXTERIOR_CATEGORIES } from "./sheets";

export interface Selection {
  answer: string;
  options: string[];
  // Stable token override. When set (the exterior category step), it is emitted
  // verbatim instead of a label prefix. Decoupling the category token from the
  // label is what makes old + new links both resolve correctly.
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
  // Exact match fallback
  const exact = options.find((o) => o.toLowerCase() === p);
  if (exact) return exact;
  return matches[0] || null;
}

export function encodeSelections(selections: Selection[]): string {
  return selections
    .map((s) => s.code ?? shortPrefix(s.answer, s.options))
    .join("-");
}

// Legacy single-character category codes (shortest unique prefix of the PRE-RENAME
// labels) mapped to the CURRENT category key. Frozen on purpose — never edit these,
// they exist solely to keep links created before the rename working.
//   s -> "Structural Wood Surfaces"  o -> "Outdoor Living Spaces"
//   c -> "Concrete & Masonry"        w -> "Wood Restoration"
//   f -> "Fencing" (tab repurposed to Docks & Bridges)
//   r -> "Roofing / Shakes" (tab repurposed to Non-Toxic)
const LEGACY_EXTERIOR_CODES: Record<string, string> = {
  s: "structural",
  o: "outdoor-living",
  c: "concrete",
  w: "restoration",
  f: "docks-bridges",
  r: "non-toxic",
};

// Resolve an exterior-category token from the `?p=` URL to its category config.
// Tries the new stable slug first, then the legacy single-char scheme. Returns null
// for anything unrecognized so the caller can fail safe to the category picker
// instead of guessing.
export function resolveExteriorToken(token: string): CategoryConfig | null {
  const bySlug = EXTERIOR_CATEGORIES.find((c) => c.slug === token);
  if (bySlug) return bySlug;

  const legacyKey = LEGACY_EXTERIOR_CODES[token.toLowerCase()];
  if (legacyKey) {
    const cat = EXTERIOR_CATEGORIES.find((c) => c.key === legacyKey);
    if (cat) return cat;
  }
  return null;
}
