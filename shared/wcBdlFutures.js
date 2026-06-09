/**
 * BallDontLie GOAT futures — normalize + UR Take prompt binding.
 */

import { formatOddsAmerican, parseAmericanOddsValue } from "./formatOddsAmerican.js";
import {
  classifyWcAdvancementMarket,
  wcAdvancementMarketMeta,
  WC_ADVANCEMENT_MARKET,
} from "./wcAdvancementMarket.js";

/** BDL market_type → internal advancement market (null = not advancement-scoped). */
export const BDL_FUTURES_MARKET_TYPES = {
  outright: WC_ADVANCEMENT_MARKET.TOURNAMENT_WINNER,
  qualify_from_group: WC_ADVANCEMENT_MARKET.GROUP_ESCAPE,
  to_reach_round_of_16: WC_ADVANCEMENT_MARKET.ROUND_OF_16,
  to_reach_quarters: WC_ADVANCEMENT_MARKET.QUARTERFINALS,
  to_reach_semis: WC_ADVANCEMENT_MARKET.SEMIFINALS,
  to_reach_final: WC_ADVANCEMENT_MARKET.FINAL,
};

/** Advancement market → BDL market_type for price lookup. */
export const WC_ADVANCEMENT_TO_BDL_MARKET = {
  [WC_ADVANCEMENT_MARKET.TOURNAMENT_WINNER]: "outright",
  [WC_ADVANCEMENT_MARKET.GROUP_ESCAPE]: "qualify_from_group",
  [WC_ADVANCEMENT_MARKET.ROUND_OF_16]: "to_reach_round_of_16",
  [WC_ADVANCEMENT_MARKET.ROUND_OF_32]: "to_reach_round_of_16",
  [WC_ADVANCEMENT_MARKET.QUARTERFINALS]: "to_reach_quarters",
  [WC_ADVANCEMENT_MARKET.SEMIFINALS]: "to_reach_semis",
  [WC_ADVANCEMENT_MARKET.FINAL]: "to_reach_final",
};

const VENDOR_PRIORITY = ["draftkings", "fanduel"];

/**
 * @param {Record<string, unknown>} row
 */
