/**
 * NBA Finals UR Take — forced structured JSON (WC-style), not prose parsing.
 */

import { buildNbaFinalsDisplayHeadline } from "./nbaFinalsTakeDisplay.js";

const CONFIDENCE_VALUES = new Set(["High", "Medium", "Speculative"]);

const FIELD_ALIASES = {
  sharpAngle: ["sharpAngle", "sharp_angle", "sharp angle"],
  context: ["context"],
  thePlay: ["thePlay", "the_play", "the play"],
  confidence: ["confidence"],
  watchFor: ["watchFor", "watch_for", "watch for", "liveTrigger", "live_trigger"],
  oneThing: ["oneThing", "one_thing", "one thing"],
};

/**
 * @param {Record<string, unknown> | null | undefined} raw
 */
export function normalizeNbaFinalsStructuredFields(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  /** @type {Record<string, string>} */
  const out = {};
  const lowerMap = new Map();
  for (const [k, v] of Object.entries(raw)) {
    lowerMap.set(String(k).toLowerCase().replace(/[\s_]+/g, ""), v);
  }

  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const key = alias.toLowerCase().replace(/[\s_]+/g, "");
      const val = raw[alias] ?? lowerMap.get(key);
      if (val != null && String(val).trim()) {
        out[canonical] = String(val).trim();
        break;
      }
    }
  }

  if (out.confidence) {
    const c = out.confidence.trim();
    if (/^high\b/i.test(c)) out.confidence = "High";
    else if (/^medium\b/i.test(c)) out.confidence = "Medium";
    else if (/^speculative\b/i.test(c)) out.confidence = "Speculative";
  }

  return Object.keys(out).length >= 4 ? out : null;
}

/**
 * @param {Record<string, string> | null | undefined} fields
 */
export function validateNbaFinalsStructuredResponse(fields) {
  const errors = [];
  if (!fields || typeof fields !== "object") {
    return { valid: false, errors: ["missing_fields_object"] };
  }

  const required = ["sharpAngle", "context", "thePlay", "confidence", "watchFor", "oneThing"];
  for (const key of required) {
    const val = String(fields[key] || "").trim();
    if (!val) errors.push(`missing_${key}`);
    else if (key === "sharpAngle" && val.length > 120) errors.push("sharpAngle_too_long");
    else if (key === "context" && val.length > 500) errors.push("context_too_long");
    else if (key === "thePlay" && val.length > 160) errors.push("thePlay_too_long");
    else if (key === "watchFor" && val.length > 220) errors.push("watchFor_too_long");
    else if (key === "oneThing" && val.length > 280) errors.push("oneThing_too_long");
  }

  if (fields.confidence && !CONFIDENCE_VALUES.has(fields.confidence)) {
    errors.push("invalid_confidence");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * @param {Record<string, string>} fields
 * @param {object | null | undefined} seriesState
 * @param {string} [question]
 * @param {object | null} [nbaRelevance]
 */
export function buildNbaFinalsStructuredForDelivery(
  fields,
  seriesState = null,
  question = "",
  nbaRelevance = null,
) {
  const rel = {
    finalsMode: true,
    finalsGameNumber: seriesState?.gameNumber ?? nbaRelevance?.finalsGameNumber ?? null,
    finalsSeriesSummary:
      seriesState?.seriesScoreLabel ?? nbaRelevance?.finalsSeriesSummary ?? null,
    finalsMatchupLabel:
      seriesState?.tonightMatchupLabel ?? nbaRelevance?.finalsMatchupLabel ?? null,
    finalsVenueLabel: seriesState?.venueLabel ?? nbaRelevance?.finalsVenueLabel ?? null,
  };

  return {
    callType: "nba_finals",
    sport: "NBA",
    sharpAngle: String(fields.sharpAngle || "").trim(),
    context: String(fields.context || "").trim(),
    thePlay: String(fields.thePlay || "").trim(),
    confidence: String(fields.confidence || "Medium").trim(),
    watchFor: String(fields.watchFor || "").trim(),
    oneThing: String(fields.oneThing || "").trim(),
    headline: buildNbaFinalsDisplayHeadline(rel, question) || null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * @param {object | null | undefined} structured
 */
export function isNbaFinalsStructured(structured) {
  return (
    structured &&
    typeof structured === "object" &&
    String(structured.callType || "").toLowerCase() === "nba_finals"
  );
}

/**
 * @param {object | null | undefined} structured
 */
export function nbaFinalsStructuredToCardSections(structured) {
  if (!isNbaFinalsStructured(structured)) return null;
  return {
    sharpAngle: structured.sharpAngle || null,
    context: structured.context || null,
    thePlay: structured.thePlay || null,
    confidence: structured.confidence || null,
    watchFor: structured.watchFor || null,
    oneThing: structured.oneThing || null,
    parsed: true,
  };
}

/**
 * @param {object} structured
 */
export function formatNbaFinalsStructuredDisplayText(structured) {
  if (!structured) return "";
  return [
    `SHARP ANGLE: ${structured.sharpAngle || ""}`,
    `Context: ${structured.context || ""}`,
    `The Play: ${structured.thePlay || ""}`,
    `Confidence: ${structured.confidence || "Medium"}`,
    `Watch For: ${structured.watchFor || ""}`,
    `One Thing: ${structured.oneThing || ""}`,
  ]
    .filter((line) => {
      const body = line.split(":").slice(1).join(":").trim();
      return body.length > 0;
    })
    .join("\n");
}

export const NBA_FINALS_STRUCTURED_JSON_CONTRACT = `OUTPUT CONTRACT — NBA FINALS SCANNABLE TAKE (mandatory)

Return ONLY valid JSON with exactly these keys (all string values):
{"sharpAngle":"...","context":"...","thePlay":"...","confidence":"High|Medium|Speculative","watchFor":"...","oneThing":"..."}

Field rules:
- sharpAngle: single play in ≤12 words (e.g. "Wembanyama under 10.5 rebounds")
- context: 1–2 short sentences — why the angle works
- thePlay: posted line + direction, or "Pass" if no verified line
- confidence: exactly High, Medium, or Speculative
- watchFor: one live tell you are tracking in-game
- oneThing: single sentence — what flips the read

Rules:
- Do NOT use memo headers (THE FRAGILE ASSUMPTION, MARKET READ, THE STRUCTURAL EDGE).
- Mirror venue from NBA FINALS CONTEXT — never say Knicks are "on the road in San Antonio" for Game 3 or 4 (those are in New York).
- No markdown. No prose outside JSON. First character must be {.`;

export const NBA_FINALS_STRUCTURED_REGENERATION_SUFFIX = `

[NBA FINALS STRUCTURED — REGENERATE]
Your prior answer was not valid Finals JSON. Return ONLY one JSON object with keys:
sharpAngle, context, thePlay, confidence, watchFor, oneThing.
No memo essays. No summary/deep keys.`;
