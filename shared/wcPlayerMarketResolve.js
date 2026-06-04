/**
 * World Cup player-market tier resolver + answer contract (Phase B).
 */

import { WC_GOLDEN_BOOT_SEED_ROWS } from "../src/data/wc2026GoldenBootSeed.js";
import { goldenBootRowsFromKv } from "./wcPlayerOddsFreshness.js";
import {
  countRegistryPlayers,
  normalizeWcPlayerName,
  topRegistryScorers,
} from "./wcPlayerRegistry.js";
import {
  formatWcPlayerMarketPassLabel,
  wcContextHasVerifiedScorerGrounding,
} from "./wcUrTakePlayerMarket.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

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
  const gbCount = goldenBootRowCount(goldenBoot);
  const gbFresh = Boolean(goldenBoot && !goldenBoot.stale && gbCount >= 5);
  const lineupConfirmed = wcContextHasVerifiedScorerGrounding(wcContext);
  const topScorers = topRegistryScorers(players, 8);
  const hasGoalLeaders = topScorers.some((p) => (Number(p.goalsTournament) || 0) > 0);
  const { playerCount } = countRegistryPlayers(players || {});

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
 * Optional deterministic answer for thin/market_only when we want guaranteed names (smoke/dev).
 * @param {string} question
 * @param {string} wcIntent
 * @param {WcPlayerMarketTier} tier
 * @param {object | null | undefined} goldenBoot
 */
export function buildWcPlayerMarketPrebuiltStructured(question, wcIntent, tier, goldenBoot) {
  const rows = goldenBootRowsFromKv(goldenBoot, 6);
  if (!rows.length) return null;

  const meta = tierMetaFor(tier);
  const lead = rows
    .slice(0, 4)
    .map((r) => `${r.name} ${r.americanOdds}`)
    .join(", ");
  const label = formatWcPlayerMarketPassLabel(wcIntent);
  const lineupNote =
    tier === WC_PLAYER_MARKET_TIER.MARKET_ONLY || tier === WC_PLAYER_MARKET_TIER.THIN
      ? " Lineups may not be confirmed — prices are market reference only."
      : "";

  return {
    sport: "worldcup",
    callType: meta.callType,
    playerMarketTier: tier,
    call: `${rows[0].name} ${rows[0].americanOdds} — ${label}`,
    lean: `Lean: ${rows[0].name} leads the ${label} board at ${rows[0].americanOdds} (${meta.label}).${lineupNote}`,
    whyNow: `Top contenders by price: ${lead}. Based on current betting markets and form in VERIFIED CONTEXT.`,
    edge: rows.length >= 2 ? `Gap behind ${rows[1].name} at ${rows[1].americanOdds}.` : "Thin market depth.",
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
    wcContext,
    wcIntent,
  });
  const meta = tierMetaFor(tier);
  const knownNames = extractKnownPlayerNamesFromKv(kvBlocks);
  const forcePass = tier === WC_PLAYER_MARKET_TIER.THIN && knownNames.length === 0;

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

  if (forcePass) {
    const structured = buildWcPlayerMarketEmptyStructured(question, wcIntent);
    return {
      ...base,
      forcePass: true,
      structured,
      responseText: `${structured.lean}\n\n${structured.whyNow}`,
    };
  }

  if (opts.prebuiltAnswer) {
    const structured = buildWcPlayerMarketPrebuiltStructured(
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

  return {
    ...base,
    forcePass: false,
  };
}
