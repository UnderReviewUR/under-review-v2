/** Shared string normalizer (no React) — safe for Node tests and client bundles. */
export function normalizeText(v) {
  return String(v || "").trim().toLowerCase();
}
