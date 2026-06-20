/**
 * World Cup player-market tier resolver + answer contract (Phase B).
 */

import { WC_GOLDEN_BOOT_SEED_ROWS } from "../src/data/wc2026GoldenBootSeed.js";
import { WC_FULL_SQUADS } from "../src/data/wc2026FullSquadsSeed.js";
import { getSetPieceTakersForNation } from "../src/data/wc2026SetPieceTakers.js";
import { sortGoldenBootRows } from "./wcPlayerOddsFreshness.js";
import { goldenBootRowsFromKv } from "./wcPlayerOddsFreshness.js";
import {
  collapseMatchPlayerPropRowsForDisplay,
  formatFixturePropBoardRowLabel,
  hasMatchPlayerPropRows,
  isMatchPlayerPropsFresh,
  kvHasFreshMatchPlayerProps,
  matchPlayerPropNationMatchesTeam,
  matchPlayerPropRowsFromEvent,
  pickFixturePropBoardFromEvent,
  rankFixturePropBoardRows,
  resolveMatchPlayerPropsPayload,
} from "./wcMatchPlayerProps.js";
import {
  extractMentionedWcTeams,
  extractMentionedWcTeamsInQuestionOrder,
} from "./wcUrTakeKeywords.js";
import {
  calculateParlayOdds,
  formatParlayAmericanOdds,
  parseAmericanOddsValue,
} from "../src/lib/calculateParlayOdds.js";
import { sortPropBoardRowsForMixedLean } from "./wcUrTakePlayerMarket.js";
import { resolveWcPlayerPropFixtureTeams } from "./wcPlayerPropFixture.js";
import { wcMatchupTeamDisplayName } from "./wcMatchupWinnerLine.js";
import {
  countRegistryPlayers,
  normalizeWcPlayerName,
  topRegistryScorers,
} from "./wcPlayerRegistry.js";
import {
  formatWcPlayerMarketPassLabel,
  wcContextHasVerifiedScorerGrounding,
  buildWcPlayerPropPassHeadline,
  isGenericWcPlayerPropQuestion,
  isWcFixturePlayerPropsQuestion,
  isWcGoalkeeperPropsQuestion,
  isWcPerTeamPlayerPropsQuestion,
  extractWcPerTeamPlayerPropCount,
  prefersWcFixtureScorerIntelFallback,
  repairWcPlayerPropPassCard,
  finalizeWcPlayerPropStructured,
  isWcFixtureScopedPlayerMarketQuestion,
  isWcNamedPlayerPropQuestion,
  extractWcNamedPlayerPropLegsFromQuestion,
  formatWcNamedPlayerPropLegAnswer,
  buildWcNamedPlayerPropNoLineHeadline,
  buildWcNamedPlayerPropDataPresentNoMatchHeadline,
  buildWcNamedPlayerPropNoLineWhyNow,
  buildWcNamedPlayerPropNoLineEdge,
} from "./wcUrTakePlayerMarket.js";
import {
  findWcNamedPlayerPropLegMatch,
  resolveWcEventIdForPlayerNation,
  resolveWcPlayerNationFromQuestion,
  WC_NAMED_PROP_MARKET_DISPLAY,
} from "./wcPlayerPropFixture.js";
import { lookupStarterGoalkeeper } from "./wcGoldenGloveAdjusted.js";
import { WC_INTENT, isWcFixturePlayerMarketIntent } from "./wcUrTakeIntent.js";
import { detectParlayIntent, extractParlayLegCount } from "./detectParlayIntent.js";
import { WC_CARD_TYPE } from "./wcThreadState.js";
import { WC_GROUNDING_MARKET_LABELS } from "./wcGroundingLabels.js";

/** @typedef {"verified" | "market_only" | "squad" | "thin"} WcPlayerMarketTier */

export const WC_PLAYER_MARKET_TIER = {
  VERIFIED: "verified",
  MARKET_ONLY: "market_only",
  SQUAD: "squad",
  THIN: "thin",
};

const TIER_META = {
  verified: {
    label: "Market Odds · Verified",
    disclaimer:
      "Confirmed XI + priced player rows in VERIFIED CONTEXT — cite named player and American odds in sentence one.",
    callType: "player_market_verified",
  },
  market_only: {
    label: "Market Odds",
    disclaimer:
      "Golden Boot / top scorer consensus odds in VERIFIED CONTEXT — cite named players and listed prices; note if lineups are not confirmed.",
    callType: "player_market_odds",
  },
  squad: {
    label: "Squad & Form",
    disclaimer:
      "Use named players from SQUAD / FORM and injuries — rank by goals and role; do not substitute a nation as the player pick.",
    callType: "player_market_squad",
  },
  thin: {
    label: "Early Contenders",
    disclaimer:
      "Lineups may not be confirmed — lead with early contenders from PLAYER MARKETS context; still name players, never only a country.",
    callType: "player_market_thin",
  },
};

/**
 * @param {object | null | undefined} goldenBoot
 */
function goldenBootRowCount(goldenBoot) {
  return goldenBootRowsFromKv(goldenBoot, 40).length;
}

/**
 * @param {object | null | undefined} kvBlocks
 */
export function extractKnownPlayerNamesFromKv(kvBlocks) {
  /** @type {Set<string>} */
  const names = new Set();
  for (const r of goldenBootRowsFromKv(kvBlocks?.goldenBoot, 40)) {
    if (r?.name) names.add(normalizeWcPlayerName(r.name));
  }
  for (const row of WC_GOLDEN_BOOT_SEED_ROWS) {
    if (row?.name) names.add(normalizeWcPlayerName(row.name));
  }
  const teams = kvBlocks?.players?.teams || {};
  for (const t of Object.values(teams)) {
    for (const p of t?.players || []) {
      if (p?.name) names.add(normalizeWcPlayerName(p.name));
    }
  }
  const eventProps = kvBlocks?.matchPlayerProps;
  for (const r of matchPlayerPropRowsFromEvent(eventProps, "anytime_scorer", 30)) {
    if (r?.name) names.add(normalizeWcPlayerName(r.name));
  }
  for (const r of matchPlayerPropRowsFromEvent(eventProps, "first_goalscorer", 15)) {
    if (r?.name) names.add(normalizeWcPlayerName(r.name));
  }
  return [...names].filter(Boolean);
}

/**
 * @param {string} headline
 * @param {string} body
 * @param {string[]} knownNames
 */
export function responseMentionsKnownPlayer(headline, body, knownNames) {
  const blob = `${headline} ${body}`.toLowerCase();
  for (const name of knownNames) {
    const parts = normalizeWcPlayerName(name).toLowerCase().split(/\s+/).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && last.length >= 3 && blob.includes(last)) return true;
    if (parts.length >= 2 && blob.includes(parts.join(" "))) return true;
  }
  return false;
}

/**
 * @param {object} opts
 */
