/**
 * Wire WcGroundingPacket into UR Take player-props paths (Phase 1).
 */

import { buildWcGroundingPacket } from "./_wcGroundingPacket.js";
import { wcMatchupTeamDisplayName } from "../shared/wcMatchupWinnerLine.js";
import { kvHasFreshMatchPlayerProps } from "../shared/wcMatchPlayerProps.js";
import { WC_MATCH_PLAYER_PROPS_MAX_AGE_MS } from "../shared/wc2026PlayerConstants.js";
import {
  isWcLiveMatchStatus,
  isWcFinishedMatchStatus,
} from "../shared/wcFeaturedMatch.js";
import { formatWcLiveGameStateLine } from "../shared/wcKickoffDisplay.js";
import { isWcBdlSource } from "../shared/wcBdlPolicy.js";
import { detectParlayIntent } from "../shared/detectParlayIntent.js";
import { repairWcVerifiedPlayerMarketCardFace, resolveWcPlayerPropDisplayLean } from "../shared/wcUrTakePlayerMarket.js";
import { resolveWcPropBoardMarketKeysForQuestion } from "../shared/wcMatchPlayerProps.js";
import {
  isWcNamedPlayerPropQuestion,
  isGenericWcPlayerPropQuestion,
  isWcPlayerMarketIntent,
  extractWcNamedPlayerPropLegsFromQuestion,
} from "../shared/wcUrTakePlayerMarket.js";
import { isWcPlayerPropFollowUpExplain } from "../shared/wcFollowUpExplain.js";
import {
  resolveWcPlayerPropFixtureTeams,
  resolveWcEventIdForFixtureTeams,
  findWcNamedPlayerPropLegMatch,
} from "../shared/wcPlayerPropFixture.js";
import { isWcNamedLegPropsStructuredCard } from "../shared/wcNamedLegCardUi.js";

function isWcParlayStructuredCard(structured) {
  return String(structured?.callType || "").toLowerCase() === "parlay";
}
import { WC_INTENT } from "../shared/wcUrTakeIntent.js";
import { extractMentionedWcTeams } from "../shared/wcUrTakeKeywords.js";
import { resolveWcFixturePairFromHistory } from "../shared/wcFixtureMatchupPrebuilt.js";
import { readWcMatchPlayerPropsForEvent } from "./_wcMatchPlayerProps.js";
import {
  buildWcGroundingSlateClaudeSummary,
  isWcPropsShapeRoutedAsk,
} from "../shared/wcGroundingShapeRoute.js";

/**
 * @param {Record<string, unknown> | null | undefined} eventPayload
 */
export function extractRawMarketsFromMatchPlayerPropsEvent(eventPayload) {
  if (!eventPayload || typeof eventPayload !== "object") return {};
  const markets = eventPayload.markets;
  if (markets && typeof markets === "object" && !Array.isArray(markets)) {
    return /** @type {Record<string, Array<Record<string, unknown>>>} */ (markets);
  }
  return {};
}

/**
 * @param {Record<string, unknown> | null | undefined} match
 */
