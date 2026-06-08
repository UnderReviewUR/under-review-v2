/**
 * World Cup UR Take — deterministic answer QA + regeneration signal.
 */

import { textMentionsAnyWcTeam, textMentionsWcTeam } from "../shared/wcUrTakeEntityBinding.js";
import { detectContenderAheadOfFavoriteClaim } from "../shared/wcUrTakeMatchup.js";
import { detectUncitedAmericanOdds } from "../shared/wcUrTakePricing.js";
import { detectRulesThreadBleed } from "../shared/wcUrTakeRules.js";
import { WC_INTENT } from "../shared/wcUrTakeIntent.js";
import {
  detectTeamAnswerToPlayerQuestion,
  isWcPlayerMarketIntent,
  questionAsksForWcPlayerMarket,
} from "../shared/wcUrTakePlayerMarket.js";
import {
  extractKnownPlayerNamesFromKv,
  responseMentionsKnownPlayer,
} from "../shared/wcPlayerMarketResolve.js";
import { detectWcGroupMathMismatch } from "../shared/wcGroupComposition.js";
import { isWcGroupSlateQuestion } from "../shared/wcUrTakeIntent.js";
import { textMentionsCrossSportGolfer } from "../shared/wcGoldenBootRowGuard.js";
import {
  scoreWcCardContractVoice,
  WC_CARD_VOICE_QA_SUFFIX,
} from "../shared/wcCardContractVoice.js";
import {
  expectedWcPredictionSlots,
  parseWcPredictionSlots,
  WC_PREDICTIONS_ROUNDUP_QA_SUFFIX,
} from "../shared/wcPredictionsRoundup.js";

const BETTING_LEAD_RE =
  /^(?:lean:|)?\s*(?:norway|brazil|paraguay|france|mexico|argentina|germany|spain|england).{0,80}(?:advances|mispriced|longshot|value|group [a-l]|favorite|contender)/i;

const RULES_CONTENT_RE =
  /\b(extra time|penalty shootout|penalties|90.?minute|single elimination|away goals)\b/i;

/**
 * @param {string} responseText
 * @param {object | null | undefined} structured
 */
