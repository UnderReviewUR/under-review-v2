/**
 * Hypothetical odds / line-movement + live-entry planning — NOT "no line" passes.
 * Encodes American-odds live checkpoint mechanics so the model stops inverting direction.
 */

import { extractFirstAmericanOddsToken, parseAmericanOddsValue } from "./formatOddsAmerican.js";
import { extractLatestUserTurnForRouting } from "./urTakeSportRouting.js";
import {
  extractMentionedWcTeams,
  extractMentionedWcTeamsInQuestionOrder,
} from "./wcUrTakeKeywords.js";
import { wcMatchupTeamDisplayName } from "./wcMatchupWinnerLine.js";
import { resolveWcFixturePairFromQuestion } from "./wcFixtureMatchupPrebuilt.js";
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { pickWcBookFavorite } from "./wcMatchMoneylineProbs.js";
import {
  WC_CHECKPOINT_MARKET,
  WC_CHECKPOINT_MINUTE,
  estimateCheckpointDriftAmerican,
  estimateFavoriteDriftOutAmerican,
  lookupWcCheckpointScenario,
  parseWcLiveCheckpointMinuteBucket,
  resolveWcLineMovementMarketKind,
  wcCheckpointMarketLabel,
  wcCheckpointMinuteLabel,
} from "./wcLiveCheckpointLookup.js";

export {
  WC_CHECKPOINT_MARKET,
  WC_CHECKPOINT_MINUTE,
  estimateCheckpointDriftAmerican,
  estimateFavoriteDriftOutAmerican,
  lookupWcCheckpointScenario,
  parseWcLiveCheckpointMinuteBucket,
  resolveWcLineMovementMarketKind,
  wcCheckpointMarketLabel,
  wcCheckpointMinuteLabel,
  WC_CHECKPOINT_SCENARIO_TABLE,
} from "./wcLiveCheckpointLookup.js";

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
- DRIFT OUT / LENGTHEN = number moves toward even (e.g. -525 → -380) = better price for favorite backers = win probability DOWN on that market.
- SHORTEN / JUICE UP = more negative (e.g. -525 → -700) = worse price for backers = implied probability UP (usually after they score or dominate chances).

