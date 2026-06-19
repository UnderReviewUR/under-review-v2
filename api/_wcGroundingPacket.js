/**
 * WC player-props grounding packet builder (Phase 0).
 * Single writer per turn — not wired into handler until Phase 1+.
 */

import { wcMatchupTeamDisplayName } from "../shared/wcMatchupWinnerLine.js";
import {
  collapseMatchPlayerPropRowsForDisplay,
  WC_MATCH_PLAYER_PROP_MARKET_KEYS,
} from "../shared/wcMatchPlayerProps.js";
import { normalizeWcPlayerName } from "../shared/wcPlayerRegistry.js";
import {
  WC_GROUNDING_INVENTORY_LABELS,
  WC_GROUNDING_MARKET_LABELS,
} from "../shared/wcGroundingLabels.js";

/** @typedef {import("../shared/wcGroundingPacket.types.js").WcGroundingPacket} WcGroundingPacket */
/** @typedef {import("../shared/wcGroundingPacket.types.js").WcPropLeg} WcPropLeg */
/** @typedef {import("../shared/wcGroundingPacket.types.js").WcPropMarketKey} WcPropMarketKey */
/** @typedef {import("../shared/wcGroundingPacket.types.js").BuildWcGroundingPacketParams} BuildWcGroundingPacketParams */

export const WC_GROUNDING_PACKET_VERSION = "wc-grounding/v1";

/** Board priority when choosing primaryBoardMarket. */
export const WC_BOARD_MARKET_PRIORITY = [
  "player_shots_ou",
  "player_sot_ou",
  "player_goal_or_assist",
  "player_assists_ou",
  "anytime_scorer",
  "first_goalscorer",
  "last_goalscorer",
  "player_saves_ou",
  "player_shots_each_half",
  "player_sot_each_half",
  "player_tackles_ou",
  "player_card",
  "player_red_card",
];

const CLAUDE_GROUNDING_INSTRUCTIONS =
  "Cite only players, markets, lines, and American odds present in markets[].topLegs. " +
  "Prefer legId when citing a specific row. If blockers mention missing markets, say so explicitly — do not invent lines.";

/**
 * @param {string} name
 */
function normPlayerKey(name) {
  return normalizeWcPlayerName(String(name || "")).toLowerCase();
}

/**
 * @param {WcPropMarketKey} market
 * @param {Record<string, unknown>} row
 * @param {string} vendor
 */
function buildLegId(market, row, vendor) {
  const bdlId = row.bdlRowId ?? row.id;
  if (bdlId != null && String(bdlId).trim() !== "") {
    return `bdl:${bdlId}`;
  }
  const player = normPlayerKey(String(row.name || ""));
  const line = String(row.line ?? "").trim();
  const side = String(row.side ?? "over").trim().toLowerCase();
  return `${market}|${player}|${line}|${side}|${String(vendor || "unknown").toLowerCase()}`;
}

/**
 * @param {WcPropMarketKey} market
 * @param {Record<string, unknown>} row
 * @param {string} vendor
 * @param {string} americanOdds
 */
function rawRowToPropLeg(market, row, vendor, americanOdds) {
  const sideRaw = String(row.side ?? "").trim().toLowerCase();
  /** @type {import("../shared/wcGroundingPacket.types.js").WcPropLegSide | null} */
  let side = null;
  if (sideRaw === "over" || sideRaw === "under" || sideRaw === "yes") {
    side = sideRaw;
  } else if (!sideRaw || sideRaw === "yes") {
    side = market.includes("_ou") || market.includes("each_half") ? "over" : "yes";
  }

  const leg = {
    legId: buildLegId(market, row, vendor),
    playerId: row.playerId != null ? Number(row.playerId) : null,
    playerName: normalizeWcPlayerName(String(row.name || "")),
    nationAbbr: row.nationAbbr ? String(row.nationAbbr).toUpperCase().slice(0, 3) : null,
    market,
    line: row.line != null && String(row.line).trim() !== "" ? String(row.line) : null,
    side,
    americanOdds: String(americanOdds),
    decimalOdds:
      row.decimalOdds != null && Number.isFinite(Number(row.decimalOdds))
        ? Number(row.decimalOdds)
        : null,
    vendor: String(vendor || "unknown").toLowerCase(),
  };
  if (!leg.playerName || !leg.americanOdds) return null;
  return leg;
}

