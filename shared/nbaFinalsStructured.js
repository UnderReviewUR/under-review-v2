/**
 * NBA Finals UR Take — forced structured JSON (WC-style), not prose parsing.
 */

import { buildNbaFinalsDisplayHeadline } from "./nbaFinalsTakeDisplay.js";
import { reconcileFinalsSeriesState } from "./nbaFinalsUtils.js";

const CONFIDENCE_VALUES = new Set(["High", "Medium", "Speculative"]);

const PIPELINE_COPY_PATTERNS = [
  /\s*[—–-]\s*no verified line in context[^.]*\.?/gi,
  /\bno verified line in context\b[^.]*\.?/gi,
  /\bwatch for this threshold when the board opens\b[^.]*\.?/gi,
  /\bwhen the board opens\b/gi,
  /\bnot in (?:the )?context\b/gi,
  /\bline unavailable in context\b/gi,
];

const MERGED_LABEL_SPLIT_RE =
  /\s+(Context|The Play|Watch For|One Thing|Confidence)\s*:\s*/i;
const MERGED_LABEL_FIND_RE =
  /\s+(Context|The Play|Watch For|One Thing|Confidence)\s*:\s*/gi;

const FIELD_ALIASES = {
  sharpAngle: ["sharpAngle", "sharp_angle", "sharp angle"],
  context: ["context"],
  thePlay: ["thePlay", "the_play", "the play"],
  confidence: ["confidence"],
  watchFor: ["watchFor", "watch_for", "watch for", "liveTrigger", "live_trigger"],
  oneThing: ["oneThing", "one_thing", "one thing"],
};

/**
 * @param {string} text
 */
export function sanitizeNbaFinalsFaceText(text) {
  let t = String(text || "").trim();
  if (!t) return "";
  for (const re of PIPELINE_COPY_PATTERNS) {
    t = t.replace(re, "").trim();
  }
  t = t.replace(/\s{2,}/g, " ").replace(/\s+([,.;])/g, "$1").trim();
  if (/^pass\b/i.test(t) && t.length < 8) return "Pass";
  return t;
}

/**
 * Split model blobs that put every label inside sharpAngle.
 * @param {Record<string, string>} fields
 */
export function splitMergedNbaFinalsFields(fields) {
  if (!fields || typeof fields !== "object") return fields;
  const sharp = String(fields.sharpAngle || "").trim();
  if (!sharp || sharp.length < 80 || !MERGED_LABEL_SPLIT_RE.test(sharp)) return fields;

  const parts = sharp.split(MERGED_LABEL_FIND_RE);
  const out = { ...fields, sharpAngle: String(parts[0] || "").trim() };
  for (let i = 1; i < parts.length; i += 2) {
    const label = String(parts[i] || "")
      .toLowerCase()
      .replace(/\s+/g, "");
    const chunk = String(parts[i + 1] || "").trim();
    if (!chunk) continue;
    if (label === "context" && !out.context) out.context = chunk;
    else if (label === "theplay" && !out.thePlay) out.thePlay = chunk;
    else if (label === "watchfor" && !out.watchFor) out.watchFor = chunk;
    else if (label === "onething" && !out.oneThing) out.oneThing = chunk;
    else if (label === "confidence") {
      const c = chunk.match(/\b(High|Medium|Speculative)\b/i);
      if (c) out.confidence = c[1];
    }
  }

  const words = out.sharpAngle.split(/\s+/).filter(Boolean);
  if (words.length > 14) {
    out.sharpAngle = words.slice(0, 12).join(" ");
  }
  return out;
}

/**
 * @param {Record<string, string>} fields
 */
