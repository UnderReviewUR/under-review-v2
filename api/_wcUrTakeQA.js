/**
 * World Cup UR Take — deterministic answer QA + regeneration signal.
 */

import { textMentionsAnyWcTeam, textMentionsWcTeam } from "../shared/wcUrTakeEntityBinding.js";
import { detectContenderAheadOfFavoriteClaim } from "../shared/wcUrTakeMatchup.js";
import { WC_INTENT } from "../shared/wcUrTakeIntent.js";

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

  for (const forbidden of forbiddenEntities) {
    if (textMentionsWcTeam(headline, forbidden)) {
      issueCodes.push("wc_forbidden_entity_headline");
      break;
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

  return {
    passed: issueCodes.length === 0,
    issueCodes,
    qaEntityMatch,
    qaIntentMatch,
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
      "wc_matchup_contender_ahead_of_favorite",
      "wc_matchup_missing_team_headline",
    ].includes(c),
  );
}

export const WC_QA_REGENERATION_SUFFIX = `

WC QA REGENERATION (mandatory — prior answer failed relevance checks):
- Answer ONLY the user's current question and REQUIRED ENTITIES from the user message.
- Do not recycle a prior thread thesis or a different team/group.
- For rules questions: lead with extra time and penalty shootout facts — no group-stage betting take.
- For group-stage MATCHUP questions: both teams can advance — frame 1st/2nd place paths; do not claim a Contender finishes ahead of the group Favorite without verified odds or form.
- Sentence one must directly answer the question with the correct team(s) named and strength tags acknowledged.`;
