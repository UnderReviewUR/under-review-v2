/**
 * World Cup player-market tier resolver + answer contract (Phase B).
 */

import { WC_GOLDEN_BOOT_SEED_ROWS } from "../src/data/wc2026GoldenBootSeed.js";
import { sortGoldenBootRows } from "./wcPlayerOddsFreshness.js";
import { goldenBootRowsFromKv } from "./wcPlayerOddsFreshness.js";
import {
  collapseMatchPlayerPropRowsForDisplay,
  isMatchPlayerPropsFresh,
  kvHasFreshMatchPlayerProps,
  matchPlayerPropRowsFromEvent,
  resolveMatchPlayerPropsPayload,
} from "./wcMatchPlayerProps.js";
import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";
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
  repairWcPlayerPropPassCard,
} from "./wcUrTakePlayerMarket.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";
import { detectParlayIntent, extractParlayLegCount } from "./detectParlayIntent.js";

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
    wcIntent === WC_INTENT.PLAYER_PROP &&
    wcEventId &&
    matchPropsFresh &&
    (lineupConfirmed || gbCount >= 3)
  ) {
    return WC_PLAYER_MARKET_TIER.VERIFIED;
  }

  if (
    wcIntent === WC_INTENT.PLAYER_PROP &&
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
    callType: "single",
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
 * Deterministic numbered fixture player-prop card from MATCH PLAYER PROPS KV.
 * @param {string} question
 * @param {WcPlayerMarketTier} tier
 * @param {object | null | undefined} kvBlocks
 * @param {object | null | undefined} wcContext
 */
export function buildWcFixturePlayerPropsListStructured(question, tier, kvBlocks, wcContext) {
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

  const rawRows = matchPlayerPropRowsFromEvent(eventPayload, "anytime_scorer", 24);
  const rows = collapseMatchPlayerPropRowsForDisplay(rawRows, "anytime_scorer");
  if (rows.length < 2) return null;

  const teamSet = new Set(teams.map((t) => String(t).toUpperCase()));
  const byTeam = { home: [], away: [] };
  for (const r of rows) {
    const abbr = String(r.nationAbbr || "").toUpperCase();
    if (teamSet.has(abbr)) {
      if (!byTeam.home.length || byTeam.home[0]?.nationAbbr === abbr) {
        byTeam.home.push(r);
      } else {
        byTeam.away.push(r);
      }
    }
  }
  if (!byTeam.away.length) {
    byTeam.away = rows.filter((r) => !byTeam.home.includes(r));
  }

  /** @type {typeof rows} */
  const picked = [];
  const perSide = 3;
  for (let i = 0; i < perSide && i < byTeam.home.length; i += 1) picked.push(byTeam.home[i]);
  for (let i = 0; i < perSide && i < byTeam.away.length; i += 1) picked.push(byTeam.away[i]);
  if (picked.length < 2) {
    for (const r of rows) {
      if (picked.length >= 5) break;
      if (!picked.includes(r)) picked.push(r);
    }
  }
  if (picked.length < 2) return null;
  if (!eventPayload || !isMatchPlayerPropsFresh(eventPayload)) return null;

  const numbered = picked
    .slice(0, 5)
    .map((r, i) => `${i + 1}. ${r.name} anytime scorer ${r.americanOdds}`)
    .join("\n");
  const lead = picked[0];
  const meta = tierMetaFor(tier);
  const homeAbbr = String(eventPayload?.homeTeam || teams[0] || "").toUpperCase();
  const awayAbbr = String(eventPayload?.awayTeam || teams[1] || "").toUpperCase();

  return {
    sport: "worldcup",
    callType: meta.callType,
    playerMarketTier: tier,
    wcEventId: eventId || undefined,
    fixtureHome: homeAbbr,
    fixtureAway: awayAbbr,
    call: `${lead.name} anytime scorer ${lead.americanOdds}`,
    lean: numbered,
    whyNow: `Posted anytime scorer lines for ${wcMatchupTeamDisplayName(homeAbbr)} vs ${wcMatchupTeamDisplayName(awayAbbr)}.`,
    edge:
      picked.length >= 2
        ? `${picked[1].name} ${picked[1].americanOdds} is the alternate if ${lead.name} sits.`
        : "",
    confidence: tier === WC_PLAYER_MARKET_TIER.VERIFIED ? "Medium" : "Speculative",
    analysis: String(question || "").trim(),
  };
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
  const list = buildWcFixturePlayerPropsListStructured(question, tier, kvBlocks, wcContext);
  if (!list?.lean) return null;

  const n = legCount ?? extractParlayLegCount(question) ?? 4;
  const legLines = String(list.lean || "")
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
  if (legLines.length < Math.min(n, 2)) return null;

  const picked = legLines.slice(0, n);
  const numbered = picked.map((line, i) => `${i + 1}. ${line}`).join("\n");
  const meta = tierMetaFor(tier);
  const ticketLabel = `${picked.length}-leg player parlay`;

  return {
    sport: "worldcup",
    callType: meta.callType,
    playerMarketTier: tier,
    wcEventId: list.wcEventId,
    fixtureHome: list.fixtureHome,
    fixtureAway: list.fixtureAway,
    call: `${ticketLabel} — ${picked[0]}`,
    lean: numbered,
    whyNow: list.whyNow,
    edge: picked.length >= 2 ? `Alt leg: ${picked[1]}.` : list.edge,
    confidence: tier === WC_PLAYER_MARKET_TIER.VERIFIED ? "Medium" : "Speculative",
    analysis: String(question || "").trim(),
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
    wcIntent === WC_INTENT.PLAYER_PROP &&
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
  const fixtureTeams = resolveWcPlayerPropFixtureTeams(questionStr, history, wcContext);
  const questionTeams = extractMentionedWcTeams(questionStr);
  const isFixturePlayerPropAsk =
    isGenericWcPlayerPropQuestion(questionStr) || detectParlayIntent(questionStr);
  const genericSlateProps =
    wcIntent === WC_INTENT.PLAYER_PROP &&
    isFixturePlayerPropAsk &&
    !isWcFixturePlayerPropsQuestion(questionStr) &&
    !detectParlayIntent(questionStr) &&
    fixtureTeams.length < 2;
  const fixturePlayerProps =
    wcIntent === WC_INTENT.PLAYER_PROP &&
    isFixturePlayerPropAsk &&
    (isWcFixturePlayerPropsQuestion(questionStr) ||
      detectParlayIntent(questionStr) ||
      fixtureTeams.length >= 2);
  const freshMatchProps = kvHasFreshMatchPlayerProps(kvBlocks?.matchPlayerProps, {
    eventId: String(kvBlocks?.wcEventId || wcContext?.wcEventId || "").trim(),
    question: questionStr,
    teams: fixtureTeams.length >= 2 ? fixtureTeams : questionTeams,
  });
  const forcePass =
    (tier === WC_PLAYER_MARKET_TIER.THIN && knownNames.length === 0) ||
    (genericSlateProps && !freshMatchProps) ||
    (fixturePlayerProps && !freshMatchProps);

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

  if (fixturePlayerProps && freshMatchProps) {
    if (detectParlayIntent(questionStr)) {
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

  if (forcePass) {
    const structured = detectParlayIntent(question)
      ? buildWcPlayerParlayPassStructured(question, extractParlayLegCount(question))
      : repairWcPlayerPropPassCard(
          {
            sport: "worldcup",
            callType: meta.callType,
            playerMarketTier: tier,
            call: buildWcPlayerPropPassHeadline(questionStr),
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