CHECKPOINT vs SCRIPT (do not merge):
- CHECKPOINT PRICING = instant reaction to score + clock at the minute they name (e.g. "0-0 at 30' right now").
- SCRIPT PRICING = expected behavior in the NEXT 15-20 minutes if the favorite opens up / presses (e.g. 55-75' desperate chase). Script is a separate tick — never describe it as the 30' checkpoint.

MARKET DISCIPLINE (never conflate):
- 90-MINUTE MONEYLINE (regulation only): if level after 90, bet is a draw — ET/pens are separate.
  Example: France -525 ML at kickoff → 0-0 at ~30' typically drifts OUT toward ~-380 (NOT -650+).
- TO-ADVANCE (knockout, ET/pens included): different contract from 90-min ML.
  Example: France -650 to advance at 0-0 ~30' often SHORTENS or HOLDS — they still expect to advance via ET/pens even if regulation ML drifted out.
  NEVER answer a "moneyline at 0-0" question with to-advance drift language.
- MATCH TOTAL OVER (e.g. O1.5 / O2.5): at 0-0, Overs DRIFT OUT (less time for goals). Never say Over shortens to -600+ at a 0-0 ~30' checkpoint.
- MATCH TOTAL UNDER: at 0-0, Unders SHORTEN (clock helps).
- REGULATION DRAW (1X2 draw leg): at 0-0, draw SHORTENS.

CLOCK SENSITIVITY at 0-0 (same score, different minutes):
- ~5-15': small ML/Over drift — most of the match left (e.g. -525 → roughly -490 to -500).
- ~30': moderate drift (e.g. -525 → roughly -350 to -420 on 90-min ML).
- 60'+: larger drift — urgency rises (e.g. -525 → roughly -280 to -340 on 90-min ML).

AFTER favorite scores (e.g. 1-0) — different checkpoint:
- Favorite 90-min ML SHORTENS. Overs often SHORTEN. Not the same as 0-0.

PRE-MATCH PLANNING:
- If the fixture has NOT kicked off, describe what happens AFTER kickoff at the checkpoint they name; pregame posted lines do not move until live.`;

export const WC_ODDS_LINE_MOVEMENT_PROMPT = `ODDS LINE MOVEMENT / LIVE-ENTRY PLANNING (mandatory when user asks how a price moves or when to enter live):
- This is NOT a "no line" moment — explain directional drift using the price they cited from the slip, thread, or FIXTURE MATCH ODDS.
- NEVER use "Pass — no actionable line yet" — they want market mechanics or timing, not a cold pass.
- Separate CHECKPOINT (instant at the minute they name) from SCRIPT (next 15-20' if the favorite presses) — do not merge.
- Keep the market they named: 90-min ML ≠ to-advance ≠ regulation total. Do not answer "moneyline at 0-0" with to-advance mechanics.
- 90-min ML at 0-0: DRIFTS OUT; magnitude depends on clock (~5-15' small, ~30' moderate, 60'+ larger). NEVER -650+ at ~30' checkpoint.
- To-advance at 0-0: often SHORTENS or HOLDS — not the same as regulation ML drift.
- Overs at 0-0: DRIFT OUT at checkpoint; Unders SHORTEN; draw SHORTENS.
- "France gets desperate" / heavy press is SCRIPT at 55-75' — cite separately from the 30' checkpoint snapshot.`;

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
 * @param {string} question
 */
export function shouldForceWcLineMovementStructuredCard(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return false;
  if (isWcLiveEntryPlanningQuestion(q)) return true;
  if (!isWcOddsLineMovementQuestion(q)) return false;
  const citesOdds = /[+-]\d{2,}/.test(q);
  const hypoState =
    HYPOTHETICAL_STATE_RE.test(q) ||
    (EARLY_MINUTE_RE.test(q) && /\bscoreless|0-0|odds?|line\b/i.test(q));
  return citesOdds && hypoState;
}

/**
 * Casual line-movement chat — Talk OK when mechanics block is injected (no cited price + hypo).
 * @param {string} question
 */
export function isWcLineMovementTalkEligible(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (!isWcOddsLineMovementQuestion(q)) return false;
  if (isWcLiveEntryPlanningQuestion(q)) return false;
  return !shouldForceWcLineMovementStructuredCard(q);
}

/**
 * @param {string} question
 */
export function resolveWcLineMovementMarketLabel(question) {
  return wcCheckpointMarketLabel(resolveWcLineMovementMarketKind(question));
}

/**
 * @param {string} question
 */
function extractFavoriteMlTokenFromQuestion(question) {
  const q = String(question || "");
  const moneyLine = q.match(/\bmoney\s*line\b[^.?!]{0,40}?([+-]\d{2,})/i);
  if (moneyLine) return moneyLine[1];
  const onTeam = q.match(/([+-]\d{2,})\s+on\s+[a-z]/i);
  if (onTeam && !/\bover\s+\d/i.test(q.slice(0, onTeam.index))) return onTeam[1];
  return null;
}

/**
 * @param {string} question
 * @param {{
 *   home?: string,
 *   away?: string,
 *   matchOdds?: Record<string, unknown> | null,
 *   match?: Record<string, unknown> | null,
 *   teams?: Array<{ abbreviation: string, eloRating: number, isHost?: boolean }>,
 * }} [opts]
 */
export function resolveWcFavoriteForCheckpoint(question, opts = {}) {
  const home = String(opts.home || opts.match?.homeTeam || "").trim().toUpperCase();
  const away = String(opts.away || opts.match?.awayTeam || "").trim().toUpperCase();
  const teams = opts.teams || WC_2026_TEAMS;
  const matchOdds = opts.matchOdds || opts.match?.odds;

  if (home && away && matchOdds) {
    return pickWcBookFavorite(home, away, matchOdds, teams, { match: opts.match });
  }

  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  const ordered = extractMentionedWcTeamsInQuestionOrder(q);
  if (ordered.length >= 2) {
    const a = teams.find((t) => t.abbreviation === ordered[0]);
    const b = teams.find((t) => t.abbreviation === ordered[1]);
    if (a && b) {
      const favAbbr = a.eloRating >= b.eloRating ? ordered[0] : ordered[1];
      const mlToken = extractFavoriteMlTokenFromQuestion(q);
      return { abbr: favAbbr, odds: mlToken, matchOdds: matchOdds || null };
    }
  }

  if (home && away && matchOdds) {
    return pickWcBookFavorite(home, away, matchOdds, teams, { match: opts.match });
  }

  const mlToken = extractFavoriteMlTokenFromQuestion(q);
  return {
    abbr: ordered[0] || home || null,
    odds: mlToken,
    matchOdds: matchOdds || null,
  };
}

/**
 * @param {string} question
 * @param {{
 *   home?: string,
 *   away?: string,
 *   matchOdds?: Record<string, unknown> | null,
 *   match?: Record<string, unknown> | null,
 *   teams?: Array<{ abbreviation: string, eloRating: number, isHost?: boolean }>,
 * }} [opts]
 */
export function synthesizeWcOddsLineMovementLean(question, opts = {}) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return "";

  if (isWcLiveEntryPlanningQuestion(q)) {
    return synthesizeWcLiveEntryPlanningLean(q, opts);
  }

  const favorite = resolveWcFavoriteForCheckpoint(q, opts);
  const americanStr =
    extractFavoriteMlTokenFromQuestion(q) ||
    (favorite.odds ? String(favorite.odds) : extractFirstAmericanOddsToken(q));
  const american = americanStr ? parseAmericanOddsValue(americanStr) : null;
  const team = favorite.abbr
    ? wcMatchupTeamDisplayName(favorite.abbr)
    : "The favorite";
  const marketKind = resolveWcLineMovementMarketKind(q);
  const market = wcCheckpointMarketLabel(marketKind);
  const bucket = parseWcLiveCheckpointMinuteBucket(q);
  const minuteLabel = wcCheckpointMinuteLabel(bucket);
  const priceBit = americanStr ? ` at ${americanStr}` : "";
  const scenario = lookupWcCheckpointScenario({
    american: americanStr,
    bucket,
    marketKind,
    scoreState: "0-0",
  });

  if (/\bscoreless|0-0|0\s*-\s*0|nil|no goals?\b/i.test(q)) {
    if (marketKind === WC_CHECKPOINT_MARKET.TOTAL_OVER) {
      const driftTarget =
        estimateCheckpointDriftAmerican(american, bucket, WC_CHECKPOINT_MARKET.TOTAL_OVER) ||
        scenario?.driftTarget;
      const driftBit = driftTarget ? ` toward ~${driftTarget}` : "";
      return `At ${minuteLabel}, ${market}${priceBit} typically DRIFTS OUT${driftBit} — less time for the goals you need. That is checkpoint pricing, not a later press script.`;
    }
    if (marketKind === WC_CHECKPOINT_MARKET.TOTAL_UNDER) {
      return `At ${minuteLabel}, ${market}${priceBit} typically SHORTENS — clock helps the Under at the checkpoint.`;
    }
    if (marketKind === WC_CHECKPOINT_MARKET.TO_ADVANCE) {
      return `At ${minuteLabel}, ${team} ${market}${priceBit} often SHORTENS or HOLDS — ET/pens still on the table even at 0-0. Do not describe this like 90-min regulation ML drift.`;
    }
    if (marketKind === WC_CHECKPOINT_MARKET.DRAW) {
      return `At ${minuteLabel}, ${market}${priceBit} typically SHORTENS while level — checkpoint reaction to nil-nil.`;
    }
    if (american != null && american < 0) {
      const driftTarget =
        estimateCheckpointDriftAmerican(american, bucket, WC_CHECKPOINT_MARKET.ML_90MIN) ||
        scenario?.driftTarget;
      const driftBit = driftTarget ? ` toward ~${driftTarget}` : "";
      const sizeNote =
        bucket === WC_CHECKPOINT_MINUTE.EARLY
          ? " (small move — early)"
          : bucket === WC_CHECKPOINT_MINUTE.LATE
            ? " (larger move — 60'+ urgency)"
            : "";
      return `${team} ${market}${priceBit} typically DRIFTS OUT at ${minuteLabel}${driftBit}${sizeNote}; draw shortens. Not -650+ at that checkpoint. A later press (55-75') is a separate script tick.`;
    }
    return `At ${minuteLabel}: 90-min ML favorite drifts OUT; draw shortens; Overs drift OUT — keep the market they named.`;
  }

  if (TARGET_PRICE_RE.test(q) || /\bdoes\s+that\s+go\s+to\b/i.test(q)) {
    if (marketKind === WC_CHECKPOINT_MARKET.TO_ADVANCE) {
      return `${team} ${market}${priceBit} at 0-0 often holds or shortens slightly — different from regulation ML lengthening.`;
    }
    const driftTarget =
      american != null && american < 0
        ? estimateCheckpointDriftAmerican(american, bucket, marketKind) || scenario?.driftTarget
        : null;
    const driftBit = driftTarget ? ` toward ~${driftTarget}` : "";
    return `Yes — ${team} ${market}${priceBit} typically drifts OUT on a scoreless start at ${minuteLabel}${driftBit}; exact live price depends on book flow. Directionally right for 0-0 checkpoint, not a lock.`;
  }

  return `Track ${team} ${market}${priceBit} — 0-0 checkpoint favors drift OUT on 90-min ML; first favorite goal flips it to shorten fast.`;
}

/**
 * @param {string} question
 * @param {{
 *   home?: string,
 *   away?: string,
 *   matchOdds?: Record<string, unknown> | null,
 *   match?: Record<string, unknown> | null,
 *   teams?: Array<{ abbreviation: string, eloRating: number, isHost?: boolean }>,
 * }} [opts]
 */
export function synthesizeWcLiveEntryPlanningLean(question, opts = {}) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  const favorite = resolveWcFavoriteForCheckpoint(q, opts);
  const fav = favorite.abbr ? wcMatchupTeamDisplayName(favorite.abbr) : "The favorite";
  const mlStr =
    favorite.odds != null
      ? String(favorite.odds)
      : extractFavoriteMlTokenFromQuestion(q);
  const ml = mlStr ? parseAmericanOddsValue(mlStr) : null;
  const bucket = parseWcLiveCheckpointMinuteBucket(q);
  const minuteLabel = wcCheckpointMinuteLabel(bucket);
  const mlDrift =
    ml != null && ml < 0
      ? estimateCheckpointDriftAmerican(ml, bucket, WC_CHECKPOINT_MARKET.ML_90MIN)
      : null;
  const mlBit = mlStr ? ` from ${mlStr}` : "";
  const mlDriftBit = mlDrift ? ` toward ~${mlDrift}` : "";

  const overMatch = q.match(/\bover\s+(\d+(?:\.\d+)?)\s*(?:goals?|in regulation)?\b/i);
  const overLine = overMatch?.[1];
  const overBit = overLine ? ` Over ${overLine}` : " posted Overs";
  const overDrift =
    ml != null && ml < 0
      ? estimateCheckpointDriftAmerican(ml, bucket, WC_CHECKPOINT_MARKET.TOTAL_OVER)
      : null;
  const overDriftBit = overDrift ? ` (~${overDrift})` : "";

  return `Smart wait${mlBit} — CHECKPOINT at ${minuteLabel}: ${fav} 90-min ML usually drifts OUT${mlDriftBit};${overBit} drift OUT at that snapshot too${overDriftBit}. Draw/Under shorten. SCRIPT (55-75' if they press) is a later tick — not the instant checkpoint. Re-check live before locking.`;
}