/**
 * Expand KV row (possibly multi-vendor bookOdds) into canonical legs.
 * @param {WcPropMarketKey} market
 * @param {Record<string, unknown>} row
 * @returns {WcPropLeg[]}
 */
export function expandRawRowToPropLegs(market, row) {
  if (!row || typeof row !== "object") return [];
  const bookOdds =
    row.bookOdds && typeof row.bookOdds === "object" ? row.bookOdds : null;
  /** @type {WcPropLeg[]} */
  const legs = [];

  if (bookOdds && Object.keys(bookOdds).length) {
    for (const [vendor, odds] of Object.entries(bookOdds)) {
      const leg = rawRowToPropLeg(market, row, vendor, String(odds));
      if (leg) legs.push(leg);
    }
    return legs;
  }

  const vendor = String(row.vendor || row.book || "balldontlie").toLowerCase();
  const leg = rawRowToPropLeg(market, row, vendor, String(row.americanOdds || ""));
  return leg ? [leg] : [];
}

/**
 * @param {Record<string, Array<Record<string, unknown>>>} rawMarkets
 */
export function buildFullLadderFromRawMarkets(rawMarkets) {
  /** @type {Record<string, WcPropLeg>} */
  const byKey = {};
  /** @type {Record<string, WcPropLeg[]>} */
  const byPlayerMarket = {};
  /** @type {Set<string>} */
  const uniquePlayers = new Set();

  for (const market of WC_MATCH_PLAYER_PROP_MARKET_KEYS) {
    const rows = Array.isArray(rawMarkets?.[market]) ? rawMarkets[market] : [];
    for (const row of rows) {
      for (const leg of expandRawRowToPropLegs(/** @type {WcPropMarketKey} */ (market), row)) {
        if (byKey[leg.legId]) continue;
        byKey[leg.legId] = leg;
        uniquePlayers.add(normPlayerKey(leg.playerName));
        const pmKey = `${normPlayerKey(leg.playerName)}|${leg.market}`;
        if (!byPlayerMarket[pmKey]) byPlayerMarket[pmKey] = [];
        byPlayerMarket[pmKey].push(leg);
      }
    }
  }

  const totalLegs = Object.keys(byKey).length;
  return {
    byKey,
    byPlayerMarket,
    totalLegs,
    uniquePlayers: uniquePlayers.size,
  };
}

/**
 * Collapse display rows and take top-N by shortest price.
 * @param {WcPropMarketKey} marketKey
 * @param {WcPropLeg[]} allLegs
 * @param {number} [maxLegs]
 */
export function collapseMarketsTopN(marketKey, allLegs, maxLegs = 5) {
  const rawRows = allLegs.map((leg) => ({
    name: leg.playerName,
    americanOdds: leg.americanOdds,
    line: leg.line,
    side: leg.side,
    nationAbbr: leg.nationAbbr,
    vendor: leg.vendor,
    legId: leg.legId,
  }));
  const collapsed = collapseMatchPlayerPropRowsForDisplay(rawRows, marketKey);
  return collapsed.slice(0, maxLegs).map((row, index) => {
    const vendor = String(row.vendor || "balldontlie").toLowerCase();
    const leg = rawRowToPropLeg(
      marketKey,
      row,
      vendor,
      String(row.americanOdds || ""),
    );
    if (!leg) return null;
    return { ...leg, displayRank: index + 1 };
  }).filter(Boolean);
}

/**
 * @param {WcPropLeg[]} legs
 * @param {string | null | undefined} homeAbbr
 * @param {string | null | undefined} awayAbbr
 * @param {number} perSide
 */