export function extractWcResponseHeadline(responseText, structured) {
  if (structured && typeof structured === "object") {
    const lean = String(structured.lean || "").trim();
    const whyNow = String(structured.whyNow || "").trim();
    const call = String(structured.call || "").trim();
    if (lean) return lean.replace(/^lean:\s*/i, "").trim();
    if (whyNow) return whyNow;
    if (call && call !== "—") return call;
  }
  const lines = String(responseText || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines[0] || "";
}

/**
 * @param {string} responseText
 * @param {object | null | undefined} structured
 */
export function extractWcResponseBody(responseText, structured) {
  const parts = [extractWcResponseHeadline(responseText, structured)];
  if (structured && typeof structured === "object") {
    for (const k of ["whyNow", "edge", "call"]) {
      if (structured[k]) parts.push(String(structured[k]));
    }
  }
  parts.push(String(responseText || ""));
  return parts.join("\n");
}

/**
 * @param {{
 *   responseText?: string,
 *   structured?: object | null,
 *   question?: string,
 *   wcIntent?: string,
 *   requiredEntities?: string[],
 *   forbiddenEntities?: string[],
 *   strengthTags?: Record<string, string>,
 *   playerMarketKv?: { goldenBoot?: object, players?: object, injuries?: object } | null,
 *   playerMarketTier?: string | null,
 * }} opts
 */
export function runWcUrTakeQA(opts = {}) {
  const responseText = String(opts.responseText || "");
  const structured = opts.structured && typeof opts.structured === "object" ? opts.structured : null;
  const wcIntent = String(opts.wcIntent || WC_INTENT.UNCLASSIFIED);
  const requiredEntities = (opts.requiredEntities || []).map((t) => String(t).toUpperCase());
  const forbiddenEntities = (opts.forbiddenEntities || []).map((t) => String(t).toUpperCase());
  const strengthTags = opts.strengthTags && typeof opts.strengthTags === "object" ? opts.strengthTags : {};

  const headline = extractWcResponseHeadline(responseText, structured);
  const body = extractWcResponseBody(responseText, structured);
  /** @type {string[]} */
  const issueCodes = [];

  if (wcIntent === WC_INTENT.RULES) {
    if (BETTING_LEAD_RE.test(headline)) issueCodes.push("wc_rules_betting_lead");
    if (!RULES_CONTENT_RE.test(body)) issueCodes.push("wc_rules_missing_content");
    if (
      detectRulesThreadBleed(body, String(opts.question || ""), [
        ...forbiddenEntities,
        ...requiredEntities,
      ])
    ) {
      issueCodes.push("wc_rules_thread_bleed");
    }
  }

  if (wcIntent === WC_INTENT.ENTITY_PRICING) {
    if (detectUncitedAmericanOdds(body, String(opts.question || ""), wcIntent)) {
      issueCodes.push("wc_price_uncited_citation");
    }
  }

  if (wcIntent === WC_INTENT.MATCHUP && requiredEntities.length >= 2) {
    const missingInHeadline = requiredEntities.filter((abbr) => !textMentionsWcTeam(headline, abbr));
    if (missingInHeadline.length > 0) issueCodes.push("wc_matchup_missing_team_headline");
    if (detectContenderAheadOfFavoriteClaim(headline, strengthTags)) {
      issueCodes.push("wc_matchup_contender_ahead_of_favorite");
    }
  }

  if (requiredEntities.length > 0) {
    const missing = requiredEntities.filter((abbr) => !textMentionsWcTeam(body, abbr));
    if (missing.length === requiredEntities.length) {
      issueCodes.push("wc_entity_missing");
    }
  }

  if (
    wcIntent === WC_INTENT.STRUCTURAL ||
    isWcGroupSlateQuestion(String(opts.question || ""))
  ) {
    const groupMath = detectWcGroupMathMismatch(body, null);
    if (groupMath?.issues?.length) {
      issueCodes.push("wc_group_math_mismatch");
    }
  }

  for (const forbidden of forbiddenEntities) {
    if (textMentionsWcTeam(headline, forbidden)) {
      issueCodes.push("wc_forbidden_entity_headline");
      break;
    }
  }

  if (textMentionsCrossSportGolfer(body)) {
    issueCodes.push("wc_cross_sport_golfer_bleed");
  }

  const question = String(opts.question || "");
  let qaPlayerMatch = null;

  if (wcIntent === WC_INTENT.PREDICTIONS_ROUNDUP) {
    const slots =
      Array.isArray(structured?.predictionSlots) && structured.predictionSlots.length
        ? structured.predictionSlots
        : parseWcPredictionSlots(body);
    const expected = expectedWcPredictionSlots(question);
    const have = new Set((slots || []).map((s) => s.key));
    const missing = expected.filter((spec) => !have.has(spec.key));
    if (missing.length > 0) {
      issueCodes.push("wc_predictions_roundup_incomplete");
    }
  }

  if (
    wcIntent !== WC_INTENT.PREDICTIONS_ROUNDUP &&
    (questionAsksForWcPlayerMarket(question) || isWcPlayerMarketIntent(wcIntent))
  ) {
    if (detectTeamAnswerToPlayerQuestion(headline, body, question)) {
      issueCodes.push("wc_player_question_team_lead");
      qaPlayerMatch = "fail";
    } else {
      const knownNames = extractKnownPlayerNamesFromKv(opts.playerMarketKv);
      if (knownNames.length && !responseMentionsKnownPlayer(headline, body, knownNames)) {
        issueCodes.push("wc_player_missing_names");
        qaPlayerMatch = "fail";
      } else {
        qaPlayerMatch = "pass";
      }
    }
    const tier = String(opts.playerMarketTier || "");
    if (
      (tier === "verified" || tier === "market_only") &&
      !/\+\d{3,}/.test(body) &&
      !/\+\d{3,}/.test(headline)
    ) {
      const hasGb =
        opts.playerMarketKv?.goldenBoot?.rows?.length ||
        extractKnownPlayerNamesFromKv(opts.playerMarketKv).length;
      if (hasGb) issueCodes.push("wc_player_odds_uncited");
    }
  }

  const qaEntityMatch =
    requiredEntities.length === 0
      ? null
      : textMentionsAnyWcTeam(body, requiredEntities)
        ? "pass"
        : "fail";

  const qaIntentMatch =
    wcIntent === WC_INTENT.RULES
      ? issueCodes.includes("wc_rules_betting_lead") || issueCodes.includes("wc_rules_missing_content")
        ? "fail"
        : "pass"
      : null;

  if (wcIntent !== WC_INTENT.RULES && structured) {
    const voice = scoreWcCardContractVoice(structured, {
      callType: structured.callType,
      wcIntent,
    });
    if (!voice.passed) {
      issueCodes.push(...voice.issues);
    }
  }

  return {
    passed: issueCodes.length === 0,
    issueCodes,
    qaEntityMatch,
    qaIntentMatch,
    qaPlayerMatch,
    headlinePreview: headline.slice(0, 160),
  };
}

/**
 * @param {{ passed?: boolean, issueCodes?: string[] }} qaResult
 */
export function wcQaRequiresRegeneration(qaResult) {
  if (!qaResult || qaResult.passed) return false;
  return (qaResult.issueCodes || []).some((c) =>
    [
      "wc_entity_missing",
      "wc_forbidden_entity_headline",
      "wc_rules_betting_lead",
      "wc_rules_thread_bleed",
      "wc_matchup_contender_ahead_of_favorite",
      "wc_matchup_missing_team_headline",
      "wc_price_uncited_citation",
      "wc_player_question_team_lead",
      "wc_player_missing_names",
      "wc_player_odds_uncited",
      "wc_group_math_mismatch",
      "wc_cross_sport_golfer_bleed",
      "wc_card_missing_watch_for",
      "wc_card_play_restates_call",
      "wc_card_headline_announces",
      "wc_card_missing_delta",
      "headline_over_18_words",
      "missing_line_delta",
      "wc_predictions_roundup_incomplete",
    ].includes(c) ||
    String(c).startsWith("wc_card_incomplete_") ||
    String(c).startsWith("wc_card_truncated_"),
  );
}

export const WC_GROUP_MATH_QA_SUFFIX = `

WC GROUP MATH QA (mandatory — prior answer miscounted group tiers):
- Every World Cup group has exactly FOUR teams: ONE Favorite, ONE Contender, TWO Longshots.
- Group D example (binding): Türkiye = Favorite · Paraguay = Contender · Australia and USA = Longshots (two only).
- Never say "three longshots" or list three longshot teams for a four-team group.
- When describing a group, name all four teams with correct Favorite / Contender / Longshot tags from VERIFIED CONTEXT.`;

export const WC_PLAYER_MARKET_QA_SUFFIX = `

WC PLAYER MARKET QA (mandatory — prior answer failed player contract):
- The user asked for a PLAYER, Golden Boot, or top scorer — not which country scores the most team goals.
- Do NOT name only France, Brazil, or any national team as the answer to a player question.
- Sentence one must name a player from PLAYER MARKETS — VERIFIED CONTEXT (e.g. Mbappé, Kane) with cited American odds when listed.
- If lineups are not confirmed, say so once — still rank named early contenders; never substitute a nation as the pick.`;

export { WC_PREDICTIONS_ROUNDUP_QA_SUFFIX };

export const WC_QA_REGENERATION_SUFFIX = `

WC QA REGENERATION (mandatory — prior answer failed relevance checks):
- Answer ONLY the user's current question and REQUIRED ENTITIES from the user message.
- Do not recycle a prior thread thesis or a different team/group.
- For rules questions: lead with extra time and penalty shootout facts — no group-stage betting take; do not reference prior thread teams or "you asked about…" narration.
- For group-stage MATCHUP questions: both teams can advance — frame 1st/2nd place paths; do not claim a Contender finishes ahead of the group Favorite without verified odds or form.
- For ENTITY_PRICING: never cite a +XXXX price unless it appears in the current question or VERIFIED CONTEXT for that exact team.
- Sentence one must directly answer the question with the correct team(s) named and strength tags acknowledged.
- For group-stage slate answers: four teams per group — one Favorite, one Contender, two Longshots — count and name them correctly.${WC_CARD_VOICE_QA_SUFFIX}`;
