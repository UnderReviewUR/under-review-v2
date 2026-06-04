/**
 * World Cup UR Take — player / Golden Boot / top scorer question contract.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import {
  WC_INTENT,
  classifyWcPlayerMarketIntent,
} from "./wcUrTakeIntent.js";
import { textMentionsWcTeam } from "./wcUrTakeEntityBinding.js";
import {
  resolveWcPlayerMarketAnswer,
  resolveWcPlayerMarketTier,
  tierMetaFor,
} from "./wcPlayerMarketResolve.js";

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
 * @deprecated Use resolveWcPlayerMarketAnswer — only true when KV has zero player names.
 * @param {{ wcContext?: object | null }} opts
 */
export function shouldForceWcPlayerMarketPass(opts = {}) {
  const kv = opts.wcContext?.playerMarketKv;
  const resolved = resolveWcPlayerMarketAnswer(
    "",
    opts.wcContext?.wcIntent || WC_INTENT.TOP_SCORER,
    opts.wcContext,
    kv,
  );
  return resolved.forcePass;
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
 * @param {string} wcIntent
 */
export function formatWcPlayerMarketPromptRules(wcIntent) {
  const label = formatWcPlayerMarketPassLabel(wcIntent);
  return `PLAYER MARKET (${label}) — binding:
  Answer with a named PLAYER from PLAYER MARKETS — VERIFIED CONTEXT (never only a country/national team as the scorer pick).
  Cite the player full name in sentence one. When MATCH PLAYER PROPS exist for the pinned fixture, prefer those anytime/first goalscorer prices over tournament Golden Boot rows.
  When only GOLDEN BOOT / TOP SCORER ODDS exist, cite American prices from that block.
  If tier is Early Contenders or lineups are not confirmed, say so once — still list named players with available odds or form.`;
}

/**
 * @param {string} question
 * @param {string} wcIntent
 * @param {object | null | undefined} wcContext
 */
export function resolveWcPlayerMarketResponse(question, wcIntent, wcContext) {
  const kvBlocks = wcContext?.playerMarketKv || null;
  const tier = resolveWcPlayerMarketTier({
    goldenBoot: kvBlocks?.goldenBoot,
    players: kvBlocks?.players,
    injuries: kvBlocks?.injuries,
    matchPlayerProps: kvBlocks?.matchPlayerProps,
    wcEventId: wcContext?.wcEventId || kvBlocks?.wcEventId,
    wcContext,
    wcIntent,
  });
  const meta = tierMetaFor(tier);

  const resolved = resolveWcPlayerMarketAnswer(question, wcIntent, wcContext, kvBlocks);

  if (resolved.forcePass) {
    return {
      forcePass: true,
      tier: resolved.tier,
      playerMarketTier: resolved.playerMarketTier,
      tierLabel: resolved.tierLabel,
      callType: resolved.callType,
      structured: resolved.structured,
      responseText: resolved.responseText,
      responseDeep: null,
      promptAppendix: null,
    };
  }

  const promptAppendix =
    wcContext?.playerMarketPromptBlock || formatWcPlayerMarketPromptRules(wcIntent);

  return {
    forcePass: false,
    tier,
    playerMarketTier: tier,
    tierLabel: meta.label,
    tierDisclaimer: meta.disclaimer,
    callType: meta.callType,
    structured: null,
    responseText: null,
    responseDeep: null,
    promptAppendix,
  };
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
