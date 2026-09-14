/**
 * Married NFL Ask: deterministic ticket stays locked; Haiku only polishes voice.
 * On any failure, return the original structured take unchanged.
 */
import { fetchAnthropicMessages } from "./_anthropicRetry.js";
import { UR_TAKE_HAIKU_MODEL } from "./_anthropicModels.js";
import { extractAnthropicText } from "./ur-take/prompt/anthropicText.js";
import { tryParseJsonObject } from "./ur-take/prompt/jsonParse.js";
import { NFL_UR_TAKE_FAST_MODEL_DEFAULT } from "../shared/nflAskFastPath.js";

const POLISH_SYSTEM = `You are Under Review — a sharp NFL betting friend.
Rewrite ONLY the voice of an already-chosen ticket. Do not change the bet.

Rules (hard):
- LOCKED LEGS below are the only legal players, sides (Over/Under), and numbers.
- Do NOT invent lines, players, or flip Over↔Under.
- Do NOT add new bets.
- Keep it short and casual.
- Return ONLY JSON: {"whyNow":"...","edge":"..."}
- whyNow: Keep a short "Board:" numbered list of the locked legs, then 1–2 voice sentences. Include the locked numbers.
- edge: 1 short sentence. No section headers.`;

/**
 * @param {unknown} raw
 */
function envFlagOn(raw, defaultOn = true) {
  if (raw == null || String(raw).trim() === "") return defaultOn;
  const v = String(raw).trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off" || v === "no") return false;
  if (v === "1" || v === "true" || v === "on" || v === "yes") return true;
  return defaultOn;
}

