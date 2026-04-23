/**
 * Surface split for tennis ingestion:
 * - `intent=home` — upcoming/live only; no recently-finished retention window.
 * - `intent=board` (default) — board/history may keep ~54h finals for context.
 */

export function shouldRetainRecentFinishedTennisFinals(intent) {
  return String(intent || "board").toLowerCase() !== "home";
}
