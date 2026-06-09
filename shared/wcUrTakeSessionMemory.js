/**
 * World Cup UR Take — scoped session memory (prior takes + WC entity filters).
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";
import {
  classifyWcQuestionIntent,
  isWcGroupSlateQuestion,
  WC_INTENT,
} from "./wcUrTakeIntent.js";
import { isWcPlayerMarketIntent } from "./wcUrTakePlayerMarket.js";
import { resolveRequiredEntities } from "./wcUrTakeEntityBinding.js";
import { buildUrTakeSessionMemoryPrompt } from "./urTakeConversation.js";
import {
  filterPriorTakesOnWcConversationPivot,
  wcConversationPivotMeta,
} from "./wcUrTakeConversation.js";
import { isTournamentWinnerQuestion } from "./wcPhaseUtils.js";

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
 * @returns {{ summary: string, structuralEdgeInjected: boolean, conversationTransitionBlock: string }}
 */
export function buildWcSessionMemoryPrompt(priorSummary, history, sportHint, opts = {}) {
  const question = String(opts.question || "");
  const wcIntent = opts.wcIntent || classifyWcQuestionIntent(question, history);
  const requiredEntities = opts.requiredEntities?.length
    ? opts.requiredEntities.map((t) => String(t).toUpperCase())
    : resolveRequiredEntities(question, history, wcIntent);

  const base = buildUrTakeSessionMemoryPrompt(priorSummary, history, sportHint, {
    question,
    intent: wcIntent,
  });

  if (wcIntent === WC_INTENT.RULES) {
    return base;
  }

  let baseSummary = filterPriorTakesForWc(base.summary, requiredEntities);

  if (isWcGroupSlateQuestion(question)) {
    baseSummary = filterPriorTakesForWcGroupSlate(baseSummary);
  }

  const sessionEntities = extractSessionWcEntities(history);
  const tournamentWinnerPivot =
    isTournamentWinnerQuestion(question) && requiredEntities.length === 0;
  if (tournamentWinnerPivot && sessionEntities.length > 0) {
    baseSummary = filterPriorTakesOnWcConversationPivot(base.summary, question, history, wcIntent);
  }

  const entityChanged =
    (requiredEntities.length > 0 &&
      sessionEntities.length > 0 &&
      !requiredEntities.every((e) => sessionEntities.includes(e))) ||
    tournamentWinnerPivot;

  const pivot = wcConversationPivotMeta(question, history, wcIntent);
  const intentPivot =
    pivot.pivoted ||
    (isWcGroupSlateQuestion(question) &&
      history.some((t) => {
        if (t?.role !== "user") return false;
        const priorIntent = classifyWcQuestionIntent(String(t?.content || t?.text || ""), []);
        return isWcPlayerMarketIntent(priorIntent);
      }));

  if (entityChanged || intentPivot) {
    return {
      summary: baseSummary,
      structuralEdgeInjected: false,
      conversationTransitionBlock: base.conversationTransitionBlock,
    };
  }

  return {
    summary: baseSummary,
    structuralEdgeInjected: base.structuralEdgeInjected,
    conversationTransitionBlock: base.conversationTransitionBlock,
  };
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