export function resolveWcPlayerMarketTier(opts = {}) {
  const goldenBoot = opts.goldenBoot;
  const players = opts.players;
  const wcContext = opts.wcContext;
  const wcIntent = String(opts.wcIntent || "");
  const wcEventId = String(opts.wcEventId || "").trim();
  const matchPlayerProps = opts.matchPlayerProps;
  const gbCount = goldenBootRowCount(goldenBoot);
  const gbFresh = Boolean(goldenBoot && !goldenBoot.stale && gbCount >= 5);
  const lineupConfirmed = wcContextHasVerifiedScorerGrounding(wcContext);
  const matchPropsFresh = wcEventId && isMatchPlayerPropsFresh(matchPlayerProps);
  const topScorers = topRegistryScorers(players, 8);
  const hasGoalLeaders = topScorers.some((p) => (Number(p.goalsTournament) || 0) > 0);
  const { playerCount } = countRegistryPlayers(players || {});

  if (
    isWcFixturePlayerMarketIntent(wcIntent) &&
    wcEventId &&
    matchPropsFresh &&
    (lineupConfirmed || gbCount >= 3)
  ) {
    return WC_PLAYER_MARKET_TIER.VERIFIED;
  }

  if (
    isWcFixturePlayerMarketIntent(wcIntent) &&
    lineupConfirmed &&
    (gbFresh || gbCount >= 3)
  ) {
    return WC_PLAYER_MARKET_TIER.VERIFIED;
  }

  if (gbCount >= 8 && gbFresh && lineupConfirmed) {
    return WC_PLAYER_MARKET_TIER.VERIFIED;
  }

  if (gbCount >= 5) {
    return lineupConfirmed && gbFresh
      ? WC_PLAYER_MARKET_TIER.VERIFIED
      : WC_PLAYER_MARKET_TIER.MARKET_ONLY;
  }

  if (gbCount >= 3) {
    return WC_PLAYER_MARKET_TIER.MARKET_ONLY;
  }

  if (hasGoalLeaders || playerCount >= 20) {
    return WC_PLAYER_MARKET_TIER.SQUAD;
  }

  if (gbCount > 0 || playerCount >= 10) {
    return WC_PLAYER_MARKET_TIER.THIN;
  }

  return WC_PLAYER_MARKET_TIER.THIN;
}

/**
 * @param {string} tier
 */
export function tierMetaFor(tier) {
  return TIER_META[tier] || TIER_META.thin;
}

/**
 * Prebuilt thin-tier answer when KV has zero resolvable names (rare).
 * @param {string} question
 * @param {string} wcIntent
 */
export function buildWcPlayerMarketEmptyStructured(question, wcIntent) {
  const label = formatWcPlayerMarketPassLabel(wcIntent);
  return {
    sport: "worldcup",
    callType: "player_market_thin",
    playerMarketTier: WC_PLAYER_MARKET_TIER.THIN,
    call: `Early contenders — ${label}`,
    lean: `Player markets (${label}): no named player rows in the feed yet — check back after squads and book lines populate.`,
    whyNow:
      "Re-ask once Golden Boot odds and match intel refresh. For now, use team-level tournament angles only as secondary context.",
    edge: "No priced player edge until KV fills.",
    confidence: "Speculative",
    analysis: String(question || "").trim(),
  };
}

/**
 * Pass card when a player parlay was requested but no verified prop rows exist yet.
 * @param {string} question
 * @param {number | null} [legCount]
 */
export function buildWcPlayerParlayPassStructured(question, legCount = null) {
  const n = legCount ?? extractParlayLegCount(question);
  const ticketLabel = n ? `${n}-leg player parlay` : "player parlay";
  return {
    sport: "worldcup",
    callType: "parlay",
    playerMarketTier: WC_PLAYER_MARKET_TIER.THIN,
    call: `Pass on ${ticketLabel} until match player props post.`,
    lean: `Pass — no verified player lines to build ${n ? `a ${n}-leg` : "a multi-leg"} ticket yet; see Watch For before locking a bet.`,
    whyNow:
      "World Cup player props need confirmed XI and listed anytime scorer / shots / assist prices in VERIFIED CONTEXT — re-ask closer to kickoff when MATCH PLAYER PROPS populate.",
    edge: "Cleaner path: single anytime scorer once lines drop.",
    confidence: "Speculative",
    analysis: String(question || "").trim(),
  };
}

/**
 * Optional deterministic answer for thin/market_only when we want guaranteed names (smoke/dev).
 * @param {string} question
 * @param {string} wcIntent
 * @param {WcPlayerMarketTier} tier
 * @param {object | null | undefined} goldenBoot
 */
/**
 * Deterministic top-N goalscorer list from Golden Boot board.
 * @param {string} question
 * @param {string} wcIntent
 * @param {WcPlayerMarketTier} tier
 * @param {object | null | undefined} goldenBoot
 * @param {{ listSize?: number }} [opts]
 */
export function buildWcTopGoalscorersListStructured(
  question,
  wcIntent,
  tier,
  goldenBoot,
  opts = {},
) {
  const listSize = Math.max(3, Math.min(8, Number(opts.listSize) || 5));
  let rows = goldenBootRowsFromKv(goldenBoot, 40);
  if (rows.length < listSize) {
    rows = sortGoldenBootRows(WC_GOLDEN_BOOT_SEED_ROWS, listSize);
  }
  rows = rows.slice(0, listSize);
  if (rows.length < listSize) return null;

  const meta = tierMetaFor(tier);
  const numbered = rows
    .slice(0, listSize)
    .map((r, i) => `${i + 1}. ${r.name} ${r.americanOdds}`)
    .join("\n");
  const lead = rows
    .slice(0, listSize)
    .map((r) => `${r.name} ${r.americanOdds}`)
    .join(" · ");

  return {
    sport: "worldcup",
    callType: "goalscorers_list",
    playerMarketTier: tier,
    call: `Top ${listSize} goalscorers by market`,
    lean: numbered,
    whyNow: `Golden Boot board (${meta.label}): ${lead}.`,
    edge: rows.length >= 2 ? `Gap behind ${rows[1].name} at ${rows[1].americanOdds}.` : "",
    confidence: tier === WC_PLAYER_MARKET_TIER.VERIFIED ? "Medium" : "Speculative",
    analysis: String(question || "").trim(),
  };
}

/**
 * Fixture scorer intel when posted anytime lines are missing — PK takers + Golden Boot board.
 * @param {string} question
 * @param {WcPlayerMarketTier} tier
 * @param {object | null | undefined} kvBlocks
 * @param {object | null | undefined} wcContext
 */
export function buildWcFixtureScorerIntelStructured(question, tier, kvBlocks, wcContext) {
  const fixtureMatches = Array.isArray(wcContext?.allMatches) ? wcContext.allMatches : [];
  const teams = resolveWcPlayerPropFixtureTeams(
    String(question || ""),
    wcContext?.conversationHistory || [],
    wcContext,
    fixtureMatches,
  );
  if (teams.length < 2) return null;

  const home = String(teams[0] || "").toUpperCase();
  const away = String(teams[1] || "").toUpperCase();
  let gbRows = goldenBootRowsFromKv(kvBlocks?.goldenBoot, 40);
  if (gbRows.length < 2) {
    gbRows = sortGoldenBootRows(WC_GOLDEN_BOOT_SEED_ROWS, 12);
  }

  /** @type {Array<{ name: string, nationAbbr: string, americanOdds?: string, note: string }>} */
  const picks = [];

  for (const abbr of [home, away]) {
    const setPieces = getSetPieceTakersForNation(abbr);
    const nationRows = gbRows.filter((r) => String(r.nationAbbr || "").toUpperCase() === abbr);
    const pkName = setPieces?.penaltyTaker?.trim();
    const gbLead = nationRows[0];
    const primaryName = pkName || gbLead?.name;
    if (!primaryName) continue;
    const odds =
      (pkName && nationRows.find((r) => r.name === pkName)?.americanOdds) ||
      gbLead?.americanOdds ||
      "";
    const note = pkName ? "PK taker" : "Golden Boot board";
    picks.push({
      name: primaryName,
      nationAbbr: abbr,
      americanOdds: odds,
      note,
    });
    const alt = nationRows.find((r) => r.name !== primaryName);
    if (alt) {
      picks.push({
        name: alt.name,
        nationAbbr: abbr,
        americanOdds: alt.americanOdds,
        note: "scoring threat",
      });
    }
  }

  if (picks.length < 2) return null;

  const numbered = picks
    .slice(0, 5)
    .map((r, i) => {
      const oddsBit =
        r.americanOdds && r.note !== "PK taker" ? ` ${r.americanOdds}` : "";
      return `${i + 1}. ${r.name} (${r.nationAbbr})${oddsBit} — ${r.note}`;
    })
    .join("\n");
  const lead = picks[0];
  const meta = tierMetaFor(tier);

  return finalizeWcPlayerPropStructured(
    {
      sport: "worldcup",
      callType: meta.callType,
      playerMarketTier: tier,
      fixtureHome: home,
      fixtureAway: away,
      call: `${lead.name} — top scoring path (${wcMatchupTeamDisplayName(home)} vs ${wcMatchupTeamDisplayName(away)})`,
      lean: numbered,
      whyNow: `Match anytime scorer board not in feed yet — UR ranks ${lead.name} first on PK duty and tournament scoring role until prices post.`,
      edge:
        lead.americanOdds && picks[1]
          ? `Alt: ${picks[1].name} ${picks[1].americanOdds || ""}`.trim()
          : "Re-check when match lines post for priced anytime legs.",
      confidence: tier === WC_PLAYER_MARKET_TIER.VERIFIED ? "Medium" : "Speculative",
      analysis: String(question || "").trim(),
    },
    question,
  );
}