/**
 * Deterministic structured card for line-movement / live-entry planning (lean === call).
 * @param {{
 *   home?: string,
 *   away?: string,
 *   question?: string,
 *   group?: string,
 *   match?: Record<string, unknown>,
 *   simLastUpdated?: number | null,
 *   nowMs?: number,
 *   eventId?: string | null,
 * }} opts
 */
export function buildWcLineMovementStructuredPrebuilt(opts = {}) {
  const home = String(opts.home || "").trim().toUpperCase();
  const away = String(opts.away || "").trim().toUpperCase();
  const question = String(opts.question || "").trim();
  if (!home || !away || !question) return null;
  if (!shouldForceWcLineMovementStructuredCard(question) && !isWcLiveEntryPlanningQuestion(question)) {
    return null;
  }

  const synthOpts = {
    home,
    away,
    match: opts.match,
    matchOdds: opts.match?.odds && typeof opts.match.odds === "object" ? opts.match.odds : null,
  };
  const lean = isWcLiveEntryPlanningQuestion(question)
    ? synthesizeWcLiveEntryPlanningLean(question, synthOpts)
    : synthesizeWcOddsLineMovementLean(question, synthOpts);
  if (!lean) return null;

  const favorite = resolveWcFavoriteForCheckpoint(question, synthOpts);
  const favAbbr = favorite.abbr || away;
  const favOdds =
    favorite.odds != null
      ? String(favorite.odds)
      : extractFavoriteMlTokenFromQuestion(question) || extractFirstAmericanOddsToken(question);
  const bucket = parseWcLiveCheckpointMinuteBucket(question);
  const minuteLabel = wcCheckpointMinuteLabel(bucket);
  const marketKind = resolveWcLineMovementMarketKind(question);
  const marketLabel = wcCheckpointMarketLabel(marketKind);
  const favName = wcMatchupTeamDisplayName(favAbbr);
  const mlDrift =
    favOdds && parseAmericanOddsValue(favOdds) < 0
      ? estimateCheckpointDriftAmerican(favOdds, bucket, WC_CHECKPOINT_MARKET.ML_90MIN)
      : null;

  let whyNow = `CHECKPOINT ${minuteLabel}: ${favName} ${marketLabel}`;
  if (marketKind === WC_CHECKPOINT_MARKET.TOTAL_OVER) {
    whyNow += ` drifts OUT at the checkpoint; draw/Under shorten. SCRIPT is a separate later tick.`;
  } else if (marketKind === WC_CHECKPOINT_MARKET.TO_ADVANCE) {
    whyNow += ` often shortens or holds at 0-0 — not the same as 90-min ML drift.`;
  } else if (mlDrift) {
    whyNow += ` drifts OUT toward ~${mlDrift}; Overs drift OUT; draw/Under shorten. SCRIPT (55-75' press) is separate.`;
  } else {
    whyNow += `: 90-min ML and Overs drift OUT; Unders/draw shorten at the checkpoint.`;
  }

  const call = lean.slice(0, 100);

  return {
    sport: "worldcup",
    callType: "matchup",
    groupLetter: String(opts.group || opts.match?.group || "").trim().toUpperCase() || undefined,
    fixtureHome: home,
    fixtureAway: away,
    lean: lean.slice(0, 120),
    call,
    line: favOdds || "",
    deep: lean,
    breakdownAvailable: false,
    whyNow,
    edge: "Checkpoint mechanics — instant pricing at the minute named, not a pre-match pick or later script.",
    modelAttribution: opts.simLastUpdated
      ? `Sims as of ${new Date(opts.simLastUpdated).toISOString().slice(0, 10)}`
      : undefined,
    confidence: "Medium",
    caveats: [],
    timestamp: new Date().toISOString(),
    wcEventId:
      opts.eventId != null
        ? String(opts.eventId)
        : opts.match?.id != null
          ? String(opts.match.id)
          : null,
  };
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
  return buildWcLineMovementStructuredPrebuilt(opts);
}