function splitTopLegsByNation(legs, homeAbbr, awayAbbr, perSide = 3) {
  const home = String(homeAbbr || "").toUpperCase();
  const away = String(awayAbbr || "").toUpperCase();
  /** @type {WcPropLeg[]} */
  const homeLegs = [];
  /** @type {WcPropLeg[]} */
  const awayLegs = [];
  for (const leg of legs) {
    const abbr = String(leg.nationAbbr || "").toUpperCase();
    if (home && abbr === home && homeLegs.length < perSide) homeLegs.push(leg);
    else if (away && abbr === away && awayLegs.length < perSide) awayLegs.push(leg);
  }
  return { home: homeLegs, away: awayLegs };
}

/**
 * @param {Record<string, WcPropLeg[]>} byPlayerMarket
 * @param {WcPropMarketKey} market
 */
function legsForMarket(byPlayerMarket, market) {
  /** @type {WcPropLeg[]} */
  const out = [];
  for (const legs of Object.values(byPlayerMarket)) {
    for (const leg of legs) {
      if (leg.market === market) out.push(leg);
    }
  }
  // Dedupe by legId
  const seen = new Set();
  return out.filter((leg) => {
    if (seen.has(leg.legId)) return false;
    seen.add(leg.legId);
    return true;
  });
}

/**
 * @param {import("../shared/wcGroundingPacket.types.js").WcMarketsSummary} marketsSummary
 * @param {import("../shared/wcGroundingPacket.types.js").WcPinnedFixture | null} pinnedFixture
 * @param {import("../shared/wcGroundingPacket.types.js").WcDataFreshness} dataFreshness
 * @param {import("../shared/wcGroundingPacket.types.js").WcNamedLegMatch[]} namedLegMatches
 */
function buildBlockers(marketsSummary, pinnedFixture, dataFreshness, namedLegMatches) {
  /** @type {import("../shared/wcGroundingPacket.types.js").WcGroundingBlocker[]} */
  const codes = [];
  /** @type {string[]} */
  const messages = [];

  if (!pinnedFixture) {
    codes.push("fixture_unpinned");
    messages.push("No fixture pinned for this ask yet.");
  } else if (pinnedFixture.alternateCandidates?.length) {
    codes.push("fixture_ambiguous");
    messages.push("Multiple fixtures matched — using the best live/upcoming pin.");
  }

  if (dataFreshness.isStale) {
    codes.push("data_stale");
    messages.push(`Prop lines are ${dataFreshness.ageSec}s old — refresh may be needed.`);
  }

  if (dataFreshness.source !== "balldontlie" && dataFreshness.source !== "mixed") {
    if (dataFreshness.source === "none") codes.push("props_fetch_failed");
    else codes.push("kv_only_no_bdl");
  }

  const totalPosted = marketsSummary.posted.reduce((n, m) => n + m.count, 0);
  if (totalPosted === 0) {
    codes.push("props_empty_all_markets");
    messages.push("No player prop markets are posted for this fixture yet.");
  }

  if (marketsSummary.empty.includes("anytime_scorer")) {
    codes.push("anytime_scorer_empty");
    messages.push("Anytime goal lines aren't posted for this match yet.");
  }

  const postedLabels = marketsSummary.posted.map(
    (m) => WC_GROUNDING_INVENTORY_LABELS[m.market] || m.label,
  );
  if (postedLabels.length && codes.includes("anytime_scorer_empty")) {
    messages.push(`${postedLabels.join(", ")} markets are live.`);
  }

  for (const match of namedLegMatches) {
    if (match.status === "missing_player") {
      codes.push("named_player_not_in_ladder");
      messages.push(`No posted line found for ${match.leg.playerHint}.`);
    } else if (match.status === "missing_market") {
      codes.push("named_market_empty");
    } else if (match.status === "missing_line") {
      codes.push("named_line_not_posted");
    }
  }

  const uniqueCodes = [...new Set(codes)];
  return { codes: uniqueCodes, messages: [...new Set(messages)] };
}

