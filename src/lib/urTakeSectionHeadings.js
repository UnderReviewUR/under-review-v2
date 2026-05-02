/**
 * UR Take section labels — presentation layer only (chat renderer applies gradient).
 * Normalize so "Confidence", "CONFIDENCE:", "**THE PLAY**" (after markdown strip) all match.
 */
const LABELS = [
  "THE PLAY",
  "MARKET MISTAKE",
  "WHY IT FLIPS",
  "LIVE TRIGGER",
  "CONFIDENCE",
  "BIGGEST STRENGTH",
  "BIGGEST RISK",
  "BEST KEEP",
  "FIRST CUT",
  "SLIP VERDICT",
  "OPENING TAKE",
  "TIMING",
  "FINAL VERDICT",
  "RECOMMENDATION",
];

const NORMALIZED = new Set(LABELS.map((s) => s.toUpperCase()));

export function normalizeUrTakeSectionHeadingKey(line) {
  return String(line || "")
    .trim()
    .replace(/:$/, "")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

/** True when the whole line is a recognized UR Take section heading (optional trailing colon). */
export function isUrTakeSectionHeading(line) {
  const key = normalizeUrTakeSectionHeadingKey(line);
  if (!key) return false;
  return NORMALIZED.has(key);
}
