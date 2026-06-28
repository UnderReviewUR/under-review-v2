/**
 * WC talk-mode grounding — truncate VERIFIED CONTEXT for Haiku talk threads.
 */

import { extractLastAssistantStructured } from "./wcCardContractFollowUpScorer.js";
import { buildWcTalkSquadGroundingBlock } from "./wcPlayerRegistry.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

export const WC_TALK_VERIFIED_CONTEXT_MAX_CHARS = 4500;

/**
 * @param {Record<string, unknown> | null | undefined} wcContext
 * @param {unknown[]} [history]
 */
export function buildWcTalkContextSnippet(wcContext, history = []) {
  const prior = extractLastAssistantStructured(history);
  const fixtures = [
    ...(Array.isArray(wcContext?.fixtures) ? wcContext.fixtures : []),
    ...(Array.isArray(wcContext?.matchDetails) ? wcContext.matchDetails : []),
  ];
  const fx = fixtures[0];
  const home = String(
    fx?.homeTeam || prior?.fixtureHome || wcContext?.requiredEntities?.[0] || "",
  ).trim();
  const away = String(
    fx?.awayTeam || prior?.fixtureAway || wcContext?.requiredEntities?.[1] || "",
  ).trim();
  if (!home || !away) return "";
  const odds = fx?.odds && typeof fx.odds === "object" ? fx.odds : null;
  const homeMl = odds?.home?.moneyline || odds?.home;
  const awayMl = odds?.away?.moneyline || odds?.away;
  const drawMl = odds?.draw?.moneyline || odds?.draw;
  const round = String(fx?.round || "").trim();
  const lines = [`Fixture: ${home} vs ${away}`];
  if (round) lines.push(`Round: ${round}`);
  if (homeMl || awayMl) {
    lines.push(
      `ML: ${home} ${homeMl || "n/a"} · Draw ${drawMl || "n/a"} · ${away} ${awayMl || "n/a"}`,
    );
  }
  if (wcContext?.phase) lines.push(`Tournament phase: ${wcContext.phase}`);
  const squadBlock = buildWcTalkSquadGroundingBlock(wcContext, history);
  if (squadBlock) lines.push(squadBlock);
  return lines.join("\n");
}

/**
 * @param {string} text
 * @param {number} [max]
 */
export function truncateForTalkPrompt(text, max = WC_TALK_VERIFIED_CONTEXT_MAX_CHARS) {
  const s = String(text || "").trim();
  if (!s || s.length <= max) return s;
  return `${s.slice(0, max)}\n...[verified context truncated]`;
}

/**
 * Prebuilt fast-path stubs carry no VERIFIED CONTEXT prompt block.
 * @param {Record<string, unknown> | null | undefined} wcContext
 */
export function isWcStubUrTakeContext(wcContext) {
  if (!wcContext || typeof wcContext !== "object") return true;
  const src = String(wcContext.source || "");
  if (/prebuilt|stub/i.test(src)) return true;
  if (String(wcContext.promptBlock || "").trim()) return false;
  const fixtures = [
    ...(Array.isArray(wcContext.fixtures) ? wcContext.fixtures : []),
    ...(Array.isArray(wcContext.matchDetails) ? wcContext.matchDetails : []),
  ];
  if (fixtures.length) return false;
  const groups =
    wcContext.groups && typeof wcContext.groups === "object" ? wcContext.groups : {};
  if (Object.keys(groups).length >= 4) return false;
  if (wcContext.tournamentSimBlock || wcContext.staticRulesBlock) return false;
  return true;
}

/**
 * @param {Record<string, unknown> | null | undefined} wcContext
 * @param {unknown[]} [history]
 * @param {string} [wcIntent]
 */
export function buildWcTalkVerifiedContextBlock(wcContext, history = [], wcIntent = "") {
  const intent = String(wcIntent || wcContext?.wcIntent || "")
    .trim()
    .toUpperCase();
  const promptRaw = String(wcContext?.promptBlock || "").trim();
  const snippet = buildWcTalkContextSnippet(wcContext, history);
  const parts = [];

  if (promptRaw) {
    parts.push(truncateForTalkPrompt(promptRaw));
  } else if (intent === WC_INTENT.RULES && wcContext?.staticRulesBlock) {
    parts.push(
      truncateForTalkPrompt(
        [
          "WORLD CUP 2026 — TOURNAMENT RULES (factual reference)",
          `Phase: ${wcContext.phase || "PRE_GROUP"}`,
          "",
          String(wcContext.staticRulesBlock),
          wcContext.knockoutAppendix ? `\n${wcContext.knockoutAppendix}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    );
  }

  if (snippet) {
    parts.push(`FIXTURE PIN (cite only these prices and squads):\n${snippet}`);
  }

  return parts.filter(Boolean).join("\n\n");
}

/**
 * Talk may proceed when prior structured lean or verified fixture/rules context exists.
 * @param {Record<string, unknown> | null | undefined} wcContext
 * @param {unknown[]} [history]
 * @param {string} [wcIntent]
 */
export function hasWcTalkGrounding(wcContext, history = [], wcIntent = "") {
  const prior = extractLastAssistantStructured(history);
  if (prior?.lean || prior?.call) return true;

  const block = buildWcTalkVerifiedContextBlock(wcContext, history, wcIntent);
  if (block) return true;

  return false;
}
