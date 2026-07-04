/**
 * Hypothetical odds / line-movement + live-entry planning — NOT "no line" passes.
 * Encodes American-odds live checkpoint mechanics so the model stops inverting direction.
 */

import { extractFirstAmericanOddsToken, parseAmericanOddsValue } from "./formatOddsAmerican.js";
import { extractLatestUserTurnForRouting } from "./urTakeSportRouting.js";
import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";
import { wcMatchupTeamDisplayName } from "./wcMatchupWinnerLine.js";

function isColdPassLean(lean) {
  const s = String(lean || "").trim();
  return /^pass\s*[—-]\s*no actionable line yet/i.test(s);
}

function isLineMovementPassLean(lean) {
  const s = String(lean || "").trim();
  if (!s) return true;
  if (isColdPassLean(s)) return true;
  if (/^pass\b/i.test(s)) return true;
  return /no actionable line yet/i.test(s);
}

const LINE_MOVEMENT_CUE_RE =
  /\b(?:odds?|line|price|number)\b[\s\S]{0,40}\b(?:go\s+(?:up|down)|move|shift|drift|shorten|lengthen|steam|come\s+in|get\s+(?:better|worse))\b/i;

const LINE_MOVEMENT_CUE_REV_RE =
  /\b(?:go\s+(?:up|down)|move|shift|drift|shorten|lengthen|steam|come\s+in)\b[\s\S]{0,40}\b(?:odds?|line|price)\b/i;

const TARGET_PRICE_RE = /\bgo\s+to\s+(?:like\s+)?[+-]?\d{2,}\b/i;

const HYPOTHETICAL_STATE_RE =
  /\b(?:if|when)\b[\s\S]{0,56}\b(?:scoreless|0-0|0\s*-\s*0|nil|no goals?|still tied|level|dead heat)\b/i;

const EARLY_MINUTE_RE =
  /\b(?:\d+\s*mins?\s+in|first\s+\d+\s*mins?|opening\s+\d+|early\s+on|5\s*mins?\s+in|30\s*mins?|half\s*hour)\b/i;

const LIVE_ENTRY_WAIT_RE =
  /\b(?:wait(?:ing)?(?:\s+to\s+see)?|hold off|see if|evaluate|re-?check|then (?:bet|lock|grab))\b/i;

/** Binding reference — inject when user asks live drift or live-entry timing. */
export const WC_LIVE_LINE_MECHANICS_PROMPT = `LIVE LINE MECHANICS (American odds — binding for hypothetical or checkpoint answers):

TERMINOLOGY (favorite side):
- DRIFT OUT / LENGTHEN = number moves toward even (e.g. -525 → -380) = better price for favorite backers = favorite win probability DOWN.
- SHORTEN / JUICE UP = more negative (e.g. -525 → -700) = worse price for favorite backers = favorite win probability UP (usually after they score or dominate chances).

CHECKPOINT — 0-0 scoreless early (~15'–35'), no red cards:
- 90-minute moneyline favorite: DRIFTS OUT (e.g. -525 → roughly -350 to -420). Draw SHORTENS. NEVER say the favorite moves to -650+ at this checkpoint.
- Match total Over (O1.5 / O2.5): DRIFTS OUT at the checkpoint — less time, same goals needed. NEVER say Over shortens to -600+ at 0-0 ~30'.
- Match total Under: SHORTENS at the checkpoint.
- To-advance (ET/pens included): same drift direction as ML at 0-0 but usually a smaller move than 90-min ML — still drifts OUT, not to -650+.

AFTER favorite scores (e.g. 1-0):
- Favorite ML SHORTENS (more negative). Overs often SHORTEN. That is a different tick than 0-0 ~30'.

LATER SCRIPT (not the checkpoint):
- If the favorite opens up 55'–75' desperate for goals, Overs may shorten THEN — cite that as a separate moment, not the instant 0-0 at 30' snapshot.

PRE-MATCH PLANNING:
- If the fixture has NOT kicked off, the user is planning live entry — describe what happens AFTER kickoff at the checkpoint they name; pregame posted lines do not move until the match is live.

MARKET DISCIPLINE:
- Keep the market they named: 90-min ML ≠ to-advance ≠ regulation total. Do not relabel moneyline as to-advance unless they said advance.`;

export const WC_ODDS_LINE_MOVEMENT_PROMPT = `ODDS LINE MOVEMENT / LIVE-ENTRY PLANNING (mandatory when user asks how a price moves or when to enter live):
- This is NOT a "no line" moment — explain directional drift using the price they cited from the slip, thread, or FIXTURE MATCH ODDS.
- NEVER use "Pass — no actionable line yet" — they want market mechanics or timing, not a cold pass.
- Apply LIVE LINE MECHANICS above: at 0-0 early, favorite ML and Overs DRIFT OUT; Unders SHORTEN; draw SHORTENS.
- NEVER claim favorite ML compresses to -650+ or Over 1.5/in 2.5 shortens to -600+ at a 0-0 ~30' checkpoint.
- Separate checkpoint (0-0 at 30') from later script (favorite opens up after 60') — do not merge them.
- Separate markets: to-advance ≠ 90-min ML ≠ group advance — keep the market they named.`;

