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

/**
 * When a line is `Known label: body` (colon + space + rest), split for gradient label + plain body.
 * Returns null for heading-only lines, unknown labels, or lines without `: `.
 */
export function extractUrTakeSectionHeading(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed) return null;

  const colonIdx = trimmed.indexOf(": ");
  if (colonIdx === -1) return null;

  const candidate = trimmed.slice(0, colonIdx);
  const body = trimmed.slice(colonIdx + 2);

  const matchesHeading =
    isUrTakeSectionHeading(candidate) || isUrTakeSectionHeading(`${candidate}:`);

  if (body.trim().length > 0 && matchesHeading) {
    return {
      label: candidate,
      body: body.trim(),
    };
  }
  return null;
}