/**
 * @param {{ name?: string, line?: string, side?: string, americanOdds?: string }} row
 */
function formatWcGoalkeeperSavesLeanLine(row) {
  const name = String(row?.name || "").trim();
  const odds = String(row?.americanOdds || "").trim();
  const line = String(row?.line || "").trim();
  if (line) return `${name} over ${line} saves ${odds}`;
  return `${name} saves ${odds}`;
}

/**
 * @param {{ name?: string, nationAbbr?: string }} row
 * @param {Record<string, string>} gkByTeam
 */
function matchPlayerPropRowToFixtureGoalkeeper(row, gkByTeam) {
  const abbr = String(row?.nationAbbr || "").toUpperCase();
  const expected = gkByTeam[abbr];
  if (!expected) return false;
  const name = normalizeWcPlayerName(String(row?.name || ""));
  if (!name) return false;
  if (name === expected) return true;
  const expectedLast = expected.split(/\s+/).pop()?.toLowerCase();
  const rowLast = name.split(/\s+/).pop()?.toLowerCase();
  return Boolean(expectedLast && rowLast && expectedLast === rowLast);
}

/**
 * @param {object | null | undefined} kvBlocks
 * @param {object | null | undefined} wcContext
 */
function resolveWcPlayerRegistryTeams(kvBlocks, wcContext) {
  const fromKv =
    kvBlocks?.players?.teams ||
    wcContext?.playerMarketKv?.players?.teams ||
    wcContext?.playerRegistry;
  if (fromKv && Object.keys(fromKv).length) return fromKv;

  /** @type {Record<string, { players: Array<Record<string, unknown>> }>} */
  const teams = {};
  for (const [abbr, team] of Object.entries(WC_FULL_SQUADS.teams || {})) {
    teams[abbr] = {
      players: (team.roster || []).map((p) => ({
        name: p.name || p.nameOnShirt,
        position: p.position,
        isStarterLikely: p.isStarterLikely,
      })),
    };
  }
  return teams;
}

/**
 * Deterministic goalkeeper-prop card — saves O/U when posted, else starter GK names from registry.
 * @param {string} question
 * @param {WcPlayerMarketTier} tier
 * @param {object | null | undefined} kvBlocks
 * @param {object | null | undefined} wcContext
 */
export function buildWcFixtureGoalkeeperPropsStructured(question, tier, kvBlocks, wcContext) {
  const teams = resolveWcPlayerPropFixtureTeams(
    String(question || ""),
    wcContext?.conversationHistory || [],
    wcContext,
  );
  if (teams.length < 2) return null;

  const kvRoot = kvBlocks?.matchPlayerProps;
  const registryTeams = resolveWcPlayerRegistryTeams(kvBlocks, wcContext);
  const registry = { teams: registryTeams };

  /** @type {Record<string, string>} */
  const gkByTeam = {};
  for (const abbr of teams) {
    const gk = lookupStarterGoalkeeper(registry, abbr);
    if (gk?.name) {
      gkByTeam[String(abbr).toUpperCase()] = normalizeWcPlayerName(String(gk.name));
    }
  }

  const homeAbbr = String(teams[0] || "").toUpperCase();
  const awayAbbr = String(teams[1] || "").toUpperCase();
  const homeLabel = wcMatchupTeamDisplayName(homeAbbr);
  const awayLabel = wcMatchupTeamDisplayName(awayAbbr);
  const meta = tierMetaFor(tier);

  if (!kvRoot) {
    if (!Object.keys(gkByTeam).length) return null;
    const lean = teams
      .map((abbr) => {
        const label = wcMatchupTeamDisplayName(abbr);
        const gkName = gkByTeam[String(abbr).toUpperCase()];
        return gkName
          ? `${label} (${String(abbr).toUpperCase()}): ${gkName} — starter GK`
          : `${label} (${String(abbr).toUpperCase()}): starter GK TBD`;
      })
      .join("\n");
    return {
      sport: "worldcup",
      callType: meta.callType,
      playerMarketTier: tier,
      fixtureHome: homeAbbr,
      fixtureAway: awayAbbr,
      call: "Pass — no posted goalkeeper prop lines",
      lean,
      whyNow: `No verified goalkeeper saves lines in the feed for ${homeLabel} vs ${awayLabel} — projected starters from squad registry.`,
      edge: "Watch for saves O/U to post closer to kickoff.",
      confidence: "Speculative",
      analysis: String(question || "").trim(),
    };
  }

  const resolved = resolveMatchPlayerPropsPayload(kvRoot, {
    eventId: String(kvBlocks?.wcEventId || wcContext?.wcEventId || "").trim(),
    teams,
  });
  if (!resolved) {
    if (!Object.keys(gkByTeam).length) return null;
    const lean = teams
      .map((abbr) => {
        const label = wcMatchupTeamDisplayName(abbr);
        const gkName = gkByTeam[String(abbr).toUpperCase()];
        return `${label} (${String(abbr).toUpperCase()}): ${gkName} — starter GK`;
      })
      .join("\n");
    return {
      sport: "worldcup",
      callType: meta.callType,
      playerMarketTier: tier,
      fixtureHome: homeAbbr,
      fixtureAway: awayAbbr,
      call: "Pass — no posted goalkeeper prop lines",
      lean,
      whyNow: `No verified goalkeeper saves lines in the feed for ${homeLabel} vs ${awayLabel} — projected starters from squad registry.`,
      edge: "Watch for saves O/U to post closer to kickoff.",
      confidence: "Speculative",
      analysis: String(question || "").trim(),
    };
  }

  const eventId = resolved.eventId;
  const eventPayload = resolved.payload;
  const teamSet = new Set(teams.map((t) => String(t).toUpperCase()));
  const rawRows = matchPlayerPropRowsFromEvent(eventPayload, "player_saves_ou", 24);
  const rows = collapseMatchPlayerPropRowsForDisplay(rawRows, "player_saves_ou");
  let gkRows = rows.filter((r) => teamSet.has(String(r.nationAbbr || "").toUpperCase()));
  if (Object.keys(gkByTeam).length) {
    const filtered = gkRows.filter((r) => matchPlayerPropRowToFixtureGoalkeeper(r, gkByTeam));
    if (filtered.length) gkRows = filtered;
  }

  if (gkRows.length >= 1 && eventPayload && isMatchPlayerPropsFresh(eventPayload)) {
    const numbered = gkRows
      .slice(0, 4)
      .map((r, i) => `${i + 1}. ${formatWcGoalkeeperSavesLeanLine(r)}`)
      .join("\n");
    const lead = gkRows[0];
    return {
      sport: "worldcup",
      callType: meta.callType,
      playerMarketTier: tier,
      wcEventId: eventId || undefined,
      fixtureHome: String(eventPayload?.homeTeam || homeAbbr).toUpperCase(),
      fixtureAway: String(eventPayload?.awayTeam || awayAbbr).toUpperCase(),
      call: formatWcGoalkeeperSavesLeanLine(lead),
      lean: numbered,
      whyNow: `Posted goalkeeper saves lines for ${homeLabel} vs ${awayLabel}.`,
      edge:
        gkRows.length >= 2
          ? `Alt: ${formatWcGoalkeeperSavesLeanLine(gkRows[1])}.`
          : "Check opponent shot volume before sizing saves overs.",
      confidence: tier === WC_PLAYER_MARKET_TIER.VERIFIED ? "Medium" : "Speculative",
      analysis: String(question || "").trim(),
    };
  }

  if (!Object.keys(gkByTeam).length) return null;

  const lean = teams
    .map((abbr) => {
      const label = wcMatchupTeamDisplayName(abbr);
      const gkName = gkByTeam[String(abbr).toUpperCase()];
      return gkName
        ? `${label} (${String(abbr).toUpperCase()}): ${gkName} — starter GK`
        : `${label} (${String(abbr).toUpperCase()}): starter GK TBD`;
    })
    .join("\n");

  return {
    sport: "worldcup",
    callType: meta.callType,
    playerMarketTier: tier,
    wcEventId: eventId || undefined,
    fixtureHome: String(eventPayload?.homeTeam || homeAbbr).toUpperCase(),
    fixtureAway: String(eventPayload?.awayTeam || awayAbbr).toUpperCase(),
    call: "Pass — no posted goalkeeper prop lines",
    lean,
    whyNow: `No verified goalkeeper saves lines in the feed for ${homeLabel} vs ${awayLabel} — projected starters from squad registry.`,
    edge: "Watch for saves O/U to post closer to kickoff.",
    confidence: "Speculative",
    analysis: String(question || "").trim(),
  };
}

