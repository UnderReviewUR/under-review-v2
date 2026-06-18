/**
 * Phase 2+3 — WC player props shape routing + Claude grounding prompt.
 */

import { WC_INTENT } from "./wcUrTakeIntent.js";
import { detectParlayIntent } from "./detectParlayIntent.js";
import {
  isWcNamedPlayerPropQuestion,
  isGenericWcPlayerPropQuestion,
  isWcPlayerMarketIntent,
  extractWcNamedPlayerPropLegsFromQuestion,
} from "./wcUrTakePlayerMarket.js";
import { isWcPlayerPropFollowUpExplain } from "./wcFollowUpExplain.js";
import { wcMatchupTeamDisplayName } from "./wcMatchupWinnerLine.js";
import {
  hasMatchPlayerPropRows,
  matchPlayerPropRowsFromEvent,
  WC_MATCH_PLAYER_PROP_MARKET_KEYS,
} from "./wcMatchPlayerProps.js";
import { WC_GROUNDING_INVENTORY_LABELS } from "./wcGroundingLabels.js";
import { resolveWcPlayerPropSlateFixtureTeams } from "./wcPlayerPropFixture.js";
import {
  isWcLiveMatchStatus,
  isWcScheduledMatchStatus,
  isWcFinishedMatchStatus,
} from "./wcFeaturedMatch.js";

/** @typedef {import("./wcGroundingPacket.types.js").WcPropAskShape} WcPropAskShape */

/**
 * Whether this turn should build a grounding packet and route by ask.shape.
 * @param {object} params
 */
export function isWcPropsShapeRoutedAsk(params) {
  const {
    sportHint,
    wcIntent,
    routingQuestion = "",
    hasImage = false,
    history = [],
  } = params;
  if (sportHint !== "worldcup") return false;
  if (hasImage) return true;
  const q = String(routingQuestion || "").trim();
  if (isWcPlayerMarketIntent(wcIntent)) return true;
  if (wcIntent === WC_INTENT.PLAYER_PROP) return true;
  if (isWcNamedPlayerPropQuestion(q)) return true;
  if (isGenericWcPlayerPropQuestion(q)) return true;
  if (detectParlayIntent(q) && /\bplayer\b/i.test(q)) return true;
  if (isWcPlayerPropFollowUpExplain(q, history)) return true;
  return false;
}

/**
 * Skip deterministic props fast-path answers — route to Claude instead (Phase 2).
 * follow_up_explain keeps the existing explain fast path.
 * @param {WcPropAskShape} shape
 */
export function shouldSkipWcPlayerPropsFastPathForShape(shape) {
  return (
    shape === "image_slip" ||
    shape === "fixture_board" ||
    shape === "named_legs" ||
    shape === "slate"
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} eventPayload
 */
function postedMarketLabelsForEvent(eventPayload) {
  if (!eventPayload || !hasMatchPlayerPropRows(eventPayload)) return [];
  /** @type {string[]} */
  const labels = [];
  for (const key of WC_MATCH_PLAYER_PROP_MARKET_KEYS) {
    const rows = matchPlayerPropRowsFromEvent(eventPayload, key, 2);
    if (rows.length >= 1) {
      labels.push(WC_GROUNDING_INVENTORY_LABELS[key] || key);
    }
  }
  return labels;
}

/**
 * Slim slate fixture summaries for Claude (3–5 fixtures).
 * @param {Array<Record<string, unknown>>} matches
 * @param {Record<string, Record<string, unknown>> | null | undefined} matchPlayerPropsByEvent
 * @param {string} question
 * @param {number} [nowMs]
 */
export function buildWcGroundingSlateClaudeSummary(
  matches = [],
  matchPlayerPropsByEvent = null,
  question = "",
  nowMs = Date.now(),
) {
  const slateTeams = resolveWcPlayerPropSlateFixtureTeams(question, matches, nowMs);
  const active = (matches || []).filter(
    (m) =>
      (isWcLiveMatchStatus(m.status) || isWcScheduledMatchStatus(m.status)) &&
      !isWcFinishedMatchStatus(m.status),
  );

  /** @type {Array<Record<string, unknown>>} */
  let candidates = active;
  if (slateTeams.length >= 2) {
    const want = new Set(slateTeams.map((t) => String(t).toUpperCase()));
    candidates = active.filter((m) => {
      const home = String(m.homeTeam || "").toUpperCase();
      const away = String(m.awayTeam || "").toUpperCase();
      return want.has(home) || want.has(away);
    });
  }

  return candidates.slice(0, 5).map((m) => {
    const eventId = String(m.id || "");
    const payload =
      (matchPlayerPropsByEvent && matchPlayerPropsByEvent[eventId]) || null;
    const home = String(m.homeTeam || "").toUpperCase();
    const away = String(m.awayTeam || "").toUpperCase();
    const posted = postedMarketLabelsForEvent(payload);
    return {
      eventId,
      fixture: `${wcMatchupTeamDisplayName(home)} vs ${wcMatchupTeamDisplayName(away)} (${home}–${away})`,
      status: String(m.status || "NS"),
      postedMarkets: posted,
      hasProps: posted.length > 0,
    };
  });
}

/**
 * Serialize views.claude (+ slate summary when applicable) for Anthropic context.
 * @param {import("./wcGroundingPacket.types.js").WcGroundingPacket | null | undefined} packet
 * @param {object} [opts]
 */
export function buildWcGroundingClaudePromptBlock(packet, opts = {}) {
  if (!packet?.views?.claude) return "";
  const claude = packet.views.claude;
  /** @type {Record<string, unknown>} */
  const payload = {
    askShape: claude.askShape,
    fixture: claude.pinned,
    freshness: claude.freshness,
    markets: claude.markets,
    blockers: claude.blockers,
    namedLegMatches: claude.namedLegMatches,
    instructions:
      claude.instructions ||
      "Cite only legIds from markets[].topLegs when quoting odds, or explain blockers when you cannot.",
  };

  if (packet.ask.shape === "slate" && Array.isArray(opts.slateFixtures)) {
    payload.slateFixtures = opts.slateFixtures;
  }

  return [
    "WC PLAYER PROPS — GROUNDING PACKET (binding JSON; do not invent lines outside this object)",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

/**
 * Player-market Claude appendix: grounding packet + non-fixture tier context (Golden Boot, squad).
 * @param {object} params
 */
export function buildWcPlayerMarketGroundingPromptBlock(params) {
  const { packet, supplementalPromptBlock = "" } = params;
  if (!packet) return supplementalPromptBlock;
  const slateSummary =
    packet.ask.shape === "slate" ? params.slateFixturesSummary || [] : null;
  const grounding = buildWcGroundingClaudePromptBlock(packet, {
    slateFixtures: slateSummary,
  });
  if (!supplementalPromptBlock) return `${grounding}\n\n`;
  return `${grounding}\n\n${supplementalPromptBlock}\n\n`;
}