/**
 * @param {string} question
 */
export function isWcOddsLineMovementQuestion(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return false;
  if (/\b(how do|what is a|rules|extra time|penalty shootout)\b/i.test(q) && !/[+-]\d{2,}/.test(q)) {
    return false;
  }

  const citesOdds = /[+-]\d{2,}/.test(q);
  const movementCue =
    LINE_MOVEMENT_CUE_RE.test(q) ||
    LINE_MOVEMENT_CUE_REV_RE.test(q) ||
    TARGET_PRICE_RE.test(q) ||
    /\bdoes\s+that\s+go\s+to\b/i.test(q) ||
    /\bwill\s+.+\s+odds?\b/i.test(q) ||
    /\b(line moved|moved against|now at|is at|are at)\b/i.test(q);

  const priceCorrection =
    /\b(under|over)\s+\d+(?:\.\d+)?\s+goals?\s+is\s+at\b/i.test(q) ||
    (/\b(is|are)\s+at\s+[+-]\d{2,}\b/i.test(q) &&
      /\b(under|over|moneyline|\bml\b|btts|both teams to score|total)\b/i.test(q));

  const hypoState =
    HYPOTHETICAL_STATE_RE.test(q) ||
    (EARLY_MINUTE_RE.test(q) && /\bscoreless|0-0|odds?|line\b/i.test(q));

  return (
    movementCue ||
    priceCorrection ||
    (citesOdds && hypoState) ||
    (hypoState && /\bodds?\b/i.test(q)) ||
    isWcLiveEntryPlanningQuestion(q)
  );
}

/**
 * Pre-match live-entry plan ("wait for 0-0 at 30' then evaluate lines").
 * @param {string} question
 */
export function isWcLiveEntryPlanningQuestion(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return false;
  const waitCue = LIVE_ENTRY_WAIT_RE.test(q);
  const liveCue =
    /\b(?:live|in[- ]?play|lines?|odds?|moneyline|\bml\b|over|under|evaluate)\b/i.test(q) ||
    /[+-]\d{2,}/.test(q);
  const scoreCue =
    /\b(?:0-0|0\s*-\s*0|scoreless|nil|no goals?)\b/i.test(q) ||
    EARLY_MINUTE_RE.test(q);
  return waitCue && liveCue && scoreCue;
}

/**
 * @param {string} question
 */
export function shouldInjectWcLiveLineMechanicsBlock(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  return isWcOddsLineMovementQuestion(q) || isWcLiveEntryPlanningQuestion(q);
}

/**
 * @param {string} [question]
 */
export function buildWcLiveLineMechanicsPromptBlock(question = "") {
  if (!shouldInjectWcLiveLineMechanicsBlock(question)) return "";
  return WC_LIVE_LINE_MECHANICS_PROMPT;
}

/**
 * @param {number | string | null | undefined} american
 * @returns {string | null}
 */
export function estimateFavoriteDriftOutAmerican(american) {
  const n = parseAmericanOddsValue(american);
  if (n == null || n >= 0) return null;
  const drifted = Math.round(Math.abs(n) * 0.72);
  return `-${Math.max(110, Math.min(drifted, Math.abs(n) - 40))}`;
}

/**
 * @param {string} question
 */
export function resolveWcLineMovementMarketLabel(question) {
  const q = String(question || "");
  if (/\bto advance\b/i.test(q)) return "to advance";
  if (/\b(?:moneyline|\bml\b)\b/i.test(q)) return "90-minute moneyline";
  if (/\bover\s+\d+(?:\.\d+)?\s*(?:goals?|in regulation)?\b/i.test(q)) return "match total Over";
  if (/\bunder\s+\d+(?:\.\d+)?\s*(?:goals?|in regulation)?\b/i.test(q)) return "match total Under";
  if (/\bto win\b/i.test(q)) return "90-minute moneyline";
  return "90-minute moneyline";
}

/**
 * @param {string} question
 */