/**
 * Deterministic numbered fixture player-prop card from MATCH PLAYER PROPS KV.
 * @param {string} question
 * @param {WcPlayerMarketTier} tier
 * @param {object | null | undefined} kvBlocks
 * @param {object | null | undefined} wcContext
 */
export function buildWcFixturePlayerPropsListStructured(question, tier, kvBlocks, wcContext) {
  if (isWcGoalkeeperPropsQuestion(question)) {
    return buildWcFixtureGoalkeeperPropsStructured(question, tier, kvBlocks, wcContext);
  }
  const teams = resolveWcPlayerPropFixtureTeams(
    String(question || ""),
    wcContext?.conversationHistory || [],
    wcContext,
  );
  if (teams.length < 2) return null;

  const kvRoot = kvBlocks?.matchPlayerProps;
  if (!kvRoot) return null;

  const resolved = resolveMatchPlayerPropsPayload(kvRoot, {
    eventId: String(kvBlocks?.wcEventId || wcContext?.wcEventId || "").trim(),
    teams,
  });
  if (!resolved) return null;
  const eventId = resolved.eventId;
  const eventPayload = resolved.payload;

  const propBoard = pickFixturePropBoardFromEvent(eventPayload, 24);
  if (!propBoard) return null;
  const { key: marketKey, label: marketLabel, rows } = propBoard;

  const perTeamAsk = isWcPerTeamPlayerPropsQuestion(question);
  const pluralPropsAsk =
    isGenericWcPlayerPropQuestion(question) ||
    isWcFixturePlayerPropsQuestion(question) ||
    perTeamAsk ||
    /\bwhat about player props?\b/i.test(String(question || ""));
  const perSide = perTeamAsk ? extractWcPerTeamPlayerPropCount(question) : pluralPropsAsk ? 3 : 2;

  const homeAbbr = String(eventPayload?.homeTeam || teams[0] || "").toUpperCase();
  const awayAbbr = String(eventPayload?.awayTeam || teams[1] || "").toUpperCase();
  const homeLabel = wcMatchupTeamDisplayName(homeAbbr);
  const awayLabel = wcMatchupTeamDisplayName(awayAbbr);

  const homePool = rankFixturePropBoardRows(
    rows.filter((r) => matchPlayerPropNationMatchesTeam(r.nationAbbr, homeAbbr)),
    perSide * 2,
    marketKey,
  );
  const awayPool = rankFixturePropBoardRows(
    rows.filter((r) => matchPlayerPropNationMatchesTeam(r.nationAbbr, awayAbbr)),
    perSide * 2,
    marketKey,
  );
  const homePicks = homePool.slice(0, perSide);
  const awayPicks = awayPool.slice(0, perSide);

  /** @type {typeof rows} */
  const picked = [...homePicks, ...awayPicks];
  if (picked.length < 2) {
    for (const r of rankFixturePropBoardRows(rows, perSide * 2, marketKey)) {
      if (picked.length >= perSide * 2) break;
      if (!picked.includes(r)) picked.push(r);
    }
  }
  if (picked.length < 2) return null;
  if (!eventPayload || !isMatchPlayerPropsFresh(eventPayload)) return null;

  let numbered;
  if (perTeamAsk && homePicks.length && awayPicks.length) {
    const homeLines = homePicks.map((r, i) =>
      `${i + 1}. ${formatFixturePropBoardRowLabel(r, marketKey, marketLabel)}`,
    );
    const awayLines = awayPicks.map((r, i) =>
      `${i + 1}. ${formatFixturePropBoardRowLabel(r, marketKey, marketLabel)}`,
    );
    numbered = [
      `${homeLabel} (${homeAbbr})`,
      ...homeLines,
      `${awayLabel} (${awayAbbr})`,
      ...awayLines,
    ].join("\n");
  } else {
    numbered = picked
      .slice(0, perSide * 2)
      .map(
        (r, i) =>
          `${i + 1}. ${formatFixturePropBoardRowLabel(r, marketKey, marketLabel)}`,
      )
      .join("\n");
  }

  const lead = picked[0];
  const meta = tierMetaFor(tier);
  const propBoardRows = picked.slice(0, Math.max(3, perSide * 2)).map((r) => ({
    label: r.name,
    lean: formatFixturePropBoardRowLabel(r, marketKey, marketLabel),
    market: marketKey,
    odds: r.americanOdds,
    nationAbbr: r.nationAbbr ? String(r.nationAbbr).toUpperCase() : undefined,
  }));
  const leadLabel = formatFixturePropBoardRowLabel(lead, marketKey, marketLabel);
  const call = pluralPropsAsk
    ? perTeamAsk
      ? `${perSide} props per side — ${homeLabel} vs ${awayLabel}`
      : `${homeLabel} vs ${awayLabel} — top player props`
    : leadLabel;

  return {
    sport: "worldcup",
    cardType: pluralPropsAsk ? WC_CARD_TYPE.PROP_BOARD : WC_CARD_TYPE.SINGLE_LEAN,
    callType: meta.callType,
    playerMarketTier: tier,
    wcEventId: eventId || undefined,
    fixtureHome: homeAbbr,
    fixtureAway: awayAbbr,
    propBoardRows,
    call,
    lean: numbered,
    whyNow: `Posted ${marketLabel} lines for ${wcMatchupTeamDisplayName(homeAbbr)} vs ${wcMatchupTeamDisplayName(awayAbbr)}.`,
    edge:
      picked.length >= 2
        ? `${picked[1].name} ${picked[1].americanOdds} is the alternate if ${lead.name} sits.`
        : "",
    confidence: tier === WC_PLAYER_MARKET_TIER.VERIFIED ? "Medium" : "Speculative",
    analysis: String(question || "").trim(),
  };
}