/** @param {string} text */
export function extractNflPolishNumbers(text) {
  const out = [];
  const re = /\b\d+(?:\.\d+)?\b/g;
  const s = String(text || "");
  let m;
  while ((m = re.exec(s))) {
    const n = Number(m[0]);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/**
 * @param {Record<string, unknown>|null|undefined} structured
 */
export function buildNflLockedLegsBrief(structured) {
  if (!structured || typeof structured !== "object") return "";
  const call = String(structured.call || "").trim();
  const lean = String(structured.lean || "").trim();
  const why = String(structured.whyNow || "").trim();
  const edge = String(structured.edge || "").trim();
  return [
    call ? `CALL: ${call}` : "",
    lean ? `LEAN: ${lean}` : "",
    why ? `BOARD_COPY:\n${why}` : "",
    edge ? `EDGE_COPY: ${edge}` : "",
    `CONFIDENCE: ${String(structured.confidence || "Speculative")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Reject polish that invents numbers or flips the locked side.
 * @param {Record<string, unknown>} locked
 * @param {{ whyNow?: string, edge?: string }} polish
 */
export function nflHaikuPolishIsSafe(locked, polish) {
  const whyNow = String(polish?.whyNow || "").trim();
  const edge = String(polish?.edge || "").trim();
  if (!whyNow || whyNow.length < 12) return false;
  if (whyNow.length > 1800 || edge.length > 400) return false;

  const lockedBlob = `${locked.call || ""} ${locked.lean || ""} ${locked.whyNow || ""} ${locked.edge || ""}`;
  const allowed = extractNflPolishNumbers(lockedBlob);
  const cited = extractNflPolishNumbers(`${whyNow} ${edge}`);
  for (const n of cited) {
    const ok = allowed.some((p) => Math.abs(p - n) <= 0.15);
    if (!ok) return false;
  }

  const call = String(locked.call || "").toUpperCase();
  const body = `${whyNow} ${edge}`.toUpperCase();
  const callOver = /\bOVER\b/.test(call);
  const callUnder = /\bUNDER\b/.test(call);
  const bodyFlipUnder =
    callOver &&
    /\b(TAKE\s+THE\s+UNDER|LEAN\s+UNDER|UNDER\s+IS\s+THE\s+PLAY|FADE\s+THE\s+OVER)\b/.test(body);
  const bodyFlipOver =
    callUnder &&
    /\b(TAKE\s+THE\s+OVER|LEAN\s+OVER|OVER\s+IS\s+THE\s+PLAY|FADE\s+THE\s+UNDER)\b/.test(body);
  if (bodyFlipUnder || bodyFlipOver) return false;

  return true;
}

/**
 * @param {Record<string, unknown>} structured
 * @param {{ whyNow?: string, edge?: string }} polish
 */
export function mergeNflHaikuPolish(structured, polish) {
  if (!structured || typeof structured !== "object") return structured;
  if (!nflHaikuPolishIsSafe(structured, polish)) return structured;
  const next = { ...structured };
  next.whyNow = String(polish.whyNow || "").trim();
  const edge = String(polish.edge || "").trim();
  if (edge) next.edge = edge;
  // Keep call / lean / confidence locked from the picker.
  return next;
}

/**
 * @param {{
 *   apiKey?: string,
 *   question?: string,
 *   structured?: Record<string, unknown>|null,
 *   requestId?: string,
 *   timeoutMs?: number,
 * }} opts
 * @returns {Promise<{ structured: Record<string, unknown>, polished: boolean, reason?: string }>}
 */
export async function polishNflStructuredTakeWithHaiku(opts = {}) {
  const base =
    opts.structured && typeof opts.structured === "object" ? { ...opts.structured } : null;
  if (!base) {
    return { structured: /** @type {Record<string, unknown>} */ ({}), polished: false, reason: "no_structured" };
  }

  if (!envFlagOn(process.env.NFL_ASK_HAIKU_POLISH, true)) {
    return { structured: base, polished: false, reason: "polish_disabled" };
  }

  const apiKey = String(opts.apiKey || process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) {
    return { structured: base, polished: false, reason: "no_api_key" };
  }

  const call = String(base.call || "").toUpperCase();
  if (!call || call === "PASS" || /\bPASS\b/.test(call)) {
    return { structured: base, polished: false, reason: "pass_ticket" };
  }

  const locked = buildNflLockedLegsBrief(base);
  if (!locked) {
    return { structured: base, polished: false, reason: "empty_lock" };
  }

  const model =
    String(process.env.NFL_UR_TAKE_FAST_MODEL || "").trim() ||
    NFL_UR_TAKE_FAST_MODEL_DEFAULT ||
    UR_TAKE_HAIKU_MODEL;

  const userPrompt = `Question: ${String(opts.question || "").trim()}

LOCKED LEGS (do not change players, sides, or numbers):
${locked}

Rewrite whyNow + edge only as JSON.`;

  try {
    const result = await fetchAnthropicMessages({
      apiKey,
      model,
      max_tokens: 420,
      temperature: 0.35,
      system: POLISH_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
      timeoutMs: Math.min(Number(opts.timeoutMs) || 12000, 20000),
      maxRetries: 1,
      cacheSystemPrompt: true,
    });

    if (!result.ok) {
      console.warn(
        JSON.stringify({
          event: "nfl_ask_haiku_polish_fail",
          requestId: opts.requestId || null,
          status: result.status,
          reason: "upstream",
        }),
      );
      return { structured: base, polished: false, reason: "upstream" };
    }

    const text = extractAnthropicText(result.data);
    const parsed = tryParseJsonObject(text);
    if (!parsed || typeof parsed !== "object") {
      return { structured: base, polished: false, reason: "parse" };
    }

    const merged = mergeNflHaikuPolish(base, {
      whyNow: String(parsed.whyNow || ""),
      edge: String(parsed.edge || ""),
    });
    const changed =
      String(merged.whyNow || "") !== String(base.whyNow || "") ||
      String(merged.edge || "") !== String(base.edge || "");
    return {
      structured: merged,
      polished: changed,
      reason: changed ? "ok" : nflHaikuPolishIsSafe(base, parsed) ? "unchanged" : "unsafe",
    };
  } catch (err) {
    console.warn(
      JSON.stringify({
        event: "nfl_ask_haiku_polish_fail",
        requestId: opts.requestId || null,
        reason: "exception",
        error: err?.message || String(err),
      }),
    );
    return { structured: base, polished: false, reason: "exception" };
  }
}