export function synthesizeWcOddsLineMovementLean(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return "";

  if (isWcLiveEntryPlanningQuestion(q)) {
    return synthesizeWcLiveEntryPlanningLean(q);
  }

  const americanStr = extractFirstAmericanOddsToken(q);
  const american = americanStr ? parseAmericanOddsValue(americanStr) : null;
  const teams = extractMentionedWcTeams(q);
  const team = teams[0] ? wcMatchupTeamDisplayName(teams[0]) : "The favorite";
  const market = resolveWcLineMovementMarketLabel(q);
  const priceBit = americanStr ? ` at ${americanStr}` : "";

  if (/\bscoreless|0-0|0\s*-\s*0|nil|no goals?\b/i.test(q)) {
    if (market.includes("Over")) {
      return `At 0-0 early, ${market}${priceBit} typically drifts OUT (better Over price) — less time left for the goals you need. Re-check if chance volume stays high; a later press is a separate tick than the 30' snapshot.`;
    }
    if (market.includes("Under")) {
      return `At 0-0 early, ${market}${priceBit} typically SHORTENS — clock helps the Under. Each goal widens Over and tightens Under live.`;
    }
    if (american != null && american < 0) {
      const driftTarget = estimateFavoriteDriftOutAmerican(american);
      const driftBit = driftTarget ? ` — plausible drift toward ${driftTarget}` : "";
      return `${team} ${market}${priceBit} typically DRIFTS OUT if it's 0-0 early${driftBit}; draw shortens while the favorite still owns the path pre-goal. Not -650+ at that checkpoint.`;
    }
    return `0-0 early: favorite ${market} drifts OUT; draw shortens; Overs drift OUT at the checkpoint unless chance volume stays extreme.`;
  }

  if (TARGET_PRICE_RE.test(q) || /\bdoes\s+that\s+go\s+to\b/i.test(q)) {
    const driftTarget =
      american != null && american < 0 ? estimateFavoriteDriftOutAmerican(american) : null;
    const driftBit = driftTarget ? ` toward ${driftTarget}` : "";
    return `Yes — ${team} ${market}${priceBit} typically drifts OUT on a scoreless start${driftBit}; exact live price depends on book flow. Directionally right for 0-0, not a lock.`;
  }

  return `Track ${team} ${market}${priceBit} — 0-0 early favors drift OUT on the favorite ML; first favorite goal flips it to shorten fast.`;
}

/**
 * @param {string} question
 */
export function synthesizeWcLiveEntryPlanningLean(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  const teams = extractMentionedWcTeams(q);
  const fav = teams[0] ? wcMatchupTeamDisplayName(teams[0]) : "The favorite";
  const mlStr = extractFirstAmericanOddsToken(q);
  const ml = mlStr ? parseAmericanOddsValue(mlStr) : null;
  const mlDrift = ml != null && ml < 0 ? estimateFavoriteDriftOutAmerican(ml) : null;
  const mlBit = mlStr ? ` from ${mlStr}` : "";
  const mlDriftBit = mlDrift ? ` toward ~${mlDrift}` : "";

  const overMatch = q.match(/\bover\s+(\d+(?:\.\d+)?)\s*(?:goals?|in regulation)?\b/i);
  const overLine = overMatch?.[1];
  const overBit = overLine ? ` Over ${overLine}` : " posted Overs";

  return `Smart wait${mlBit}${mlDriftBit ? ` — at 0-0 ~30' ${fav} ML usually drifts OUT${mlDriftBit}` : ` — at 0-0 ~30' ${fav} ML usually drifts OUT`}, and${overBit} drift OUT at that checkpoint too (not in to -600+). Re-check live after you see them open up — that's a later script, not the 30' tick.`;
}

/**
 * @param {{
 *   home?: string,
 *   away?: string,
 *   question?: string,
 *   group?: string,
 *   match?: Record<string, unknown>,
 *   simLastUpdated?: number | null,
 *   nowMs?: number,
 * }} opts
 */
export function buildWcLiveEntryPlanningPrebuiltStructured(opts = {}) {
  const home = String(opts.home || "").trim().toUpperCase();
  const away = String(opts.away || "").trim().toUpperCase();
  const question = String(opts.question || "").trim();
  if (!home || !away || !question) return null;
  if (!isWcLiveEntryPlanningQuestion(question)) return null;

  const teams = extractMentionedWcTeams(question);
  const favAbbr =
    teams[0] ||
    (Number(parseAmericanOddsValue(extractFirstAmericanOddsToken(question) || "")) <= -400
      ? home
      : home);
  const lean = synthesizeWcLiveEntryPlanningLean(question);
  const mlStr = extractFirstAmericanOddsToken(question);
  const mlDrift =
    mlStr && parseAmericanOddsValue(mlStr) < 0
      ? estimateFavoriteDriftOutAmerican(mlStr)
      : null;

  return {
    sport: "worldcup",
    callType: "matchup",
    groupLetter: String(opts.group || opts.match?.group || "").trim().toUpperCase() || undefined,
    fixtureHome: home,
    fixtureAway: away,
    lean: lean.slice(0, 120),
    call: lean.slice(0, 100),
    line: mlStr || "",
    deep: "",
    breakdownAvailable: false,
    whyNow: mlDrift
      ? `0-0 ~30' checkpoint: ${wcMatchupTeamDisplayName(favAbbr)} ML typically drifts OUT toward ~${mlDrift}; Overs drift OUT too. Draw shortens. Do not confuse that snapshot with a later press.`
      : `0-0 ~30' checkpoint: favorite ML and Overs drift OUT; Unders shorten. Plan live entry at the checkpoint, not pre-kickoff.`,
    edge: "Live-entry timing — checkpoint mechanics, not a new pre-match pick.",
    modelAttribution: opts.simLastUpdated
      ? `Sims as of ${new Date(opts.simLastUpdated).toISOString().slice(0, 10)}`
      : undefined,
    confidence: "Medium",
    caveats: [],
    timestamp: new Date().toISOString(),
  };
}