const FIXTURE_PARLAY_MARKET_KEYS = [
  "player_sot_ou",
  "player_shots_ou",
  "player_goal_or_assist",
  "anytime_scorer",
];

/**
 * @param {Record<string, unknown>} eventPayload
 */
function fixtureParlayCandidateRowsFromEvent(eventPayload) {
  /** @type {Array<{ name: string, americanOdds: string, nationAbbr?: string, market: string, line?: string }>} */
  const rows = [];
  const seen = new Set();
  for (const marketKey of FIXTURE_PARLAY_MARKET_KEYS) {
    const raw = matchPlayerPropRowsFromEvent(eventPayload, marketKey, 24);
    const collapsed = collapseMatchPlayerPropRowsForDisplay(raw, marketKey);
    for (const row of collapsed.slice(0, 8)) {
      const key = `${row.name}|${marketKey}|${row.americanOdds}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        name: String(row.name || "").trim(),
        americanOdds: String(row.americanOdds || "").trim(),
        nationAbbr: row.nationAbbr ? String(row.nationAbbr).toUpperCase() : undefined,
        market: marketKey,
        line: row.line != null ? String(row.line) : undefined,
      });
    }
  }
  return rows;
}

/**
 * @param {Array<{ name?: string, americanOdds?: string, nationAbbr?: string, market?: string, line?: string }>} rows
 * @param {string} question
 * @param {number} legCount
 */
function pickBalancedFixtureParlayLegRows(rows, question, legCount) {
  const n = Math.max(2, Math.min(5, legCount));
  const boardRows = rows.map((row) => {
    const marketKey = String(row.market || "anytime_scorer");
    const marketLabel = WC_GROUNDING_MARKET_LABELS[marketKey] || marketKey;
    return {
      label: row.name,
      lean: formatFixturePropBoardRowLabel(row, marketKey, marketLabel),
      market: marketKey,
      odds: row.americanOdds,
      nationAbbr: row.nationAbbr,
      name: row.name,
      americanOdds: row.americanOdds,
      line: row.line,
    };
  });
  const sorted = sortPropBoardRowsForMixedLean(boardRows, question);
  const teams = extractMentionedWcTeamsInQuestionOrder(question).map((t) =>
    String(t).toUpperCase(),
  );
  const perTeam = Math.max(1, Math.ceil(n / 2));
  /** @type {typeof boardRows} */
  const picked = [];
  const byTeam = new Map();
  for (const row of sorted) {
    const abbr = String(row.nationAbbr || "").toUpperCase();
    if (!abbr) continue;
    if (!byTeam.has(abbr)) byTeam.set(abbr, []);
    byTeam.get(abbr).push(row);
  }
  const teamOrder =
    teams.length >= 2 ? teams : [...byTeam.keys()].slice(0, 2);
  for (const team of teamOrder) {
    const pool = byTeam.get(String(team).toUpperCase()) || [];
    for (const row of pool.slice(0, perTeam)) {
      if (picked.length >= n) break;
      if (!picked.includes(row)) picked.push(row);
    }
  }
  for (const row of sorted) {
    if (picked.length >= n) break;
    if (!picked.includes(row)) picked.push(row);
  }
  return picked.slice(0, n);
}

/**
 * Deterministic N-leg player parlay from posted MATCH PLAYER PROPS rows.
 * @param {string} question
 * @param {WcPlayerMarketTier} tier
 * @param {object | null | undefined} kvBlocks
 * @param {object | null | undefined} wcContext
 * @param {number | null} [legCount]
 */
export function buildWcFixturePlayerParlayStructured(
  question,
  tier,
  kvBlocks,
  wcContext,
  legCount = null,
) {
  const q = String(question || "").trim();
  const teams = resolveWcPlayerPropFixtureTeams(
    q,
    wcContext?.conversationHistory || [],
    wcContext,
  );
  if (teams.length < 2) return null;

  const kvRoot = kvBlocks?.matchPlayerProps;
  if (!kvRoot) return null;

  const resolved = resolveMatchPlayerPropsPayload(kvRoot, {
    eventId: String(kvBlocks?.wcEventId || wcContext?.wcEventId || "").trim(),
    teams,
  });
  if (!resolved?.payload || !isMatchPlayerPropsFresh(resolved.payload)) return null;

  const n = legCount ?? extractParlayLegCount(q) ?? 4;
  const candidates = fixtureParlayCandidateRowsFromEvent(resolved.payload);
  if (candidates.length < Math.min(n, 2)) return null;

  const picked = pickBalancedFixtureParlayLegRows(candidates, q, n);
  if (picked.length < Math.min(n, 2)) return null;

  const homeAbbr = String(resolved.payload?.homeTeam || teams[0] || "").toUpperCase();
  const awayAbbr = String(resolved.payload?.awayTeam || teams[1] || "").toUpperCase();
  const homeLabel = wcMatchupTeamDisplayName(homeAbbr);
  const awayLabel = wcMatchupTeamDisplayName(awayAbbr);

  /** @type {Array<{ play: string, odds: string }>} */
  const parlayLegs = [];
  const legLines = picked.map((row, i) => {
    const marketKey = String(row.market || "anytime_scorer");
    const marketLabel = WC_GROUNDING_MARKET_LABELS[marketKey] || marketKey;
    const line = formatFixturePropBoardRowLabel(row, marketKey, marketLabel);
    parlayLegs.push({ play: line, odds: String(row.odds || row.americanOdds || "").trim() });
    return `${i + 1}. ${line}`;
  });
  const numbered = legLines.join("\n");

  const americanValues = parlayLegs
    .map((leg) => parseAmericanOddsValue(leg.odds))
    .filter((v) => v != null);
  const combined =
    americanValues.length === parlayLegs.length
      ? calculateParlayOdds(/** @type {number[]} */ (americanValues))
      : null;
  const combinedDisplay = combined != null ? formatParlayAmericanOdds(combined) : null;
  const ticketLabel = `${picked.length}-Leg Player Parlay`;
  const propBoardRows = picked.map((row) => ({
    label: row.name,
    lean: row.lean,
    market: row.market,
    odds: row.odds || row.americanOdds,
    nationAbbr: row.nationAbbr,
  }));

  return {
    sport: "worldcup",
    cardType: WC_CARD_TYPE.PARLAY_TICKET,
    callType: "parlay",
    playerMarketTier: tier,
    wcEventId: resolved.eventId || undefined,
    fixtureHome: homeAbbr,
    fixtureAway: awayAbbr,
    call: `${ticketLabel} — ${homeLabel} vs ${awayLabel}${combinedDisplay ? ` (${combinedDisplay})` : ""}`,
    lean: numbered,
    parlayLegs,
    parlayCombinedOdds: combinedDisplay,
    propBoardRows,
    whyNow: `Posted player props for ${homeLabel} vs ${awayLabel} — ${picked.length} chalk-weighted legs from match board.`,
    edge:
      picked.length >= 2
        ? `Trim if a late scratch hits ${picked[0].name || "leg 1"} — rest of ticket still needs volume.`
        : "Re-check lineups before lock.",
    confidence: tier === WC_PLAYER_MARKET_TIER.VERIFIED ? "Medium" : "Speculative",
    breakdownAvailable: true,
    analysis: q,
  };
}

export function buildWcPlayerMarketPrebuiltStructured(
  question,
  wcIntent,
  tier,
  goldenBoot,
  opts = {},
) {
  const matchPlayerProps = opts.matchPlayerProps;
  const wcEventId = String(opts.wcEventId || "").trim();
  let rows = goldenBootRowsFromKv(goldenBoot, 6);
  let label = formatWcPlayerMarketPassLabel(wcIntent);
  let contextNote = "Based on current betting markets and form in VERIFIED CONTEXT.";

  if (
    isWcFixturePlayerMarketIntent(wcIntent) &&
    wcEventId &&
    isMatchPlayerPropsFresh(matchPlayerProps)
  ) {
    const matchRows = matchPlayerPropRowsFromEvent(matchPlayerProps, "anytime_scorer", 6);
    if (matchRows.length) {
      rows = matchRows;
      label = "anytime goalscorer (this match)";
      contextNote = `Match-scoped lines for event ${wcEventId} in VERIFIED CONTEXT.`;
    }
  }

  if (!rows.length) return null;

  const meta = tierMetaFor(tier);
  const lead = rows
    .slice(0, 4)
    .map((r) => `${r.name} ${r.americanOdds}`)
    .join(", ");
  const lineupNote =
    tier === WC_PLAYER_MARKET_TIER.MARKET_ONLY || tier === WC_PLAYER_MARKET_TIER.THIN
      ? " Lineups may not be confirmed — prices are market reference only."
      : "";

  return {
    sport: "worldcup",
    callType: meta.callType,
    playerMarketTier: tier,
    wcEventId: wcEventId || undefined,
    call: `Market has ${rows[0].name} — ${label} board prices the name first.`,
    line: `Market ${rows[0].americanOdds} · next ${rows[1]?.name || "contender"} ${rows[1]?.americanOdds || ""}.`.replace(
      /\s+\./,
      ".",
    ),
    lean: `Lean: ${rows[0].name} at ${rows[0].americanOdds} — best listed price on the ${label} board.${lineupNote}`,
    whyNow: `Top contenders by price: ${lead}. ${contextNote}`,
    edge:
      rows.length >= 2
        ? `Watch for lineup confirmation — ${rows[1].name} at ${rows[1].americanOdds} closes fast if ${rows[0].name} starts.`
        : "Watch for thin market depth before locking a player price.",
    deep: `Full board: ${lead}. ${contextNote}${lineupNote}`,
    breakdownAvailable: true,
    confidence: tier === WC_PLAYER_MARKET_TIER.VERIFIED ? "Medium" : "Speculative",
    analysis: String(question || "").trim(),
  };
}

/**
 * Resolve per-event match props for a named player leg.
 * @param {import("./wcUrTakePlayerMarket.js").WcNamedPlayerPropLeg} leg
 * @param {object | null | undefined} kvBlocks
 * @param {object | null | undefined} wcContext
 */
function resolveWcMatchPlayerPropsForNamedLeg(leg, kvBlocks, wcContext) {
  const byEvent = kvBlocks?.matchPlayerPropsByEvent;
  const matches = Array.isArray(wcContext?.allMatches) ? wcContext.allMatches : [];

  const tryPayload = (payload) => {
    const matchHit = findWcNamedPlayerPropLegMatch(leg, payload);
    return matchHit ? { matchHit, eventPayload: payload } : null;
  };

  if (byEvent && typeof byEvent === "object") {
    for (const payload of Object.values(byEvent)) {
      const found = tryPayload(payload);
      if (found) return found;
    }
  }

  const single = kvBlocks?.matchPlayerProps;
  if (single) {
    const found = tryPayload(single);
    if (found) return found;
  }

  const subQuestion = `${leg.name} over ${leg.threshold} ${leg.marketLabel}`;
  const nation = resolveWcPlayerNationFromQuestion(subQuestion);
  if (!nation || !matches.length) return { matchHit: null, eventPayload: null };

  const eventId = resolveWcEventIdForPlayerNation(matches, nation);
  if (!eventId) return { matchHit: null, eventPayload: null };

  const payload =
    byEvent && typeof byEvent === "object"
      ? byEvent[eventId] || null
      : String(kvBlocks?.wcEventId || "") === String(eventId)
        ? single
        : null;
  if (!payload) return { matchHit: null, eventPayload: null };

  const found = tryPayload(payload);
  return found || { matchHit: null, eventPayload: null };
}

/**
 * Card-level whyNow for named player prop legs — proxy context once, not on every line.
 * @param {Array<{ leg: import("./wcUrTakePlayerMarket.js").WcNamedPlayerPropLeg, matchHit: Record<string, unknown> | null }>} resolved
 */
function buildWcNamedPlayerPropWhyNow(resolved) {
  const priced = resolved.filter((r) => r.matchHit?.row?.americanOdds);
  const legs = resolved.map((r) => r.leg);
  if (!priced.length) return null;

  if (legs.length === 1) {
    const r = resolved[0];
    const odds = String(r.matchHit?.row?.americanOdds || "");
    const postedLine = r.matchHit?.row?.line || r.leg.threshold;
    if (r.matchHit?.isProxy) {
      const market =
        WC_NAMED_PROP_MARKET_DISPLAY[String(r.matchHit.marketKey || "")] || "nearest market";
      return `Full-match ${r.leg.threshold} isn't posted; priced on ${market} at ${odds}.`;
    }
    const asked = parseFloat(r.leg.threshold);
    const posted = parseFloat(String(postedLine));
    if (Number.isFinite(asked) && Number.isFinite(posted) && posted !== asked) {
      return `Over ${postedLine} at ${odds} — nearest posted line to your ${r.leg.threshold} ask.`;
    }
    return `Posted in MATCH PLAYER PROPS at ${odds}.`;
  }

  const proxies = priced.filter((r) => r.matchHit?.isProxy);
  let base =
    priced.length === legs.length
      ? `All ${legs.length} names have posted lines in MATCH PLAYER PROPS.`
      : `${priced.length} of ${legs.length} names have posted lines; pass the rest until books publish.`;
  if (proxies.length === 1) {
    const odds = String(proxies[0].matchHit?.row?.americanOdds || "");
    base += ` ${proxies[0].leg.name} is on each-half at ${odds} where full-match isn't posted.`;
  } else if (proxies.length > 1) {
    base += " Where full-match ladders are missing, each-half is the nearest market.";
  }
  return base;
}

