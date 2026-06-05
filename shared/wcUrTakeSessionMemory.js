/**
 * World Cup UR Take — scoped session memory (prior takes + structural edge).
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";
import {
  classifyWcQuestionIntent,
  isWcGroupSlateQuestion,
  resolveContinuationEntities,
  WC_INTENT,
} from "./wcUrTakeIntent.js";
import { isWcPlayerMarketIntent } from "./wcUrTakePlayerMarket.js";
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

  let baseSummary = filterPriorTakesForWc(priorSummary, requiredEntities);

  if (isWcGroupSlateQuestion(opts.question || "") || wcIntent === WC_INTENT.STRUCTURAL) {
    baseSummary = filterPriorTakesForWcGroupSlate(baseSummary);
  }

  const sessionEntities = extractSessionWcEntities(history);
  const entityChanged =
    requiredEntities.length > 0 &&
    sessionEntities.length > 0 &&
    !requiredEntities.every((e) => sessionEntities.includes(e));

  const intentPivot =
    isWcGroupSlateQuestion(opts.question || "") &&
    history.some((t) => {
      if (t?.role !== "user") return false;
      const priorIntent = classifyWcQuestionIntent(String(t?.content || t?.text || ""), []);
      return isWcPlayerMarketIntent(priorIntent);
    });

  if (entityChanged || intentPivot) {
    return { summary: baseSummary, structuralEdgeInjected: false };
  }

  if (String(sportHint || "").toLowerCase() === "worldcup") {
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

const PLAYER_MARKET_PRIOR_RE =
  /\b(golden boot|top scorer|mbapp|haaland|kane|bellingham|\+600|\+800|player market|goal scorer)\b/i;

/**
 * Drop prior-session lines that are player-market reads when the user pivots to group/slate questions.
 * @param {string} priorSummary
 */
function filterPriorTakesForWcGroupSlate(priorSummary) {
  let raw = String(priorSummary || "").trim();
  if (!raw) return "";
  if (/SESSION STRUCTURAL EDGE/i.test(raw)) {
    raw = raw
      .split(/\n\n+/)
      .filter((block) => !/SESSION STRUCTURAL EDGE/i.test(block))
      .join("\n\n")
      .trim();
  }
  const lines = raw.split("\n");
  const kept = lines.filter((line) => {
    if (/^PRIOR TAKES THIS SESSION/i.test(line)) return true;
    if (/^When the current question/i.test(line)) return true;
    if (/^Never silently contradict/i.test(line)) return true;
    if (/^\d+\.\s/.test(line) && PLAYER_MARKET_PRIOR_RE.test(line)) return false;
    return true;
  });
  return kept.join("\n").trim();
}