/**
 * User asked moneyline but answer used to-advance mechanics (or vice versa).
 * @param {string} text
 * @param {string} [question]
 */
export function detectWcLineMovementMarketConflation(text, question = "") {
  const t = String(text || "");
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!t || !q) return false;

  const kind = resolveWcLineMovementMarketKind(q);
  const mentionsAdvance = /\bto advance\b/i.test(t);

  if (kind === WC_CHECKPOINT_MARKET.ML_90MIN && mentionsAdvance && /\bdrift/i.test(t)) {
    return true;
  }
  if (kind === WC_CHECKPOINT_MARKET.TO_ADVANCE && /\bdrifts?\s+out\b/i.test(t)) {
    if (/\b(?:90[- ]?minute|regulation)\b[^.!?]{0,40}\b(?:moneyline|\bml\b)\b/i.test(t)) {
      return true;
    }
    if (/\bjust like\b/i.test(t) && /\b(?:moneyline|\bml\b|90[- ]?minute)\b/i.test(t)) {
      return true;
    }
  }
  return false;
}

/** Response explicitly separates checkpoint snapshot from later script. */
export function hasExplicitCheckpointScriptSeparation(text) {
  const t = String(text || "");
  if (!t) return false;
  return /\b(?:CHECKPOINT|checkpoint at|instant checkpoint|later tick|separate(?:ly)?|not the (?:instant|same) checkpoint|script\s*\(|55-75'|next 15-20|is a later (?:tick|script))\b/i.test(
    t,
  );
}

/** Over/ML shortens at 0-0 checkpoint (not Under/draw side markets). */
function proseShortensOverOrMlAtCheckpoint(text) {
  return proseShortensOverAtCheckpoint(text) || proseShortensMlAtCheckpoint(text);
}

function proseShortensOverAtCheckpoint(text) {
  const t = String(text || "");
  return /\bover\s+\d(?:\.\d+)?[^.!?]{0,48}\b(?:shorten(?:s|ing)?|compress(?:es|ing)?|juice(?:s|d)?(?:\s+up)?)\b/i.test(
    t,
  );
}

function proseShortensMlAtCheckpoint(text) {
  const t = String(text || "");
  if (
    /\b(?:90[- ]?minute|regulation|moneyline|\bml\b)[^.!?]{0,48}\b(?:shorten(?:s|ing)?|compress(?:es|ing)?|juice(?:s|d)?(?:\s+up)?|tighten(?:s|ing)?)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/\b(?:shorten(?:s|ing)?|compress(?:es|ing)?)\s+(?:to|toward|at)\s*-?[5-9]\d{2}/i.test(t)) {
    return /\b(?:moneyline|\bml\b|90[- ]?minute)\b/i.test(t);
  }
  return false;
}

/**
 * Collapsed 30' checkpoint with later "desperate press" script (Over shortens at 0-0).
 * @param {string} text
 * @param {string} [question]
 */
export function detectWcLineMovementCheckpointScriptCollapse(text, question = "") {
  const t = String(text || "");
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!t) return false;

  if (hasExplicitCheckpointScriptSeparation(t)) return false;

  const scoreless =
    /\b(?:0-0|0\s*-\s*0|scoreless|nil-nil|no goals?)\b/i.test(t) ||
    /\b(?:0-0|scoreless)\b/i.test(q);
  if (!scoreless) return false;

  const bucket = parseWcLiveCheckpointMinuteBucket(q || t);
  const atMidCheckpoint =
    bucket === WC_CHECKPOINT_MINUTE.MID ||
    (/\b(?:30|half\s*hour|half[- ]?time)\b/i.test(q) && !/\b(?:55|60|65|70|75)\b/i.test(q));

  const scriptCue = /\b(?:desperate|opens?\s+up|all-out|press(?:es|ing)?|chase|need(?:s)?\s+goals)\b/i.test(
    t,
  );

  return atMidCheckpoint && scriptCue && proseShortensOverOrMlAtCheckpoint(t);
}

