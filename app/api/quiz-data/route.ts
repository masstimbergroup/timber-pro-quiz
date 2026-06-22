import { fetchAllSheets, SHEET_REVALIDATE_SECONDS } from "@/lib/sheets";

// Server-side fetch of all quiz sheet tabs, served from cache.
//
// The browser hits this single same-origin endpoint instead of making 7 separate,
// uncacheable, redirect-heavy requests straight to Google's CSV export (~0.7s each,
// `cache-control: no-store`) on every page load — the cause of the slow / stuck
// "Loading quiz..." spinner.
//
// Caching is two-layered and intentionally decoupled from the build (the route is a
// normal dynamic handler, so a Google outage can never fail a deploy or get a stale
// error frozen into the build):
//   1. Each per-tab fetch is held in Next's Data Cache for SHEET_REVALIDATE_SECONDS
//      (see lib/sheets.ts), so Google is hit at most once per window across all
//      visitors — even on an edge-cache miss.
//   2. The successful response is edge-cached for the same window with
//      stale-while-revalidate, so visitors are served instantly and never blocked on
//      Google. Errors are explicitly NOT cached, so a transient failure self-heals on
//      the next request.
// Sheet edits go live within ~SHEET_REVALIDATE_SECONDS.
export async function GET() {
  try {
    const data = await fetchAllSheets();
    return Response.json(data, {
      headers: {
        "Cache-Control": `public, s-maxage=${SHEET_REVALIDATE_SECONDS}, stale-while-revalidate=300`,
      },
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to load quiz data" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
