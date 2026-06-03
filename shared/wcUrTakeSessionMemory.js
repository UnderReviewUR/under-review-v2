/**
 * World Cup UR Take — scoped session memory (prior takes + structural edge).
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";
import { classifyWcQuestionIntent, resolveContinuationEntities, WC_INTENT } from "./wcUrTakeIntent.js";
import { resolveRequiredEntities } from "./wcUrTakeEntityBinding.js";
import { appendSessionStructuralEdgeBlock } from "./urTakeSessionStructuralEdge.js";

/** @param {string} abbr */
function teamGroup(abbr) {
  const key = String(abbr || "").toUpperCase();
  const team = WC_2026_TEAMS.find((t) => String(t.abbreviation).toUpperCase() === key);
  return team?.group ? String(team.group).toUpperCase() : null;
}

/**
 * @param {object[]} history
 * @returns {string[]}
 */
export function extractSessionWcEntities(history) {
  if (!Array.isArray(history)) return [];
  /** @type {Set<string>} */
  const found = new Set();
  for (const turn of history) {
    const text = String(turn?.content || turn?.text || "");
    for (const abbr of extractMentionedWcTeams(text)) {
      found.add(String(abbr).toUpperCase());
    }
  }
  return [...found];
}

/**
 * @param {string} priorSummary
 * @param {object[]} history
 * @param {string} sportHint
 * @param {{ wcIntent?: string, requiredEntities?: string[], question?: string }} opts
 * @returns {{ summary: string, structuralEdgeInjected: boolean }}
 */
export function buildWcSessionMemoryPrompt(priorSummary, history, sportHint, opts = {}) {
  const wcIntent = opts.wcIntent || classifyWcQuestionIntent(opts.question || "", history);
  const requiredEntities = opts.requiredEntities?.length
    ? opts.requiredEntities.map((t) => String(t).toUpperCase())
    : resolveRequiredEntities(opts.question || "", history, wcIntent);

  if (wcIntent === WC_INTENT.RULES) {
    return { summary: "", structuralEdgeInjected: false };
  }

  const baseSummary = filterPriorTakesForWc(priorSummary, requiredEntities);
  const sessionEntities = extractSessionWcEntities(history);
  const entityChanged =
    requiredEntities.length > 0 &&
    sessionEntities.length > 0 &&
    !requiredEntities.every((e) => sessionEntities.includes(e));

  if (entityChanged) {
    return { summary: baseSummary, structuralEdgeInjected: false };
  }

  const withEdge = appendSessionStructuralEdgeBlock(baseSummary, history, sportHint);
  const structuralEdgeInjected = withEdge.length > (baseSummary || "").length;
  return { summary: withEdge, structuralEdgeInjected };
}

/**
 * @param {string} priorSummary
 * @param {string[]} requiredEntities
 */
function filterPriorTakesForWc(priorSummary, requiredEntities) {
  const raw = String(priorSummary || "").trim();
  if (!raw || !requiredEntities?.length) return raw;

  const reqGroups = new Set(requiredEntities.map(teamGroup).filter(Boolean));
  const reqSet = new Set(requiredEntities.map((t) => String(t).toUpperCase()));

  const lines = raw.split("\n");
  const kept = [];
  for (const line of lines) {
    const mentioned = extractMentionedWcTeams(line);
    if (!mentioned.length) {
      kept.push(line);
      continue;
    }
    const lineGroups = mentioned.map(teamGroup).filter(Boolean);
    const entityOverlap = mentioned.some((m) => reqSet.has(String(m).toUpperCase()));
    const groupOverlap = lineGroups.some((g) => reqGroups.has(g));
    if (entityOverlap || groupOverlap) kept.push(line);
  }

  const filtered = kept.join("\n").trim();
  if (!filtered || !/PRIOR TAKES THIS SESSION/i.test(filtered)) return filtered;
  return filtered;
}