/**
 * @param {Array<{ leg: import("./wcUrTakePlayerMarket.js").WcNamedPlayerPropLeg, matchHit: Record<string, unknown> | null }>} resolved
 * @param {number} legCount
 * @param {Array<{ leg: import("./wcUrTakePlayerMarket.js").WcNamedPlayerPropLeg, matchHit: Record<string, unknown> | null }>} playable
 */
function buildWcNamedPlayerPropCall(resolved, legCount, playable) {
  const formatLine = (r) =>
    formatWcNamedPlayerPropLegAnswer(r.leg, r.matchHit).replace(/^pass\s*[—-]\s*/i, "Pass — ");

  if (legCount === 1) {
    return formatLine(resolved[0]);
  }
  if (!playable.length) {
    return formatLine(resolved[0]);
  }
  return `${playable.length} of ${legCount} playable`;
}

/**
 * Deterministic card for named player prop leg(s) — shots/SOT/scorer with posted prices.
 * @param {string} question
 * @param {WcPlayerMarketTier} tier
 * @param {object | null | undefined} kvBlocks
 * @param {object | null | undefined} wcContext
 */
export function buildWcNamedPlayerPropsStructured(question, tier, kvBlocks, wcContext) {
  const legs = extractWcNamedPlayerPropLegsFromQuestion(question);
  if (!legs.length) return null;

  const meta = tierMetaFor(tier);
  /** @type {Array<{ leg: import("./wcUrTakePlayerMarket.js").WcNamedPlayerPropLeg, matchHit: Record<string, unknown> | null, eventPayload: Record<string, unknown> | null }>} */
  const resolved = legs.map((leg) => {
    const hit = resolveWcMatchPlayerPropsForNamedLeg(leg, kvBlocks, wcContext);
    return { leg, matchHit: hit.matchHit, eventPayload: hit.eventPayload };
  });

  const priced = resolved.filter((r) => r.matchHit?.row?.americanOdds);
  const leanLines =
    legs.length === 1
      ? [formatWcNamedPlayerPropLegAnswer(resolved[0].leg, resolved[0].matchHit)]
      : resolved.map(
          (r, i) => `${i + 1}. ${formatWcNamedPlayerPropLegAnswer(r.leg, r.matchHit)}`,
        );
  const playable = resolved.filter((r) => {
    if (!r.matchHit?.row?.americanOdds) return false;
    const verdict = formatWcNamedPlayerPropLegAnswer(r.leg, r.matchHit);
    return !/^pass\b/i.test(verdict) && !/juice, skip/i.test(verdict);
  });

  const lead = resolved[0];
  const leadEvent = lead?.eventPayload;
  const eventId = String(leadEvent?.eventId || kvBlocks?.wcEventId || wcContext?.wcEventId || "").trim();
  const fixturePayload =
    kvBlocks?.matchPlayerProps && hasMatchPlayerPropRows(kvBlocks.matchPlayerProps)
      ? kvBlocks.matchPlayerProps
      : leadEvent?.eventPayload && hasMatchPlayerPropRows(leadEvent.eventPayload)
        ? leadEvent.eventPayload
        : kvBlocks?.matchPlayerProps || leadEvent?.eventPayload || null;
  const fixtureHasProps = hasMatchPlayerPropRows(fixturePayload);

  if (!priced.length) {
    if (fixtureHasProps) {
      console.error(
        JSON.stringify({
          event: "wc_props_monitoring_alert",
          arm: "data_present_no_priced_legs",
          wcEventId: eventId || null,
          legCount: legs.length,
          legNames: legs.map((l) => l.name),
          shotRowCount: matchPlayerPropRowsFromEvent(fixturePayload, "player_shots_ou", 999).length,
        }),
      );
    }
    const passCall =
      legs.length === 1
        ? formatWcNamedPlayerPropLegAnswer(resolved[0].leg, resolved[0].matchHit)
        : fixtureHasProps
          ? buildWcNamedPlayerPropDataPresentNoMatchHeadline(legs, question, fixturePayload)
          : buildWcNamedPlayerPropNoLineHeadline(legs, question);
    const noLineLean =
      legs.length === 1
        ? passCall
        : legs
            .map((leg, i) => {
              const r = resolved[i];
              return `${i + 1}. ${formatWcNamedPlayerPropLegAnswer(leg, r?.matchHit ?? null)}`;
            })
            .join("\n");
    return finalizeWcPlayerPropStructured(
      {
        sport: "worldcup",
        callType: meta.callType,
        playerMarketTier: tier,
        wcEventId: eventId || undefined,
        wcNamedPlayerPropsCard: true,
        fixtureHome: wcContext?.fixtureHome
          ? String(wcContext.fixtureHome).toUpperCase()
          : leadEvent?.homeTeam
            ? String(leadEvent.homeTeam).toUpperCase()
            : undefined,
        fixtureAway: wcContext?.fixtureAway
          ? String(wcContext.fixtureAway).toUpperCase()
          : leadEvent?.awayTeam
            ? String(leadEvent.awayTeam).toUpperCase()
            : undefined,
        call: passCall,
        lean: noLineLean,
        whyNow: buildWcNamedPlayerPropNoLineWhyNow(legs, wcContext),
        edge: buildWcNamedPlayerPropNoLineEdge(legs, wcContext),
        confidence: "Speculative",
        analysis: String(question || "").trim(),
      },
      question,
    );
  }

  const call = buildWcNamedPlayerPropCall(resolved, legs.length, playable);
  const whyNow = buildWcNamedPlayerPropWhyNow(resolved);

  return finalizeWcPlayerPropStructured(
    {
      sport: "worldcup",
      callType: meta.callType,
      playerMarketTier: tier,
      wcEventId: eventId || undefined,
      wcNamedPlayerPropsCard: true,
      fixtureHome: leadEvent?.homeTeam ? String(leadEvent.homeTeam).toUpperCase() : undefined,
      fixtureAway: leadEvent?.awayTeam ? String(leadEvent.awayTeam).toUpperCase() : undefined,
      call,
      lean: leanLines.join("\n"),
      whyNow: whyNow || "",
      edge:
        playable.length >= 2
          ? `Best combo value: ${playable.slice(0, 2).map((r) => formatWcNamedPlayerPropLegAnswer(r.leg, r.matchHit)).join(" · ")}`
          : playable.length === 1
            ? `Only ${playable[0].leg.name} clears juice at the posted line.`
            : "Every listed leg is juice — wait for a better milestone or skip the parlay.",
      confidence: tier === WC_PLAYER_MARKET_TIER.VERIFIED ? "Medium" : "Speculative",
      analysis: String(question || "").trim(),
    },
    question,
  );
}