/**
 * Detect backwards checkpoint copy (favorite shortens / Over juices at 0-0).
 * @param {string} text
 * @param {string} [question]
 */
export function isWcLineMovementWrongDirectionProse(text, question = "") {
  const t = String(text || "");
  const q = String(question || "");
  if (!t) return false;

  const scoreless =
    /\b(?:0-0|0\s*-\s*0|scoreless|nil-nil|no goals?)\b/i.test(t) ||
    /\b(?:0-0|scoreless)\b/i.test(q);
  if (!scoreless) return false;

  const topic =
    shouldInjectWcLiveLineMechanicsBlock(q) ||
    /\b(?:moneyline|\bml\b|over\s+\d|lines?|odds?|checkpoint|compress|shorten)\b/i.test(t);
  if (!topic) return false;

  const favShortenWrong =
    /\b(?:compress(?:es|ing)?(?:\s+tighter)?|shorten(?:s|ing)?|juice(?:s|d)?(?:\s+up)?|tighten(?:s|ing)?)\b/i.test(
      t,
    ) &&
    /\b(?:moneyline|\bml\b|favorite|to -[5-9]\d{2})\b/i.test(t);

  const favMoreJuiceWrong = /\b(?:toward|to|at)\s*-?[6-9]\d{2}\+?/i.test(t) && /\b(?:ml|moneyline|france|favorite)\b/i.test(t);

  const overShortenWrong =
    /\bover\s+\d/i.test(t) &&
    /\b(?:shorten(?:s|ing)?|compress(?:es|ing)?)\b/i.test(t) &&
    /\b-?[5-9]\d{2}\+?\b/.test(t);

  return favShortenWrong || favMoreJuiceWrong || overShortenWrong;
}

/**
 * @param {string} text
 * @param {string} question
 */
export function repairWcTalkLineMovementProse(text, question) {
  const raw = String(text || "").trim();
  if (!raw || !isWcLineMovementWrongDirectionProse(raw, question)) return raw;
  const fixed = synthesizeWcLiveEntryPlanningLean(question) || synthesizeWcOddsLineMovementLean(question);
  return fixed || raw;
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {string} question
 */
export function repairWcOddsLineMovementWrongDirection(structured, question) {
  if (!structured || typeof structured !== "object") return structured;
  const q = String(question || "");
  if (!shouldInjectWcLiveLineMechanicsBlock(q)) return structured;

  const lean = String(structured.lean || structured.call || "").trim();
  if (!lean || !isWcLineMovementWrongDirectionProse(lean, q)) return structured;

  const rewritten = synthesizeWcOddsLineMovementLean(q);
  if (!rewritten) return structured;

  return {
    ...structured,
    lean: rewritten,
    call: rewritten.slice(0, 100),
    whyNow:
      String(structured.whyNow || "").trim() ||
      "0-0 early: favorite ML and Overs drift OUT at the checkpoint; draw and Unders shorten.",
    confidence: String(structured.confidence || "Medium"),
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {string} question
 */
export function repairWcOddsLineMovementGenericPass(structured, question) {
  if (!structured || typeof structured !== "object") return structured;
  if (!isWcOddsLineMovementQuestion(question)) return structured;

  const lean = String(structured.lean || "").trim();
  if (lean && !isLineMovementPassLean(lean)) {
    return repairWcOddsLineMovementWrongDirection(structured, question);
  }

  const rewritten = synthesizeWcOddsLineMovementLean(question);
  if (!rewritten) return structured;

  const call = String(structured.call || "").trim();
  return repairWcOddsLineMovementWrongDirection(
    {
      ...structured,
      lean: rewritten,
      call: !call || isColdPassLean(call) ? rewritten.slice(0, 100) : call,
      whyNow:
        String(structured.whyNow || "").trim() ||
        "0-0 early: favorite ML and Overs drift OUT at the checkpoint; draw and Unders shorten.",
      confidence: String(structured.confidence || "Medium"),
    },
    question,
  );
}