/**
 * Post-generation QA for line-movement answers (Talk or Take).
 * @param {string} text
 * @param {string} [question]
 */
export function runWcLineMovementOutputQA(text, question = "") {
  /** @type {string[]} */
  const issueCodes = [];
  if (isWcLineMovementWrongDirectionProse(text, question)) {
    issueCodes.push("wc_line_movement_wrong_direction");
  }
  if (detectWcLineMovementMarketConflation(text, question)) {
    issueCodes.push("wc_line_movement_market_conflation");
  }
  if (detectWcLineMovementCheckpointScriptCollapse(text, question)) {
    issueCodes.push("wc_line_movement_checkpoint_script_merged");
  }
  return { passed: issueCodes.length === 0, issueCodes };
}

/**
 * Detect backwards checkpoint copy (90-min ML favorite shortens / Over juices at 0-0 checkpoint).
 * @param {string} text
 * @param {string} [question]
 */
export function isWcLineMovementWrongDirectionProse(text, question = "") {
  const t = String(text || "");
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!t) return false;

  const scoreless =
    /\b(?:0-0|0\s*-\s*0|scoreless|nil-nil|no goals?)\b/i.test(t) ||
    /\b(?:0-0|scoreless)\b/i.test(q);
  if (!scoreless) return false;

  const topic =
    shouldInjectWcLiveLineMechanicsBlock(q || t) ||
    /\b(?:moneyline|\bml\b|over\s+\d|lines?|odds?|checkpoint|compress|shorten)\b/i.test(t);
  if (!topic) return false;

  const marketKind = resolveWcLineMovementMarketKind(q || t);

  const mlShortenWrong =
    marketKind === WC_CHECKPOINT_MARKET.ML_90MIN && proseShortensMlAtCheckpoint(t);

  const favMoreJuiceWrong =
    marketKind === WC_CHECKPOINT_MARKET.ML_90MIN &&
    /\b(?:toward|to|at)\s*-?[6-9]\d{2}\+?/i.test(t) &&
    /\b(?:ml|moneyline|90[- ]?minute)\b/i.test(t) &&
    !/\bdrift(?:s)?\s+out\b/i.test(t);

  const overShortenWrong =
    (marketKind === WC_CHECKPOINT_MARKET.TOTAL_OVER || /\bover\s+\d/i.test(t)) &&
    proseShortensOverAtCheckpoint(t) &&
    !/\bover\s+\d[^.!?]{0,40}\bdrift(?:s)?\s+out\b/i.test(t);

  return mlShortenWrong || favMoreJuiceWrong || overShortenWrong;
}