/**
 * @param {string} question
 * @param {string} wcIntent
 * @param {object | null | undefined} wcContext
 * @param {{ players?: object | null, goldenBoot?: object | null, injuries?: object | null } | null} kvBlocks
 * @param {{ prebuiltAnswer?: boolean }} [opts]
 */
export function resolveWcPlayerMarketAnswer(
  question,
  wcIntent,
  wcContext,
  kvBlocks,
  opts = {},
) {
  const tier = resolveWcPlayerMarketTier({
    goldenBoot: kvBlocks?.goldenBoot,
    players: kvBlocks?.players,
    injuries: kvBlocks?.injuries,
    matchPlayerProps: kvBlocks?.matchPlayerProps,
    wcEventId: kvBlocks?.wcEventId || wcContext?.wcEventId,
    wcContext,
    wcIntent,
  });
  const meta = tierMetaFor(tier);
  const knownNames = extractKnownPlayerNamesFromKv(kvBlocks);
  const questionStr = String(question || "").trim();
  const history = Array.isArray(wcContext?.conversationHistory) ? wcContext.conversationHistory : [];
  const fixtureMatches = Array.isArray(wcContext?.allMatches) ? wcContext.allMatches : [];
  const fixtureTeams = resolveWcPlayerPropFixtureTeams(questionStr, history, wcContext, fixtureMatches);
  const questionTeams = extractMentionedWcTeams(questionStr);
  const isFixturePlayerPropAsk =
    isGenericWcPlayerPropQuestion(questionStr) ||
    detectParlayIntent(questionStr) ||
    isWcFixtureScopedPlayerMarketQuestion(questionStr);
  const namedPlayerProps =
    wcIntent === WC_INTENT.PLAYER_PROP &&
    isWcNamedPlayerPropQuestion(questionStr) &&
    !isWcFixturePlayerPropsQuestion(questionStr) &&
    !detectParlayIntent(questionStr);
  const singleNationPropsAsk =
    questionTeams.length === 1 &&
    (isGenericWcPlayerPropQuestion(questionStr) || /\btonight\b/i.test(questionStr));
  const genericSlateProps =
    wcIntent === WC_INTENT.PLAYER_PROP &&
    isFixturePlayerPropAsk &&
    !isWcFixturePlayerPropsQuestion(questionStr) &&
    !detectParlayIntent(questionStr) &&
    !namedPlayerProps &&
    !singleNationPropsAsk &&
    fixtureTeams.length < 2;
  const fixturePlayerProps =
    isWcFixturePlayerMarketIntent(wcIntent) &&
    isFixturePlayerPropAsk &&
    (isWcFixturePlayerPropsQuestion(questionStr) ||
      detectParlayIntent(questionStr) ||
      fixtureTeams.length >= 2);
  const freshMatchProps = kvHasFreshMatchPlayerProps(kvBlocks?.matchPlayerProps, {
    eventId: String(kvBlocks?.wcEventId || wcContext?.wcEventId || "").trim(),
    question: questionStr,
    teams: fixtureTeams.length >= 2 ? fixtureTeams : questionTeams,
  });
  const wcContextWithHistory = { ...wcContext, conversationHistory: history, requiredEntities: fixtureTeams };
  const fixtureIntelStructured =
    fixturePlayerProps &&
    !freshMatchProps &&
    prefersWcFixtureScorerIntelFallback(questionStr)
      ? buildWcFixtureScorerIntelStructured(questionStr, tier, kvBlocks, wcContextWithHistory)
      : null;
  const forcePass =
    (tier === WC_PLAYER_MARKET_TIER.THIN && knownNames.length === 0) ||
    (genericSlateProps && !freshMatchProps) ||
    (fixturePlayerProps && !freshMatchProps && !fixtureIntelStructured);
  const propBoard = pickFixturePropBoardFromEvent(kvBlocks?.matchPlayerProps, 24);
  const propRows = propBoard?.rows || [];

  const base = {
    tier,
    playerMarketTier: tier,
    tierLabel: meta.label,
    tierDisclaimer: meta.disclaimer,
    callType: meta.callType,
    knownPlayerNames: knownNames,
    forcePass,
    structured: null,
    responseText: null,
    responseDeep: null,
    promptAppendix: null,
  };

  // Safety net: bare PARLAY intent should never fall through to generic LLM.
  if (wcIntent === WC_INTENT.PARLAY) {
    const canBuildParlayLegs =
      fixturePlayerProps && freshMatchProps && propRows.length >= 2 && detectParlayIntent(questionStr);
    if (!canBuildParlayLegs) {
      const structured = buildWcPlayerParlayPassStructured(
        questionStr,
        extractParlayLegCount(questionStr),
      );
      return {
        ...base,
        forcePass: true,
        structured,
        responseText: `${structured.lean}\n\n${structured.whyNow}`,
      };
    }
  }

  if (fixturePlayerProps && freshMatchProps) {
    if (detectParlayIntent(questionStr) || wcIntent === WC_INTENT.PARLAY) {
      const parlayStructured = buildWcFixturePlayerParlayStructured(
        questionStr,
        tier,
        {
          ...kvBlocks,
          wcEventId: kvBlocks?.wcEventId || wcContext?.wcEventId,
        },
        { ...wcContext, requiredEntities: fixtureTeams },
        extractParlayLegCount(questionStr),
      );
      if (parlayStructured) {
        return {
          ...base,
          forcePass: true,
          structured: parlayStructured,
          responseText: `${parlayStructured.lean}\n\n${parlayStructured.whyNow}`,
        };
      }
      if (wcIntent === WC_INTENT.PARLAY) {
        const structured = buildWcPlayerParlayPassStructured(
          questionStr,
          extractParlayLegCount(questionStr),
        );
        return {
          ...base,
          forcePass: true,
          structured,
          responseText: `${structured.lean}\n\n${structured.whyNow}`,
        };
      }
    }
    const structured = buildWcFixturePlayerPropsListStructured(
      questionStr,
      tier,
      {
        ...kvBlocks,
        wcEventId: kvBlocks?.wcEventId || wcContext?.wcEventId,
      },
      { ...wcContext, requiredEntities: fixtureTeams },
    );
    if (structured) {
      return {
        ...base,
        forcePass: true,
        structured,
        responseText: `${structured.lean}\n\n${structured.whyNow}`,
      };
    }
  }

  if (fixtureIntelStructured) {
    return {
      ...base,
      forcePass: true,
      structured: fixtureIntelStructured,
      responseText: `${fixtureIntelStructured.lean}\n\n${fixtureIntelStructured.whyNow}`,
    };
  }

  if (namedPlayerProps) {
    const structured = buildWcNamedPlayerPropsStructured(
      questionStr,
      tier,
      kvBlocks,
      wcContextWithHistory,
    );
    if (structured) {
      return {
        ...base,
        forcePass: true,
        structured,
        responseText: `${structured.lean}\n\n${structured.whyNow}`,
      };
    }
  }

  if (
    questionStr &&
    (wcIntent === WC_INTENT.GOLDEN_BOOT || wcIntent === WC_INTENT.TOP_SCORER) &&
    goldenBootRowCount(kvBlocks?.goldenBoot) > 0
  ) {
    const prebuilt = buildWcPlayerMarketPrebuiltStructured(
      questionStr,
      wcIntent,
      tier,
      kvBlocks?.goldenBoot,
      {
        matchPlayerProps: kvBlocks?.matchPlayerProps,
        wcEventId: kvBlocks?.wcEventId || wcContext?.wcEventId,
      },
    );
    if (prebuilt) {
      return {
        ...base,
        forcePass: true,
        structured: prebuilt,
        responseText: `${prebuilt.lean}\n\n${prebuilt.whyNow}`,
      };
    }
  }

  if (forcePass) {
    const fixturePassCall =
      fixturePlayerProps && fixtureTeams.length >= 2
        ? `Player prop lines aren't posted yet for ${wcMatchupTeamDisplayName(fixtureTeams[0])} vs ${wcMatchupTeamDisplayName(fixtureTeams[1])}.`
        : buildWcPlayerPropPassHeadline(questionStr);
    const structured =
      detectParlayIntent(questionStr) || wcIntent === WC_INTENT.PARLAY
        ? buildWcPlayerParlayPassStructured(questionStr, extractParlayLegCount(questionStr))
      : repairWcPlayerPropPassCard(
          {
            sport: "worldcup",
            callType: meta.callType,
            playerMarketTier: tier,
            call: fixturePassCall,
            lean: "Pass — no actionable line yet; see Watch For before locking a bet.",
            whyNow: genericSlateProps
              ? "Player props for the remaining slate need confirmed XI and posted match lines in VERIFIED CONTEXT."
              : fixturePlayerProps
                ? "Fixture player props need confirmed XI and posted match lines in VERIFIED CONTEXT."
                : "Re-ask once Golden Boot odds and match intel refresh.",
            edge: genericSlateProps || fixturePlayerProps
              ? "Re-ask closer to kickoff when MATCH PLAYER PROPS populate."
              : "No priced player edge until KV fills.",
            confidence: "Speculative",
            analysis: questionStr,
            ...(fixtureTeams.length >= 2
              ? { fixtureHome: fixtureTeams[0], fixtureAway: fixtureTeams[1] }
              : {}),
          },
          questionStr,
        );
    return {
      ...base,
      forcePass: true,
      structured,
      responseText: `${structured.lean}\n\n${structured.whyNow}`,
    };
  }

  if (wcIntent === WC_INTENT.TOP_GOALSCORERS_LIST) {
    const structured = buildWcTopGoalscorersListStructured(
      question,
      wcIntent,
      tier,
      kvBlocks?.goldenBoot,
    );
    if (structured) {
      return {
        ...base,
        forcePass: true,
        structured,
        responseText: `${structured.lean}\n\n${structured.whyNow}`,
      };
    }
  }

  if (opts.prebuiltAnswer) {
    const structured = buildWcPlayerMarketPrebuiltStructured(
      question,
      wcIntent,
      tier,
      kvBlocks?.goldenBoot,
      {
        matchPlayerProps: kvBlocks?.matchPlayerProps,
        wcEventId: kvBlocks?.wcEventId || wcContext?.wcEventId,
      },
    );
    if (structured) {
      return {
        ...base,
        forcePass: true,
        structured,
        responseText: `${structured.lean}\n\n${structured.whyNow}`,
      };
    }
  }

  return {
    ...base,
    forcePass: false,
  };
}