function resolveClockDisplayFromMatch(match) {
  if (!match || typeof match !== "object") return null;
  const status = String(match.status || "").toLowerCase();
  const minuteRaw = match.minute != null ? String(match.minute).trim().replace(/'/g, "") : "";
  if (status === "1h" || status === "1st") {
    return minuteRaw ? `1st half, ${minuteRaw}'` : "1st half";
  }
  if (status === "2h" || status === "2nd") {
    return minuteRaw ? `2nd half, ${minuteRaw}'` : "2nd half";
  }
  if (status === "ht") return "Halftime";
  const liveLine = formatWcLiveGameStateLine(match);
  if (liveLine) {
    const parts = liveLine.split(" · ");
    return parts.filter((p) => !/live/i.test(p) && !/^[A-Z]{3}\s+\d/.test(p)).join(" · ") || null;
  }
  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} match
 */
function normalizeMatchStatus(match) {
  if (!match) return "UNKNOWN";
  const status = String(match.status || "").toLowerCase();
  if (isWcLiveMatchStatus(match.status)) return "live";
  if (status === "ht") return "HT";
  if (/scheduled|ns|not started|timed|upcoming/i.test(status)) return "NS";
  if (/final|ft|finished|complete/i.test(status)) return "FT";
  return "UNKNOWN";
}

/**
 * @param {Array<Record<string, unknown>>} matches
 * @param {string} teamA
 * @param {string} teamB
 */
function findFixtureMatches(matches, teamA, teamB) {
  const want = new Set(
    [teamA, teamB].map((t) => String(t || "").trim().toUpperCase()).filter(Boolean),
  );
  if (want.size < 2) return [];
  return (matches || []).filter((m) => {
    const home = String(m.homeTeam || "").trim().toUpperCase();
    const away = String(m.awayTeam || "").trim().toUpperCase();
    return want.has(home) && want.has(away);
  });
}

/**
 * @param {Array<Record<string, unknown>>} matches
 * @param {string} eventId
 */
function findMatchByEventId(matches, eventId) {
  const id = String(eventId || "").trim();
  if (!id) return null;
  return (matches || []).find((m) => String(m.id) === id) || null;
}

/**
 * @param {Record<string, unknown> | null | undefined} match
 */
function matchOddsFromFixtureMatch(match) {
  const odds = match?.odds;
  return odds && typeof odds === "object" && !Array.isArray(odds)
    ? /** @type {Record<string, unknown>} */ (odds)
    : undefined;
}

/**
 * @param {object} params
 */
export function resolveWcGroundingPinnedFixture(params) {
  const {
    matches = [],
    fixtureTeams = [],
    resolvedEventId = null,
    matchPlayerProps = null,
    pinMethod = "two_teams_in_question",
  } = params;

  const home = String(
    fixtureTeams[0] || matchPlayerProps?.homeTeam || "",
  )
    .trim()
    .toUpperCase();
  const away = String(
    fixtureTeams[1] || matchPlayerProps?.awayTeam || "",
  )
    .trim()
    .toUpperCase();
  if (!home || !away) return null;

  const relevant = findFixtureMatches(matches, home, away);
  const match =
    findMatchByEventId(matches, resolvedEventId) ||
    relevant[0] ||
    null;

  /** @type {import("../shared/wcGroundingPacket.types.js").WcPinnedFixture["alternateCandidates"]} */
  const alternateCandidates =
    relevant.length > 1
      ? relevant
          .filter((m) => String(m.id) !== String(match?.id || resolvedEventId))
          .map((m) => ({
            eventId: String(m.id),
            home: String(m.homeTeam || "").toUpperCase(),
            away: String(m.awayTeam || "").toUpperCase(),
            status: normalizeMatchStatus(m),
          }))
      : undefined;

  const singleTeamMentioned = extractMentionedWcTeams(String(params.routingQuestion || "")).length === 1;
  if (singleTeamMentioned && !alternateCandidates?.length) {
    const nation = extractMentionedWcTeams(String(params.routingQuestion || ""))[0];
    const nationMatches = (matches || []).filter((m) => {
      const h = String(m.homeTeam || "").toUpperCase();
      const a = String(m.awayTeam || "").toUpperCase();
      return (h === nation || a === nation) && !isWcFinishedMatchStatus(m.status);
    });
    if (nationMatches.length > 1) {
      const pinnedId = String(match?.id || resolvedEventId || "");
      const alts = nationMatches
        .filter((m) => String(m.id) !== pinnedId)
        .map((m) => ({
          eventId: String(m.id),
          home: String(m.homeTeam || "").toUpperCase(),
          away: String(m.awayTeam || "").toUpperCase(),
          status: normalizeMatchStatus(m),
        }));
      if (alts.length) {
        return {
          eventId: String(resolvedEventId || match?.id || ""),
          bdlMatchId: match?.bdlMatchId != null ? Number(match.bdlMatchId) : null,
          home,
          away,
          homeDisplay: wcMatchupTeamDisplayName(home),
          awayDisplay: wcMatchupTeamDisplayName(away),
          status: normalizeMatchStatus(match),
          kickoffUtc:
            match?.commenceTs != null && Number.isFinite(Number(match.commenceTs))
              ? new Date(Number(match.commenceTs)).toISOString()
              : null,
          slateDateEt: match?.date ? String(match.date).slice(0, 10) : null,
          clockDisplay: resolveClockDisplayFromMatch(match),
          pinMethod,
          matchOdds: matchOddsFromFixtureMatch(match),
          alternateCandidates: alts,
        };
      }
    }
  }

  return {
    eventId: String(resolvedEventId || match?.id || matchPlayerProps?.eventId || ""),
    bdlMatchId: match?.bdlMatchId != null ? Number(match.bdlMatchId) : null,
    home,
    away,
    homeDisplay: wcMatchupTeamDisplayName(home),
    awayDisplay: wcMatchupTeamDisplayName(away),
    status: normalizeMatchStatus(match),
    kickoffUtc:
      match?.commenceTs != null && Number.isFinite(Number(match.commenceTs))
        ? new Date(Number(match.commenceTs)).toISOString()
        : null,
    slateDateEt: match?.date ? String(match.date).slice(0, 10) : null,
    clockDisplay: resolveClockDisplayFromMatch(match),
    pinMethod,
    matchOdds: matchOddsFromFixtureMatch(match),
    alternateCandidates,
  };
}

/**
 * @param {object} params
 */
export function resolveWcGroundingDataFreshness(params) {
  const { matchPlayerProps = null, match = null, loadMeta = null, nowMs = Date.now() } = params;
  const lastUpdated = Number(matchPlayerProps?.lastUpdated) || 0;
  const ageMs = lastUpdated > 0 ? Math.max(0, nowMs - lastUpdated) : 0;
  const inPlay = match ? isWcLiveMatchStatus(match.status) : false;
  const staleAfterSec = inPlay ? 90 : Math.round(WC_MATCH_PLAYER_PROPS_MAX_AGE_MS / 1000);

  let source = "none";
  if (matchPlayerProps) {
    const rawSource = String(matchPlayerProps.source || "").trim();
    if (isWcBdlSource(rawSource)) source = "balldontlie";
    else if (rawSource.toLowerCase() === "seed") source = "seed";
    else source = "mixed";
  }

  const isStale = matchPlayerProps
    ? !kvHasFreshMatchPlayerProps(matchPlayerProps, {
        nowMs,
        maxAgeMs: inPlay ? 90_000 : WC_MATCH_PLAYER_PROPS_MAX_AGE_MS,
      })
    : true;

  return {
    source,
    ageMs,
    ageSec: Math.round(ageMs / 1000),
    fetchedAt: lastUpdated ? new Date(lastUpdated).toISOString() : new Date(nowMs).toISOString(),
    inPlay,
    refresh: {
      attempted: Boolean(loadMeta?.refreshAttempted),
      succeeded: Boolean(loadMeta?.refreshSucceeded),
      reason: loadMeta?.refreshReason || "fresh_enough",
      durationMs:
        loadMeta?.refreshDurationMs != null ? Number(loadMeta.refreshDurationMs) : null,
    },
    isStale,
    staleAfterSec,
  };
}

/**
 * @param {object} params
 */
export function resolveWcGroundingAskContext(params) {
  const {
    question = "",
    routingQuestion = "",
    history = [],
    hasImage = false,
    namedPlayerPropsAsk = false,
  } = params;
  const q = String(routingQuestion || question || "").trim();
  const mentionedTeams = extractMentionedWcTeams(q).map((t) => String(t).toUpperCase());

  /** @type {import("../shared/wcGroundingPacket.types.js").WcPropAskShape} */
  let shape = "fixture_board";
  if (hasImage) shape = "image_slip";
  else if (isWcPlayerPropFollowUpExplain(q, history)) shape = "follow_up_explain";
  else if (namedPlayerPropsAsk || isWcNamedPlayerPropQuestion(q)) shape = "named_legs";
  else if (isGenericWcPlayerPropQuestion(q) && mentionedTeams.length < 2) shape = "slate";

  return {
    shape,
    question: String(question || "").trim(),
    routingQuestion: q,
    hasImage: Boolean(hasImage),
    mentionedTeams,
  };
}

/**
 * @param {object} params
 */
export function buildWcGroundingPacketForUrTake(params) {
  const {
    requestId,
    question,
    routingQuestion,
    history = [],
    matches = [],
    fixtureTeams = [],
    resolvedEventId = null,
    matchPlayerProps = null,
    loadMeta = null,
    hasImage = false,
    namedLegMatches = [],
    pinMethod = "two_teams_in_question",
  } = params;

  const match = findMatchByEventId(matches, resolvedEventId);
  const pinnedFixture = resolveWcGroundingPinnedFixture({
    matches,
    fixtureTeams,
    resolvedEventId,
    matchPlayerProps,
    routingQuestion,
    pinMethod,
  });

  return buildWcGroundingPacket({
    requestId: String(requestId || ""),
    askContext: resolveWcGroundingAskContext({
      question,
      routingQuestion,
      history,
      hasImage,
      namedPlayerPropsAsk: isWcNamedPlayerPropQuestion(String(routingQuestion || question || "")),
    }),
    pinnedFixture,
    rawBdlPlayerProps: extractRawMarketsFromMatchPlayerPropsEvent(matchPlayerProps),
    dataFreshness: resolveWcGroundingDataFreshness({ matchPlayerProps, match, loadMeta }),
    namedLegMatches,
  });
}

/**
 * Map parsed named legs to WcNamedLegMatch against posted ladder.
 * @param {string} question
 * @param {Record<string, unknown> | null | undefined} matchPlayerProps
 */
export function resolveWcNamedLegMatchesForGrounding(question, matchPlayerProps) {
  const legs = extractWcNamedPlayerPropLegsFromQuestion(question);
  if (!legs.length) return [];

  return legs.map((leg) => {
    /** @type {import("../shared/wcGroundingPacket.types.js").WcParsedNamedLeg} */
    const parsedLeg = {
      playerHint: leg.name,
      nationAbbr: null,
      market: /** @type {import("../shared/wcGroundingPacket.types.js").WcPropMarketKey} */ (
        leg.marketKey
      ),
      threshold: leg.threshold ? Number.parseFloat(String(leg.threshold)) : null,
      marketLabel: leg.marketLabel,
    };

    const hit = findWcNamedPlayerPropLegMatch(leg, matchPlayerProps);
    if (!hit?.row) {
      return {
        leg: parsedLeg,
        status: /** @type {const} */ ("missing_player"),
        matched: null,
        lineDelta: null,
        fallbackNote: null,
      };
    }

    const postedLine = hit.row.line != null ? Number.parseFloat(String(hit.row.line)) : null;
    const asked = parsedLeg.threshold;
    const lineDelta =
      postedLine != null && asked != null && Number.isFinite(asked)
        ? Math.abs(postedLine - asked)
        : null;

    return {
      leg: parsedLeg,
      status: hit.isProxy ? /** @type {const} */ ("partial") : /** @type {const} */ ("matched"),
      matched: {
        legId: String(hit.row.legId || `named|${leg.name}|${hit.marketKey}|${hit.row.line}|over`),
        playerId: hit.row.playerId != null ? Number(hit.row.playerId) : null,
        playerName: String(hit.row.name || leg.name),
        nationAbbr: hit.row.nationAbbr ? String(hit.row.nationAbbr) : null,
        market: /** @type {import("../shared/wcGroundingPacket.types.js").WcPropMarketKey} */ (
          hit.marketKey
        ),
        line: hit.row.line != null ? String(hit.row.line) : null,
        side: "over",
        americanOdds: String(hit.row.americanOdds || ""),
        decimalOdds: null,
        vendor: String(hit.row.vendor || hit.row.book || "balldontlie"),
      },
      lineDelta,
      fallbackNote: hit.proxyNote || (hit.isProxy ? hit.marketLabel : null),
    };
  });
}

/**
 * Build grounding packet for handler — cache-only props on image asks (no live BDL refresh).
 * @param {object} params
 */
export async function prepareWcGroundingPacketForHandler(params) {
  const {
    sportHint,
    wcIntent,
    question,
    routingQuestion,
    history = [],
    hasImage = false,
    wcContext,
    wcRequiredEntities = [],
    requestId,
  } = params;

  if (
    !isWcPropsShapeRoutedAsk({
      sportHint,
      wcIntent,
      routingQuestion,
      hasImage,
      history,
    })
  ) {
    return null;
  }

  const matches = wcContext?.allMatches || [];
  const historyPair = resolveWcFixturePairFromHistory(history);
  let resolvedEventId =
    String(wcContext?.wcEventId || wcContext?.playerMarketKv?.wcEventId || historyPair?.eventId || "")
      .trim() || null;

  let matchPlayerProps = wcContext?.playerMarketKv?.matchPlayerProps || null;
  const loadMeta = wcContext?.playerMarketKv?.loadMeta || null;
  const matchPlayerPropsByEvent = wcContext?.playerMarketKv?.matchPlayerPropsByEvent || null;

  if (hasImage && !matchPlayerProps && resolvedEventId) {
    matchPlayerProps = await readWcMatchPlayerPropsForEvent(resolvedEventId, Date.now()).catch(
      () => null,
    );
  }

  const fixtureTeams = resolveWcPlayerPropFixtureTeams(String(routingQuestion || question || ""), history, {
    requiredEntities: wcRequiredEntities,
    conversationHistory: history,
  });

  if (!resolvedEventId && fixtureTeams.length >= 2 && matches.length) {
    resolvedEventId = resolveWcEventIdForFixtureTeams(matches, fixtureTeams[0], fixtureTeams[1]);
  }

  const namedLegMatches = resolveWcNamedLegMatchesForGrounding(
    String(routingQuestion || question || ""),
    matchPlayerProps,
  );

  const packet = buildWcGroundingPacketForUrTake({
    requestId,
    question: String(question || ""),
    routingQuestion: String(routingQuestion || question || ""),
    history,
    matches,
    fixtureTeams:
      fixtureTeams.length >= 2
        ? fixtureTeams
        : historyPair?.home && historyPair?.away
          ? [historyPair.home, historyPair.away]
          : [],
    resolvedEventId,
    matchPlayerProps,
    loadMeta,
    hasImage,
    namedLegMatches,
    pinMethod: hasImage ? "image_context" : "two_teams_in_question",
  });

  if (packet.ask.shape === "slate") {
    packet.slateFixturesSummary = buildWcGroundingSlateClaudeSummary(
      matches,
      matchPlayerPropsByEvent,
      String(routingQuestion || question || ""),
    );
  }

  return packet;
}

/**
 * @param {import("../shared/wcGroundingPacket.types.js").WcPinnedFixture | null} pinnedFixture
 */
function formatFixtureAmbiguityCaveat(pinnedFixture) {
  const alts = pinnedFixture?.alternateCandidates;
  if (!Array.isArray(alts) || !alts.length) return null;
  const pinnedLabel = pinnedFixture
    ? `${pinnedFixture.homeDisplay} vs ${pinnedFixture.awayDisplay}`
    : "this fixture";
  const otherLabels = alts.map(
    (c) => `${wcMatchupTeamDisplayName(c.home)} vs ${wcMatchupTeamDisplayName(c.away)}`,
  );
  return `Did you mean ${pinnedLabel} or ${otherLabels.join(" or ")} today?`;
}

/**
 * Merge grounding card view onto a structured player-props response.
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {import("../shared/wcGroundingPacket.types.js").WcGroundingPacket | null | undefined} packet
 * @param {object} [opts]
 * @param {string} [opts.question]
 */
export function applyWcGroundingCardToStructured(structured, packet, opts = {}) {
  if (!structured || typeof structured !== "object" || !packet?.views?.card) {
    return structured;
  }
  const card = packet.views.card;
  const blockerMessages = Array.isArray(packet.blockers?.messages)
    ? packet.blockers.messages.filter(Boolean)
    : [];
  const ambiguity = formatFixtureAmbiguityCaveat(packet.pinnedFixture);
  const existing = Array.isArray(structured.caveats)
    ? structured.caveats.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  const mergedCaveats = [
    ...(ambiguity ? [ambiguity] : []),
    ...blockerMessages.filter((m) => !existing.includes(m)),
    ...existing,
  ];

  const seed = card.structuredSeed || {};
  const namedLegCard = isWcNamedLegPropsStructuredCard({
    call: structured.call,
    lean: structured.lean,
    wcNamedPlayerPropsCard: structured.wcNamedPlayerPropsCard,
  });
  const { propBoardRows: _boardRows, ...seedRest } = seed;
  const seedMerge = namedLegCard ? seedRest : seed;

  const merged = {
    ...structured,
    ...seedMerge,
    groundingVisible: true,
    groundingPinBanner: card.pinBanner,
    groundingInventoryStrip: card.inventoryStrip,
    caveats: mergedCaveats,
    wcEventId: structured.wcEventId || seed.wcEventId || packet.pinnedFixture?.eventId,
    fixtureHome: structured.fixtureHome || seed.fixtureHome || packet.pinnedFixture?.home,
    fixtureAway: structured.fixtureAway || seed.fixtureAway || packet.pinnedFixture?.away,
    matchOdds:
      structured.matchOdds || seed.matchOdds || packet.pinnedFixture?.matchOdds || undefined,
  };

  const question = String(
    opts.question ||
      structured.analysis ||
      packet?.ask?.question ||
      structured.userQuestion ||
      "",
  ).trim();
  const askedMarkets = resolveWcPropBoardMarketKeysForQuestion(question);
  if (askedMarkets?.length && Array.isArray(merged.propBoardRows)) {
    const filtered = merged.propBoardRows.filter((row) =>
      askedMarkets.includes(String(row.market || "")),
    );
    if (filtered.length >= 2) {
      merged.propBoardRows = filtered;
    }
  }
  if (question && !namedLegCard) {
    merged.lean = resolveWcPlayerPropDisplayLean({
      lean: merged.lean,
      call: merged.call,
      whyNow: merged.whyNow,
      line: merged.line,
      summary: merged.summary,
      deep: merged.deep,
      question,
      propBoardRows: Array.isArray(merged.propBoardRows) ? merged.propBoardRows : [],
      matchOdds: merged.matchOdds,
      fixtureHome: merged.fixtureHome,
      fixtureAway: merged.fixtureAway,
    });
    if (String(merged.playerMarketTier || "") === "verified" && !isWcParlayStructuredCard(merged)) {
      return repairWcVerifiedPlayerMarketCardFace(merged, question);
    }
  }

  return merged;
}

/**
 * @param {string} wcIntent
 * @param {Record<string, unknown> | null | undefined} structured
 */
export function shouldApplyWcPropsGrounding(wcIntent, structured) {
  if (!structured || typeof structured !== "object") return false;
  if (!isWcPlayerMarketIntent(wcIntent) && wcIntent !== WC_INTENT.PLAYER_PROP) {
    if (!(detectParlayIntent(String(structured.analysis || "")) && structured.sport === "worldcup")) {
      return false;
    }
  }
  const ct = String(structured.callType || "").toLowerCase();
  if (ct.startsWith("player_market") || ct === "player_prop" || ct === "parlay") return true;
  if (structured.playerMarketTier) return true;
  if (structured.sport === "worldcup" && (structured.fixtureHome || structured.wcEventId)) return true;
  return false;
}

/**
 * Build + apply grounding for handler paths (fast path builds inline).
 * @param {object} params
 */
export function tryApplyWcPlayerPropsGroundingToStructured(params) {
  const {
    structured,
    requestId,
    question,
    routingQuestion,
    wcIntent,
    wcContext,
    wcRequiredEntities = [],
    normalizedHistory = [],
    hasImage = false,
    matches = [],
    resolvedEventId = null,
    matchPlayerProps = null,
    loadMeta = null,
    fixtureTeams: fixtureTeamsInput = [],
  } = params;

  if (!shouldApplyWcPropsGrounding(wcIntent, structured)) return structured;

  if (wcContext?.wcGroundingPacket) {
    return applyWcGroundingCardToStructured(structured, wcContext.wcGroundingPacket, {
      question: String(question || routingQuestion || ""),
    });
  }

  const fixtureTeams =
    fixtureTeamsInput.length >= 2
      ? fixtureTeamsInput
      : resolveWcPlayerPropFixtureTeams(String(routingQuestion || question || ""), normalizedHistory, {
          requiredEntities: wcRequiredEntities,
          conversationHistory: normalizedHistory,
        });

  const eventId =
    String(resolvedEventId || wcContext?.wcEventId || structured?.wcEventId || "").trim() || null;
  const propsPayload =
    matchPlayerProps ||
    wcContext?.playerMarketKv?.matchPlayerProps ||
    null;
  const allMatches =
    matches.length > 0 ? matches : wcContext?.allMatches || [];

  const packet = buildWcGroundingPacketForUrTake({
    requestId,
    question,
    routingQuestion,
    history: normalizedHistory,
    matches: allMatches,
    fixtureTeams,
    resolvedEventId: eventId,
    matchPlayerProps: propsPayload,
    loadMeta: loadMeta || wcContext?.playerMarketKv?.loadMeta,
    hasImage,
  });

  return applyWcGroundingCardToStructured(structured, packet, {
    question: String(question || routingQuestion || ""),
  });
}