/**
 * @param {import("../shared/wcGroundingPacket.types.js").WcMarketsSummary} marketsSummary
 * @param {Record<string, WcPropLeg[]>} byPlayerMarket
 * @param {import("../shared/wcGroundingPacket.types.js").WcPinnedFixture | null} pinnedFixture
 * @param {number} topN
 */
function buildMarketsSummary(byPlayerMarket, pinnedFixture, topN = 5) {
  /** @type {import("../shared/wcGroundingPacket.types.js").WcMarketSummaryEntry[]} */
  const posted = [];
  /** @type {WcPropMarketKey[]} */
  const empty = [];

  for (const market of WC_MATCH_PLAYER_PROP_MARKET_KEYS) {
    const allLegs = legsForMarket(byPlayerMarket, /** @type {WcPropMarketKey} */ (market));
    if (!allLegs.length) {
      empty.push(/** @type {WcPropMarketKey} */ (market));
      continue;
    }
    const topLegs = collapseMarketsTopN(/** @type {WcPropMarketKey} */ (market), allLegs, topN);
    /** @type {import("../shared/wcGroundingPacket.types.js").WcMarketSummaryEntry} */
    const entry = {
      market: /** @type {WcPropMarketKey} */ (market),
      label: WC_GROUNDING_MARKET_LABELS[market] || market,
      count: allLegs.length,
      boardEligible: allLegs.length >= 2,
      topLegs,
    };
    if (pinnedFixture && topLegs.length) {
      entry.topByNation = splitTopLegsByNation(
        topLegs,
        pinnedFixture.home,
        pinnedFixture.away,
        3,
      );
    }
    posted.push(entry);
  }

  posted.sort((a, b) => {
    const ai = WC_BOARD_MARKET_PRIORITY.indexOf(a.market);
    const bi = WC_BOARD_MARKET_PRIORITY.indexOf(b.market);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const primaryBoardMarket =
    posted.find((m) => m.boardEligible)?.market ??
    (posted[0]?.market ?? null);

  return { posted, empty, primaryBoardMarket };
}

/**
 * @param {import("../shared/wcGroundingPacket.types.js").WcPropAskContext} ask
 * @param {import("../shared/wcGroundingPacket.types.js").WcPinnedFixture | null} pinnedFixture
 * @param {import("../shared/wcGroundingPacket.types.js").WcDataFreshness} dataFreshness
 * @param {import("../shared/wcGroundingPacket.types.js").WcMarketsSummary} marketsSummary
 * @param {import("../shared/wcGroundingPacket.types.js").WcGroundingBlockers} blockers
 * @param {import("../shared/wcGroundingPacket.types.js").WcNamedLegMatch[]} namedLegMatches
 */
function buildClaudeView(ask, pinnedFixture, dataFreshness, marketsSummary, blockers, namedLegMatches) {
  /** @type {import("../shared/wcGroundingPacket.types.js").WcGroundingClaudeView} */
  return {
    askShape: ask.shape,
    question: ask.question,
    pinned: pinnedFixture
      ? {
          fixture: `${pinnedFixture.homeDisplay} vs ${pinnedFixture.awayDisplay} (${pinnedFixture.home}–${pinnedFixture.away})`,
          eventId: pinnedFixture.eventId,
          status: [
            pinnedFixture.status === "live" ? "live" : pinnedFixture.status,
            pinnedFixture.clockDisplay,
          ]
            .filter(Boolean)
            .join(", "),
          kickoff: pinnedFixture.kickoffUtc,
        }
      : null,
    freshness: {
      source: dataFreshness.source,
      ageSec: dataFreshness.ageSec,
      inPlay: dataFreshness.inPlay,
      refreshedThisTurn:
        dataFreshness.refresh.attempted && dataFreshness.refresh.succeeded,
    },
    markets: marketsSummary.posted.map((entry) => ({
      market: entry.market,
      label: entry.label,
      count: entry.count,
      topLegs: entry.topLegs.map((leg) => ({
        player: leg.playerName,
        nation: leg.nationAbbr,
        line: leg.line,
        side: leg.side,
        odds: leg.americanOdds,
        vendor: leg.vendor,
        legId: leg.legId,
      })),
    })),
    blockers: blockers.messages,
    namedLegMatches: namedLegMatches.map((m) => ({
      ask: `${m.leg.playerHint} ${m.leg.marketLabel}`,
      status: m.status,
      matchedLegId: m.matched?.legId ?? null,
      note: m.fallbackNote,
    })),
    instructions: CLAUDE_GROUNDING_INSTRUCTIONS,
  };
}

/**
 * @param {import("../shared/wcGroundingPacket.types.js").WcPinnedFixture | null} pinnedFixture
 * @param {import("../shared/wcGroundingPacket.types.js").WcDataFreshness} dataFreshness
 * @param {import("../shared/wcGroundingPacket.types.js").WcMarketsSummary} marketsSummary
 * @param {import("../shared/wcGroundingPacket.types.js").WcGroundingBlockers} blockers
 */
function buildCardView(pinnedFixture, dataFreshness, marketsSummary, blockers) {
  const posted = marketsSummary.posted.map(
    (m) => WC_GROUNDING_INVENTORY_LABELS[m.market] || m.label,
  );
  const notPosted = marketsSummary.empty.map(
    (m) => WC_GROUNDING_INVENTORY_LABELS[m] || WC_GROUNDING_MARKET_LABELS[m] || m,
  );

  const primary = marketsSummary.posted[0];
  /** @type {import("../shared/wcGroundingPacket.types.js").WcGroundingCardView["structuredSeed"]["propBoardRows"]} */
  const propBoardRows = primary
    ? primary.topLegs.slice(0, 6).map((leg) => ({
        label: leg.playerName,
        lean:
          leg.line && leg.market.includes("_ou")
            ? `${leg.playerName} over ${leg.line} ${WC_GROUNDING_MARKET_LABELS[leg.market]} ${leg.americanOdds}`
            : `${leg.playerName} ${WC_GROUNDING_MARKET_LABELS[leg.market]} ${leg.americanOdds}`,
        market: leg.market,
        odds: leg.americanOdds,
        legId: leg.legId,
      }))
    : undefined;

  return {
    pinBanner: pinnedFixture
      ? {
          headline: `${pinnedFixture.homeDisplay} vs ${pinnedFixture.awayDisplay}`,
          subline: [
            pinnedFixture.status === "live" ? "Live" : pinnedFixture.status,
            pinnedFixture.clockDisplay,
          ]
            .filter(Boolean)
            .join(" · "),
          eventId: pinnedFixture.eventId,
          homeAbbr: pinnedFixture.home,
          awayAbbr: pinnedFixture.away,
          status: pinnedFixture.status,
        }
      : null,
    inventoryStrip: {
      posted,
      notPosted,
      freshnessLabel:
        dataFreshness.source === "balldontlie"
          ? `Updated ${dataFreshness.ageSec}s ago`
          : `Updated ${dataFreshness.ageSec}s ago`,
    },
    blockers: blockers.messages,
    structuredSeed: {
      sport: "worldcup",
      wcEventId: pinnedFixture?.eventId,
      fixtureHome: pinnedFixture?.home,
      fixtureAway: pinnedFixture?.away,
      groundingVisible: true,
      propBoardRows,
    },
  };
}

/**
 * @param {import("../shared/wcGroundingPacket.types.js").WcFullLadder} fullLadder
 */
function buildValidationView(fullLadder) {
  /** @type {Record<string, WcPropLeg[]>} */
  const playerIndex = {};
  for (const leg of Object.values(fullLadder.byKey)) {
    const key = normPlayerKey(leg.playerName);
    if (!playerIndex[key]) playerIndex[key] = [];
    playerIndex[key].push(leg);
  }
  return {
    ladder: fullLadder,
    allowedLegIds: new Set(Object.keys(fullLadder.byKey)),
    playerIndex,
  };
}

/**
 * Normalize partial freshness input into a full WcDataFreshness object.
 * @param {Partial<import("../shared/wcGroundingPacket.types.js").WcDataFreshness> & Pick<import("../shared/wcGroundingPacket.types.js").WcDataFreshness, "source">} input
 */
function normalizeDataFreshness(input) {
  const ageMs = Number.isFinite(Number(input.ageMs)) ? Number(input.ageMs) : 0;
  const ageSec = Number.isFinite(Number(input.ageSec))
    ? Number(input.ageSec)
    : Math.round(ageMs / 1000);
  const inPlay = Boolean(input.inPlay);
  const staleAfterSec =
    Number.isFinite(Number(input.staleAfterSec)) ? Number(input.staleAfterSec) : inPlay ? 90 : 300;
  const isStale =
    typeof input.isStale === "boolean" ? input.isStale : ageSec >= staleAfterSec;

  return {
    source: input.source,
    ageMs,
    ageSec,
    fetchedAt: input.fetchedAt || new Date().toISOString(),
    inPlay,
    refresh: {
      attempted: Boolean(input.refresh?.attempted),
      succeeded: Boolean(input.refresh?.succeeded),
      reason: input.refresh?.reason || "fresh_enough",
      durationMs:
        input.refresh?.durationMs != null ? Number(input.refresh.durationMs) : null,
    },
    isStale,
    staleAfterSec,
  };
}

/**
 * Build a complete grounding packet with Claude, card, and validation views.
 * @param {BuildWcGroundingPacketParams} params
 * @returns {WcGroundingPacket}
 */
export function buildWcGroundingPacket(params) {
  const {
    requestId,
    askContext,
    pinnedFixture,
    rawBdlPlayerProps,
    dataFreshness: dataFreshnessInput,
    namedLegMatches = [],
  } = params;

  const dataFreshness = normalizeDataFreshness(dataFreshnessInput);
  const fullLadder = buildFullLadderFromRawMarkets(rawBdlPlayerProps || {});
  const marketsSummary = buildMarketsSummary(fullLadder.byPlayerMarket, pinnedFixture, 5);
  const blockers = buildBlockers(
    marketsSummary,
    pinnedFixture,
    dataFreshness,
    namedLegMatches,
  );

  const views = {
    claude: buildClaudeView(
      askContext,
      pinnedFixture,
      dataFreshness,
      marketsSummary,
      blockers,
      namedLegMatches,
    ),
    card: buildCardView(pinnedFixture, dataFreshness, marketsSummary, blockers),
    validation: buildValidationView(fullLadder),
  };

  return {
    version: WC_GROUNDING_PACKET_VERSION,
    requestId: String(requestId || ""),
    builtAt: new Date().toISOString(),
    ask: askContext,
    pinnedFixture,
    dataFreshness,
    marketsSummary,
    fullLadder,
    blockers,
    namedLegMatches,
    views,
  };
}

/**
 * Helper to build a WcPinnedFixture from minimal match metadata.
 * @param {object} match
 */
export function buildPinnedFixtureFromMatch(match) {
  if (!match) return null;
  const home = String(match.home || match.homeTeam || "").toUpperCase();
  const away = String(match.away || match.awayTeam || "").toUpperCase();
  if (!home || !away) return null;
  return {
    eventId: String(match.eventId || match.id || ""),
    bdlMatchId: match.bdlMatchId != null ? Number(match.bdlMatchId) : null,
    home,
    away,
    homeDisplay: wcMatchupTeamDisplayName(home),
    awayDisplay: wcMatchupTeamDisplayName(away),
    status: /** @type {import("../shared/wcGroundingPacket.types.js").WcMatchStatus} */ (
      String(match.status || "UNKNOWN").toLowerCase() === "live" ? "live" : match.status || "UNKNOWN"
    ),
    kickoffUtc: match.kickoffUtc || match.commenceTs ? new Date(Number(match.commenceTs)).toISOString() : null,
    slateDateEt: match.date || null,
    clockDisplay: match.clockDisplay || null,
    pinMethod: /** @type {import("../shared/wcGroundingPacket.types.js").WcFixturePinMethod} */ (
      match.pinMethod || "two_teams_in_question"
    ),
    alternateCandidates: match.alternateCandidates,
  };
}