export function repairNbaFinalsStructuredFields(fields) {
  if (!fields || typeof fields !== "object") return fields;
  let out = splitMergedNbaFinalsFields({ ...fields });
  for (const key of [
    "sharpAngle",
    "context",
    "thePlay",
    "confidence",
    "watchFor",
    "oneThing",
  ]) {
    if (out[key]) out[key] = sanitizeNbaFinalsFaceText(out[key]);
  }
  if (out.thePlay && /^under\b/i.test(out.thePlay) && !/\bpass\b/i.test(out.thePlay)) {
    out.thePlay = out.thePlay.replace(/\s+if posted at[^.]*\.?/i, "").trim();
  }
  if (!out.thePlay || /no verified|board opens/i.test(out.thePlay)) {
    const m = out.sharpAngle?.match(/\b(under|over)\s+[\d.]+/i);
    out.thePlay = m ? m[0] : "Pass";
  }
  return out;
}

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

  if (Object.keys(out).length < 4) return null;
  return repairNbaFinalsStructuredFields(out);
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
  const reconciled = seriesState
    ? reconcileFinalsSeriesState(seriesState, question)
    : null;

  const rel = {
    finalsMode: true,
    finalsGameNumber:
      reconciled?.gameNumber ??
      seriesState?.gameNumber ??
      nbaRelevance?.finalsGameNumber ??
      null,
    finalsSeriesSummary:
      reconciled?.seriesScoreLabel ??
      seriesState?.seriesScoreLabel ??
      nbaRelevance?.finalsSeriesSummary ??
      null,
    finalsMatchupLabel:
      seriesState?.tonightMatchupLabel ?? nbaRelevance?.finalsMatchupLabel ?? null,
    finalsVenueLabel: seriesState?.venueLabel ?? nbaRelevance?.finalsVenueLabel ?? null,
  };

  return {
    callType: "nba_finals",
    sport: "NBA",
    sharpAngle: sanitizeNbaFinalsFaceText(fields.sharpAngle),
    context: sanitizeNbaFinalsFaceText(fields.context),
    thePlay: sanitizeNbaFinalsFaceText(fields.thePlay),
    confidence: String(fields.confidence || "Medium").trim(),
    watchFor: sanitizeNbaFinalsFaceText(fields.watchFor),
    oneThing: sanitizeNbaFinalsFaceText(fields.oneThing),
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
  const fields = repairNbaFinalsStructuredFields({
    sharpAngle: structured.sharpAngle || "",
    context: structured.context || "",
    thePlay: structured.thePlay || "",
    confidence: structured.confidence || "",
    watchFor: structured.watchFor || "",
    oneThing: structured.oneThing || "",
  });
  return {
    sharpAngle: fields.sharpAngle || null,
    context: fields.context || null,
    thePlay: fields.thePlay || null,
    confidence: fields.confidence || structured.confidence || null,
    watchFor: fields.watchFor || null,
    oneThing: fields.oneThing || null,
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
- thePlay: posted line + direction (e.g. "Under 10.5") or "Pass" — never mention context, payload, board, or line availability
- confidence: exactly High, Medium, or Speculative
- watchFor: one live tell you are tracking in-game
- oneThing: single sentence — what flips the read

Rules:
- Do NOT use memo headers (THE FRAGILE ASSUMPTION, MARKET READ, THE STRUCTURAL EDGE).
- Do NOT mention "verified line", "in context", "payload", or "when the board opens" — user-facing copy only.
- Each JSON key holds ONLY its field — do not pack Context/The Play into sharpAngle.
- Mirror venue from NBA FINALS CONTEXT — never say Knicks are "on the road in San Antonio" for Game 3 or 4 (those are in New York).
- Mirror series score from NBA FINALS CONTEXT and the user's question — never invent 0-0 if context says Knicks lead 2-0.
- No markdown. No prose outside JSON. First character must be {.`;

export const NBA_FINALS_STRUCTURED_REGENERATION_SUFFIX = `

[NBA FINALS STRUCTURED — REGENERATE]
Your prior answer was not valid Finals JSON. Return ONLY one JSON object with keys:
sharpAngle, context, thePlay, confidence, watchFor, oneThing.
No memo essays. No summary/deep keys.`;