export function normalizeBdlFuturesRow(row) {
  if (!row || typeof row !== "object") return null;
  const marketType = String(row.market_type || "").trim();
  if (!marketType) return null;

  const subject = row.subject && typeof row.subject === "object" ? row.subject : {};
  const abbr = String(
    subject.abbreviation || subject.abbr || subject.country_code || subject.code || "",
  )
    .trim()
    .toUpperCase();
  if (!abbr) return null;

  const american = parseAmericanOddsValue(row.american_odds ?? row.americanOdds);
  if (american == null) return null;

  return {
    id: row.id,
    marketType,
    marketName: row.market_name ? String(row.market_name).trim() : null,
    teamAbbr: abbr,
    teamName: subject.name ? String(subject.name).trim() : abbr,
    vendor: String(row.vendor || "unknown").trim().toLowerCase(),
    american,
    americanDisplay: american > 0 ? `+${american}` : String(american),
    decimalOdds: row.decimal_odds ?? row.decimalOdds ?? null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

/**
 * Collapse vendor rows to one price per team per market (prefer DK, then FD).
 * @param {Array<Record<string, unknown>>} rows
 */
export function buildBdlFuturesIndex(rows) {
  /** @type {Record<string, Record<string, { american: number, americanDisplay: string, vendor: string, teamName: string, updatedAt: string | null }>>} */
  const byMarketType = {};
  /** @type {Record<string, Record<string, Array<ReturnType<typeof normalizeBdlFuturesRow>>>>} */
  const rawByMarket = {};

  for (const row of rows || []) {
    const norm = normalizeBdlFuturesRow(row);
    if (!norm) continue;
    rawByMarket[norm.marketType] = rawByMarket[norm.marketType] || {};
    rawByMarket[norm.marketType][norm.teamAbbr] = rawByMarket[norm.marketType][norm.teamAbbr] || [];
    rawByMarket[norm.marketType][norm.teamAbbr].push(norm);
  }

  for (const [marketType, teams] of Object.entries(rawByMarket)) {
    byMarketType[marketType] = {};
    for (const [abbr, offers] of Object.entries(teams)) {
      const picked = pickBestVendorOffer(offers);
      if (picked) {
        byMarketType[marketType][abbr] = {
          american: picked.american,
          americanDisplay: picked.americanDisplay,
          vendor: picked.vendor,
          teamName: picked.teamName,
          updatedAt: picked.updatedAt,
        };
      }
    }
  }

  return {
    byMarketType,
    rowCount: (rows || []).length,
    marketTypes: Object.keys(byMarketType),
  };
}

/**
 * @param {Array<ReturnType<typeof normalizeBdlFuturesRow>>} offers
 */
export function pickBestVendorOffer(offers) {
  if (!offers?.length) return null;
  for (const vendor of VENDOR_PRIORITY) {
    const hit = offers.find((o) => o.vendor === vendor);
    if (hit) return hit;
  }
  return offers[0];
}

/**
 * @param {ReturnType<typeof buildBdlFuturesIndex>["byMarketType"]} byMarketType
 * @param {string} marketType
 * @param {string} teamAbbr
 */
export function getBdlFuturesPrice(byMarketType, marketType, teamAbbr) {
  const abbr = String(teamAbbr || "").trim().toUpperCase();
  if (!abbr || !marketType) return null;
  return byMarketType?.[marketType]?.[abbr] || null;
}

/**
 * @param {{ byMarketType?: ReturnType<typeof buildBdlFuturesIndex>["byMarketType"], lastUpdated?: number, source?: string, seededAt?: number }} seedPayload
 * @param {string} question
 * @param {string[]} [entities]
 * @param {number} [nowMs]
 */
export function buildWcBdlFuturesPromptBlock(seedPayload, question, entities = [], nowMs = Date.now()) {
  const byMarketType = seedPayload?.byMarketType || seedPayload?.futures?.byMarketType;
  if (!byMarketType || !Object.keys(byMarketType).length) return null;

  const market = classifyWcAdvancementMarket(question);
  const team =
    (entities || []).map((t) => String(t).toUpperCase()).filter(Boolean)[0] || null;

  const seededAt = Number(seedPayload?.seededAt ?? seedPayload?.lastUpdated);
  const ageDays =
    Number.isFinite(seededAt) && seededAt > 0
      ? Math.round((nowMs - seededAt) / (24 * 60 * 60 * 1000))
      : null;

  const lines = [
    "BDL FUTURES SEED (BallDontLie GOAT trial snapshot — DraftKings/FanDuel via BDL, NOT live refresh):",
    "  Use these for knockout-reach / group-advance / tournament-winner prices when market type matches the question.",
    "  CURRENT OUTRIGHT ODDS above is ESPN/scrape tournament-winner only — do NOT use it for Round of 16 reach.",
  ];

  if (ageDays != null) {
    lines.push(`  Seeded ${ageDays === 0 ? "today" : `${ageDays}d ago`} — label as reference snapshot, not live book.`);
  }

  if (market && market !== WC_ADVANCEMENT_MARKET.TOURNAMENT_WINNER) {
    const bdlType = WC_ADVANCEMENT_TO_BDL_MARKET[market];
    const meta = wcAdvancementMarketMeta(market);
    const marketRows = bdlType ? byMarketType[bdlType] : null;

    lines.push(`  Question market: ${meta.label} (BDL \`${bdlType || "?"}\`).`);

    if (team && bdlType && marketRows?.[team]) {
      const p = marketRows[team];
      lines.push(
        `  ${team} ${meta.label}: ${formatOddsAmerican(p.americanDisplay)} (${p.vendor})`,
      );
    } else if (team && bdlType) {
      lines.push(`  ${team}: no BDL \`${bdlType}\` price in seed.`);
    } else if (bdlType && marketRows) {
      const top = Object.entries(marketRows)
        .slice(0, 8)
        .map(([abbr, p]) => `    ${abbr}: ${formatOddsAmerican(p.americanDisplay)} (${p.vendor})`);
      if (top.length) {
        lines.push(`  Sample ${meta.label} lines:`);
        lines.push(...top);
      }
    }
  } else if (team && byMarketType.outright?.[team]) {
    const p = byMarketType.outright[team];
    lines.push(`  ${team} tournament winner: ${formatOddsAmerican(p.americanDisplay)} (${p.vendor})`);
  } else if (team) {
    for (const [bdlType, advancement] of Object.entries(BDL_FUTURES_MARKET_TYPES)) {
      const p = byMarketType[bdlType]?.[team];
      if (!p) continue;
      const meta = wcAdvancementMarketMeta(advancement);
      lines.push(`  ${team} ${meta.shortLabel}: ${formatOddsAmerican(p.americanDisplay)} (${p.vendor})`);
    }
  }

  lines.push("  Do not invent prices — cite only lines listed here for BDL-seeded markets.");
  return lines.join("\n");
}

/**
 * @param {{ byMarketType?: Record<string, Record<string, unknown>>, lastUpdated?: number }} payload
 */
export function summarizeBdlFuturesSeed(payload) {
  const byMarketType = payload?.byMarketType || payload?.futures?.byMarketType || {};
  /** @type {Record<string, number>} */
  const teamCounts = {};
  for (const [marketType, teams] of Object.entries(byMarketType)) {
    teamCounts[marketType] = Object.keys(teams || {}).length;
  }
  return {
    lastUpdated: payload?.lastUpdated ?? null,
    seededAt: payload?.seededAt ?? payload?.lastUpdated ?? null,
    source: payload?.source || "balldontlie_goat_seed",
    marketTeamCounts: teamCounts,
  };
}
