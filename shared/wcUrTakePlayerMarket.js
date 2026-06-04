/**
 * World Cup UR Take — player / Golden Boot / top scorer question contract.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import {
  WC_INTENT,
  classifyWcPlayerMarketIntent,
} from "./wcUrTakeIntent.js";
import { textMentionsWcTeam } from "./wcUrTakeEntityBinding.js";
import { wcDataConfidenceNeedsCaution } from "./wcDataConfidence.js";

const SCORING_PRED_RE =
  /\b(will score|scores the most|score the most|top scorer|most goals|golden boot|leading scorer)\b/i;

const PASS_SIGNAL_RE =
  /\b(player market|player-specific|confirmed lineups|golden boot|top scorer|pre-match|team-level angle|cannot name a player|pass\b|not supported)\b/i;

/** @typedef {typeof WC_INTENT.PLAYER_PROP | typeof WC_INTENT.GOLDEN_BOOT | typeof WC_INTENT.TOP_SCORER} WcPlayerMarketIntent */

/**
 * @param {string} intent
 */
export function isWcPlayerMarketIntent(intent) {
  const i = String(intent || "");
  return (
    i === WC_INTENT.PLAYER_PROP ||
    i === WC_INTENT.GOLDEN_BOOT ||
    i === WC_INTENT.TOP_SCORER
  );
}

export { classifyWcPlayerMarketIntent };

/**
 * @param {string} question
 */
export function questionAsksForWcPlayerMarket(question) {
  return classifyWcPlayerMarketIntent(question) != null;
}

/**
 * @param {object | null | undefined} wcContext
 */
export function wcContextHasVerifiedScorerGrounding(wcContext) {
  if (!wcContext || typeof wcContext !== "object") return false;
  if (wcDataConfidenceNeedsCaution(wcContext.dataConfidence)) return false;
  const details = Array.isArray(wcContext.matchDetails) ? wcContext.matchDetails : [];
  for (const d of details) {
    if (d?.lineupConfirmed !== true) continue;
    for (const side of ["home", "away"]) {
      const rows = d?.players?.[side];
      if (!Array.isArray(rows)) continue;
      const named = rows.filter((p) => String(p?.name || p?.displayName || "").trim().length > 2);
      if (named.length >= 2) return true;
    }
  }
  return false;
}

/**
 * @param {{ dataConfidence?: string | null, wcContext?: object | null }} opts
 */
export function shouldForceWcPlayerMarketPass(opts = {}) {
  const tier = opts.wcContext?.dataConfidence ?? opts.dataConfidence;
  if (wcDataConfidenceNeedsCaution(tier)) return true;
  return !wcContextHasVerifiedScorerGrounding(opts.wcContext);
}

/**
 * @param {string} wcIntent
 */
export function formatWcPlayerMarketPassLabel(wcIntent) {
  if (wcIntent === WC_INTENT.GOLDEN_BOOT) return "Golden Boot";
  if (wcIntent === WC_INTENT.TOP_SCORER) return "top scorer";
  return "player-specific";
}

/**
 * @param {string} question
 * @param {string} wcIntent
 */
export function buildWcPlayerMarketPassStructured(question, wcIntent) {
  const label = formatWcPlayerMarketPassLabel(wcIntent);
  const lean =
    `Player-specific markets (${label}) need confirmed starting XIs and verified scorer lines — not available for a firm pick yet.`;
  const whyNow =
    "For now, shift to team-level angles: group paths, tournament goal volume by nation, or outright value on favorites and longshots from VERIFIED CONTEXT. Re-ask for named players after lineups are confirmed.";
  return {
    sport: "worldcup",
    callType: "player_market_pass",
    call: `Pass — ${label} (pre-match)`,
    lean,
    whyNow,
    edge: "No starter-specific or Golden Boot edge until XI confirmation.",
    confidence: "Speculative",
    analysis: String(question || "").trim(),
  };
}

/**
 * @param {string} question
 * @param {string} wcIntent
 */
export function buildWcPlayerMarketPassProse(question, wcIntent) {
  const s = buildWcPlayerMarketPassStructured(question, wcIntent);
  return `${s.lean}\n\n${s.whyNow}`;
}

/**
 * @param {string} question
 * @param {string} wcIntent
 * @param {object | null | undefined} wcContext
 */
export function resolveWcPlayerMarketResponse(question, wcIntent, wcContext) {
  const forcePass = shouldForceWcPlayerMarketPass({ wcContext });
  if (!forcePass) {
    return {
      forcePass: false,
      structured: null,
      responseText: null,
      responseDeep: null,
      promptAppendix: formatWcPlayerMarketPromptRules(wcIntent),
    };
  }
  const structured = buildWcPlayerMarketPassStructured(question, wcIntent);
  const responseText = buildWcPlayerMarketPassProse(question, wcIntent);
  return {
    forcePass: true,
    structured,
    responseText,
    responseDeep: null,
    promptAppendix: null,
  };
}

/**
 * @param {string} wcIntent
 */
export function formatWcPlayerMarketPromptRules(wcIntent) {
  const label = formatWcPlayerMarketPassLabel(wcIntent);
  return `PLAYER MARKET (${label}) — binding:
  Answer with a named player from VERIFIED CONTEXT match intel only (confirmed starters / listed players).
  Do NOT answer with only a country or national team as the "player" pick.
  Cite the player full name in sentence one. If no verified player rows exist, state that clearly — do not substitute France or any nation as the top scorer.`;
}

/**
 * @param {string} headline
 * @param {string} body
 * @param {string} question
 */
export function detectTeamAnswerToPlayerQuestion(headline, body, question) {
  if (!questionAsksForWcPlayerMarket(question)) return false;
  const blob = `${headline} ${body}`;
  if (PASS_SIGNAL_RE.test(blob)) return false;

  if (!SCORING_PRED_RE.test(blob)) return false;

  for (const t of WC_2026_TEAMS) {
    const abbr = String(t.abbreviation || "").toUpperCase();
    if (!textMentionsWcTeam(headline, abbr)) continue;
    if (SCORING_PRED_RE.test(headline) || /\bwill score\b/i.test(headline)) {
      return true;
    }
  }
  return false;
}
