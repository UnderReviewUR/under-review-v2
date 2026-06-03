/**
 * World Cup UR Take — required entity extraction + prompt binding.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";
import { classifyWcQuestionIntent, resolveContinuationEntities, WC_INTENT } from "./wcUrTakeIntent.js";

/** @param {string} abbr */
export function wcTeamDisplayNames(abbr) {
  const key = String(abbr || "").toUpperCase();
  const team = WC_2026_TEAMS.find((t) => String(t.abbreviation).toUpperCase() === key);
  if (!team) return [key];
  const names = new Set([key, team.name, team.shortName].filter(Boolean).map(String));
  return [...names];
}

/**
 * @param {string} question
 * @param {object[]} [history]
 * @param {import("./wcUrTakeIntent.js").WcUrTakeIntent} [wcIntent]
 * @returns {string[]}
 */
export function resolveRequiredEntities(question, history = [], wcIntent) {
  const intent = wcIntent || classifyWcQuestionIntent(question, history);
  if (intent === WC_INTENT.RULES) return [];

  let entities = extractMentionedWcTeams(String(question || ""));
  if (intent === WC_INTENT.CONTINUATION && entities.length === 0) {
    entities = resolveContinuationEntities(history);
  }
  return [...new Set(entities.map((t) => String(t).toUpperCase()))];
}

/**
 * @param {string[]} requiredEntities
 * @returns {string}
 */
export function buildEntityBindingPromptBlock(requiredEntities = []) {
  const list = (Array.isArray(requiredEntities) ? requiredEntities : [])
    .map((t) => String(t).toUpperCase())
    .filter(Boolean);
  if (!list.length) return "";

  if (list.length === 1) {
    const names = wcTeamDisplayNames(list[0]).join(" / ");
    return `REQUIRED ENTITY (binding):
  Primary: ${list[0]} (${names})
  You MUST answer about ${list[0]} only. Do not discuss any other teams unless making a direct comparison to ${list[0]}.
  If you cannot answer about ${list[0]} from VERIFIED CONTEXT, say so — do not substitute another team.
  Do not carry strong opinions or narratives from previous questions about different matchups or teams.`;
  }

  const labels = list
    .map((abbr) => {
      const names = wcTeamDisplayNames(abbr);
      return `${abbr} (${names[0] || abbr})`;
    })
    .join(" and ");

  return `REQUIRED ENTITIES (binding):
  Teams: ${labels}
  You MUST answer about these teams only. Do not introduce unrelated teams or groups.
  If the question is who advances, address both teams explicitly in sentence one.
  Do not carry strong opinions or narratives from previous questions about different matchups or teams.`;
}

/**
 * @param {string} text
 * @param {string} abbr
 */
export function textMentionsWcTeam(text, abbr) {
  const blob = String(text || "");
  if (!blob.trim()) return false;
  const names = wcTeamDisplayNames(abbr);
  for (const name of names) {
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(blob)) return true;
  }
  return false;
}

/**
 * @param {string} text
 * @param {string[]} abbrs
 */
export function textMentionsAnyWcTeam(text, abbrs) {
  return (abbrs || []).some((a) => textMentionsWcTeam(text, a));
}
