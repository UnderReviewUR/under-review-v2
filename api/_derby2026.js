/**
 * UR Take: Derby model appendix — canonical data from `shared/data/derby2026.js`.
 */

import {
  DERBY_2026,
  DERBY_EXPIRES,
  isDerbyActive,
} from "../shared/data/derby2026.js";

export { DERBY_2026, DERBY_EXPIRES, isDerbyActive };

const MAX_DERBY_CONTEXT_CHARS = 3000;

const SCRATCH_ALERT =
  "SCRATCH ALERT: The Puma (Post 9) scratched morning of race May 2 — swollen pastern and skin infection. Do not recommend The Puma. Castellano-Delgado reunion does not run. Commandment jockey is Luis Saez (confirmed).";

/** Max length for main block so alert + two newlines + main ≤ MAX_DERBY_CONTEXT_CHARS */
const INNER_MAX_DERBY_CONTEXT =
  MAX_DERBY_CONTEXT_CHARS - SCRATCH_ALERT.length - 2;

function parseOddsSortKey(odds) {
  const s = String(odds || "").trim().toUpperCase();
  if (!s || s === "TBD" || s === "UNKNOWN") return 9999;
  const m = s.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+)$/);
  if (m) return Number(m[1]);
  return 9999;
}

function slimHorseRow(h) {
  const row = {
    post: h.post,
    name: h.name,
    odds: h.odds,
    jockey: h.jockey,
    trainer: h.trainer,
    style: h.style,
    prepRace: h.keyRace,
    edge: h.edge,
    verdict: h.verdict,
  };
  if (h.jockeyNote) row.jockeyNote = h.jockeyNote;
  return row;
}

function buildStructuredPayload(fieldSubset) {
  const d = DERBY_2026;
  return {
    event: {
      race: d.race,
      date: d.date,
      postTime: d.postTime,
      ...(d.scratchedNote ? { scratchedNote: d.scratchedNote } : {}),
      track: d.track,
      tv: d.tv,
      trackCondition: d.trackCondition,
      weather: d.weather,
      distance: d.distance,
    },
    horses: fieldSubset.map(slimHorseRow),
    topPlays: d.topPlays,
    keyAngles: d.keyAngles,
  };
}

function buildEditorialText() {
  const d = DERBY_2026;
  return [
    "TOP PLAYS (editorial — must stay consistent with JSON.horses and JSON.topPlays)",
    `Win: ${(d.topPlays?.win || []).join("; ")}`,
    `Place: ${(d.topPlays?.place || []).join("; ")}`,
    `Contenders: ${(d.topPlays?.contenders || []).join("; ")}`,
    `Exotic inclusions: ${(d.topPlays?.exoticInclusions || []).join("; ")}`,
    `Fade: ${(d.topPlays?.fade || []).join("; ")}`,
    `Exacta box (editorial): ${d.topPlays?.exactaBox || ""}`,
    "",
    "KEY STRUCTURAL ANGLES",
    ...(d.keyAngles || []).map((a) => `• ${a}`),
  ].join("\n");
}

function buildReadableFieldLines(fieldSubset) {
  return fieldSubset
    .map(
      (h) =>
        `${h.post}. ${h.name} (${h.odds}) — ${h.jockey} / ${h.trainer} — ${String(h.verdict || "").slice(0, 120)}`,
    )
    .join("\n");
}

/**
 * Structured JSON (grounding) + readable editorial blocks for the model.
 */
export function buildDerbyContext(at = new Date()) {
  if (!isDerbyActive(at)) return "";

  let field = Array.isArray(DERBY_2026.field) ? [...DERBY_2026.field] : [];

  const assemble = (subset, truncatedNote = "") => {
    const payload = buildStructuredPayload(subset);
    const jsonBlock = JSON.stringify(payload);
    const editorial = buildEditorialText();
    const scanLines = buildReadableFieldLines(subset);
    return [
      "KENTUCKY DERBY 2026 — STRUCTURED DATA (JSON is authoritative for runners; odds are morning-line / editorial static — not live markets)",
      jsonBlock,
      "",
      "READABLE EDITORIAL SUMMARY",
      editorial,
      "",
      "SCAN LINES (quick reference; must match JSON)",
      scanLines,
      truncatedNote,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const withAlert = (main) => `${SCRATCH_ALERT}\n\n${main}`;

  let body = assemble(field);
  if (body.length <= INNER_MAX_DERBY_CONTEXT) return withAlert(body);

  field = field
    .map((h) => ({ ...h, _k: parseOddsSortKey(h.odds) }))
    .sort((a, b) => a._k - b._k)
    .slice(0, 12)
    .map(({ _k, ...rest }) => rest);

  const note =
    "\n(Truncated to top 12 by morning-line order; full field exists in product JSON.)";
  body = assemble(field, note);

  if (body.length > INNER_MAX_DERBY_CONTEXT) {
    const editorial = buildEditorialText();
    const scanLines = buildReadableFieldLines(field);
    body = [
      "KENTUCKY DERBY 2026 — EDITORIAL SUMMARY (full JSON omitted for length)",
      "",
      editorial,
      "",
      "SCAN LINES",
      scanLines,
    ].join("\n");
    if (body.length > INNER_MAX_DERBY_CONTEXT) {
      body = body.slice(0, INNER_MAX_DERBY_CONTEXT - 3) + "...";
    }
  }

  return withAlert(body);
}