/**
 * @param {string} text
 * @param {string} question
 */
export function repairWcTalkLineMovementProse(text, question) {
  const raw = String(text || "").trim();
  if (!raw) return raw;
  const qa = runWcLineMovementOutputQA(raw, question);
  if (qa.passed) return raw;
  const fixed =
    synthesizeWcLiveEntryPlanningLean(question) || synthesizeWcOddsLineMovementLean(question);
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
 * When forceLineMovementStructured applies, never let Sonnet prose own call/whyNow.
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {string} question
 * @param {{
 *   home?: string,
 *   away?: string,
 *   match?: Record<string, unknown> | null,
 *   group?: string,
 *   eventId?: string | null,
 *   matches?: Array<Record<string, unknown>>,
 *   simLastUpdated?: number | null,
 *   nowMs?: number,
 * }} [opts]
 */
export function applyWcForceLineMovementStructuredGuard(structured, question, opts = {}) {
  if (!structured || typeof structured !== "object") return structured;
  const q = String(question || "").trim();
  if (!shouldForceWcLineMovementStructuredCard(q) && !isWcLiveEntryPlanningQuestion(q)) {
    return structured;
  }

  const home = String(
    opts.home || structured.fixtureHome || opts.match?.homeTeam || "",
  )
    .trim()
    .toUpperCase();
  let away = String(
    opts.away || structured.fixtureAway || opts.match?.awayTeam || "",
  )
    .trim()
    .toUpperCase();
  let resolvedHome = home;
  let resolvedAway = away;
  if (!resolvedHome || !resolvedAway) {
    const eventId = opts.eventId ?? structured.wcEventId ?? null;
    if (eventId && Array.isArray(opts.matches) && opts.matches.length) {
      const hit = opts.matches.find((row) => String(row?.id) === String(eventId));
      if (hit?.homeTeam && hit?.awayTeam) {
        resolvedHome = String(hit.homeTeam).toUpperCase();
        resolvedAway = String(hit.awayTeam).toUpperCase();
      }
    }
    if (!resolvedHome || !resolvedAway) {
      const pair = resolveWcFixturePairFromQuestion(q, {
        mentionedTeams: extractMentionedWcTeams(q),
        wcEventId: eventId,
      });
      if (pair?.home && pair?.away) {
        resolvedHome = pair.home;
        resolvedAway = pair.away;
      }
    }
  }
  if (!resolvedHome || !resolvedAway) return structured;

  const prebuilt = buildWcLineMovementStructuredPrebuilt({
    home: resolvedHome,
    away: resolvedAway,
    question: q,
    match: opts.match,
    group: opts.group || structured.groupLetter,
    eventId: opts.eventId ?? structured.wcEventId,
    simLastUpdated: opts.simLastUpdated,
    nowMs: opts.nowMs,
  });
  if (!prebuilt) return structured;

  return {
    ...structured,
    callType: "matchup",
    fixtureHome: resolvedHome,
    fixtureAway: resolvedAway,
    lean: prebuilt.lean,
    call: prebuilt.call,
    line: prebuilt.line || structured.line,
    whyNow: prebuilt.whyNow,
    edge: prebuilt.edge,
    deep: prebuilt.deep || prebuilt.lean,
    breakdownAvailable: false,
    wcEventId: prebuilt.wcEventId ?? structured.wcEventId,
    groupLetter: prebuilt.groupLetter ?? structured.groupLetter,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {string} question
 */
export function repairWcOddsLineMovementGenericPass(structured, question) {
  if (!structured || typeof structured !== "object") return structured;
  if (!isWcOddsLineMovementQuestion(question) && !isWcLiveEntryPlanningQuestion(question)) {
    return structured;
  }

  if (shouldForceWcLineMovementStructuredCard(question) || isWcLiveEntryPlanningQuestion(question)) {
    return applyWcForceLineMovementStructuredGuard(structured, question);
  }

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
