/**
 * World Cup match 1X2 win % — BDL moneylines (devigged) with Elo fallback only.
 * Never invent prices: parse feed American odds → implied → normalize to 100%.
 */

import {
  impliedProbFromAmerican,
  parseAmericanOddsNumber,
} from "./wcGoldenBootConsensus.js";
import {
  applyHostAdvantage,
  eloWinProbability,
  inferWcVenueNation,
} from "../src/data/wc2026WinProbability.js";
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import {
  alignWcMatchOddsToSlateTeams,
  validateWcMoneylinePublicationGuard,
} from "./wcMatchOddsAlignment.js";

/** @typedef {"bdl_market" | "elo_model"} WcMatchWinProbSource */

const BOOK_LABELS = {
  draftkings: "DraftKings",
  fanduel: "FanDuel",
  betmgm: "BetMGM",
  caesars: "Caesars",
};

/**
 * @param {unknown} side
 */
export function readWcMatchMoneylineAmerican(side) {
  if (side == null) return null;
  if (typeof side === "string" || typeof side === "number") {
    const raw = String(side).trim();
    return raw || null;
  }
  if (typeof side === "object" && side.moneyline != null) {
    const raw = String(side.moneyline).trim();
    return raw || null;
  }
  return null;
}

/**
 * @param {number[]} shares — fractions that should sum to ~1
 * @returns {number[]}
 */
export function roundProbSharesToPct(shares) {
  const list = shares.filter((s) => Number.isFinite(s) && s > 0);
  if (!list.length) return [];

  const scaled = list.map((s) => s * 100);
  const floors = scaled.map((s) => Math.floor(s));
  const fracs = scaled.map((s, i) => ({ i, frac: s - floors[i] }));
  let total = floors.reduce((n, x) => n + x, 0);
  fracs.sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  let j = 0;
  while (total < 100 && fracs.length) {
    out[fracs[j % fracs.length].i] += 1;
    total += 1;
    j += 1;
  }
  return out;
}

/**
 * Devig 1X2 moneylines to win/draw/loss percentages.
 * Requires home + away + draw American prices (soccer 3-way).
 * @param {{ home?: unknown, draw?: unknown, away?: unknown, provider?: string }} matchOdds
 */
export function devigWcMatchMoneylineProbs(matchOdds) {
  if (!matchOdds || typeof matchOdds !== "object") return null;

  const homeAm = readWcMatchMoneylineAmerican(matchOdds.home);
  const drawAm = readWcMatchMoneylineAmerican(matchOdds.draw);
  const awayAm = readWcMatchMoneylineAmerican(matchOdds.away);

  if (!homeAm || !drawAm || !awayAm) return null;

  const homeN = parseAmericanOddsNumber(homeAm);
  const drawN = parseAmericanOddsNumber(drawAm);
  const awayN = parseAmericanOddsNumber(awayAm);
  if (homeN == null || drawN == null || awayN == null) return null;

  const homeRaw = impliedProbFromAmerican(homeN);
  const drawRaw = impliedProbFromAmerican(drawN);
  const awayRaw = impliedProbFromAmerican(awayN);
  if (homeRaw == null || drawRaw == null || awayRaw == null) return null;

  const overround = homeRaw + drawRaw + awayRaw;
  if (!Number.isFinite(overround) || overround < 0.9 || overround > 1.35) return null;

  const [homePct, drawPct, awayPct] = roundProbSharesToPct([
    homeRaw / overround,
    drawRaw / overround,
    awayRaw / overround,
  ]);
  if (homePct + drawPct + awayPct !== 100) return null;

  const vendor = String(matchOdds.provider || "").trim().toLowerCase();
  const bookLabel = BOOK_LABELS[vendor] || (vendor ? vendor.replace(/_/g, " ") : "Market");

  return {
    homePct,
    drawPct,
    awayPct,
    provider: vendor || null,
    bookLabel,
    moneylines: { home: homeAm, draw: drawAm, away: awayAm },
  };
}

/**
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 * @param {Array<{ abbreviation: string, eloRating: number, isHost?: boolean }>} teamsData
 * @param {string | null | undefined} [venueNation]
 */
export function eloMatchWinProbabilityBar(homeAbbr, awayAbbr, teamsData, venueNation = null) {
  const a = (teamsData || []).find((t) => t.abbreviation === homeAbbr);
  const b = (teamsData || []).find((t) => t.abbreviation === awayAbbr);
  if (!a || !b) return null;
  const eloA = applyHostAdvantage(a.eloRating, a.isHost, venueNation);
  const eloB = applyHostAdvantage(b.eloRating, b.isHost, venueNation);
  const probs = eloWinProbability(eloA, eloB);
  return {
    teamA: { abbr: homeAbbr, winPct: probs.win },
    draw: probs.draw,
    teamB: { abbr: awayAbbr, winPct: probs.loss },
    source: /** @type {const} */ ("elo_model"),
    sourceLabel: "Model win chance (Elo)",
  };
}

/**
 * Match card / drawer win bar — BDL market when fresh + complete 1X2, else Elo.
 * @param {{
 *   homeAbbr: string,
 *   awayAbbr: string,
 *   teams?: Array<{ abbreviation: string, eloRating: number, isHost?: boolean }>,
 *   matchOdds?: Record<string, unknown> | null,
 *   oddsStale?: boolean,
 *   venueNation?: string | null,
 *   match?: { city?: string, stadium?: string } | null,
 * }} input
 */
export function resolveMatchWinProbabilityBar(input) {
  const homeAbbr = String(input?.homeAbbr || "").trim();
  const awayAbbr = String(input?.awayAbbr || "").trim();
  const teams = input?.teams || [];
  if (!homeAbbr || !awayAbbr || !teams.length) return null;

  const venueNation =
    input?.venueNation ??
    inferWcVenueNation(input?.match?.city, input?.match?.stadium);

  if (!input?.oddsStale && input?.matchOdds) {
    const aligned = alignWcMatchOddsToSlateTeams(input.matchOdds, homeAbbr, awayAbbr, {
      oddsAnchorHome: input?.match?.bdlOddsAnchorHome,
      oddsAnchorAway: input?.match?.bdlOddsAnchorAway,
      teams,
      venueNation,
    });
    const market = devigWcMatchMoneylineProbs(aligned);
    if (market) {
      return {
        teamA: { abbr: homeAbbr, winPct: market.homePct },
        draw: market.drawPct,
        teamB: { abbr: awayAbbr, winPct: market.awayPct },
        source: /** @type {const} */ ("bdl_market"),
        sourceLabel: `Market win chance (${market.bookLabel})`,
        moneylines: market.moneylines,
      };
    }
  }

  return eloMatchWinProbabilityBar(homeAbbr, awayAbbr, teams, venueNation);
}

/**
 * @deprecated Prefer alignWcMatchOddsToSlateTeams — kept for callers still on this name.
 */
export function reconcileWcMatchOddsHomeAway(
  matchOdds,
  homeAbbr,
  awayAbbr,
  teams = WC_2026_TEAMS,
  opts = {},
) {
  return alignWcMatchOddsToSlateTeams(matchOdds, homeAbbr, awayAbbr, {
    ...opts,
    teams,
    oddsAnchorHome: opts.oddsAnchorHome || opts.bdlOddsAnchorHome,
    oddsAnchorAway: opts.oddsAnchorAway || opts.bdlOddsAnchorAway,
  });
}

export { alignWcMatchOddsToSlateTeams, validateWcMoneylinePublicationGuard } from "./wcMatchOddsAlignment.js";

/**
 * Book favorite after BDL team alignment — use for prebuilt ML headlines and checkpoint copy.
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 * @param {Record<string, unknown> | null | undefined} matchOdds
 * @param {Array<{ abbreviation: string, eloRating: number, isHost?: boolean }>} [teams]
 * @param {{
 *   oddsAnchorHome?: string,
 *   oddsAnchorAway?: string,
 *   bdlOddsAnchorHome?: string,
 *   bdlOddsAnchorAway?: string,
 *   venueNation?: string | null,
 *   match?: { city?: string, stadium?: string } | null,
 * }} [opts]
 */
export function pickWcBookFavorite(homeAbbr, awayAbbr, matchOdds, teams = WC_2026_TEAMS, opts = {}) {
  const venueNation =
    opts.venueNation ?? inferWcVenueNation(opts.match?.city, opts.match?.stadium);
  const odds = alignWcMatchOddsToSlateTeams(matchOdds, homeAbbr, awayAbbr, {
    teams,
    venueNation,
    oddsAnchorHome: opts.oddsAnchorHome || opts.bdlOddsAnchorHome || opts.match?.bdlOddsAnchorHome,
    oddsAnchorAway: opts.oddsAnchorAway || opts.bdlOddsAnchorAway || opts.match?.bdlOddsAnchorAway,
  });
  const home = String(homeAbbr || "").trim().toUpperCase();
  const away = String(awayAbbr || "").trim().toUpperCase();
  const homeMl = readWcMatchMoneylineAmerican(odds?.home);
  const awayMl = readWcMatchMoneylineAmerican(odds?.away);
  if (!homeMl || !awayMl) {
    return { abbr: home, odds: homeMl || awayMl, matchOdds: odds };
  }

  const homeN = parseAmericanOddsNumber(homeMl);
  const awayN = parseAmericanOddsNumber(awayMl);
  if (homeN == null || awayN == null) {
    return { abbr: home, odds: homeMl, matchOdds: odds };
  }

  const homeImp = impliedProbFromAmerican(homeN) ?? 0;
  const awayImp = impliedProbFromAmerican(awayN) ?? 0;
  return homeImp >= awayImp
    ? { abbr: home, odds: homeMl, matchOdds: odds }
    : { abbr: away, odds: awayMl, matchOdds: odds };
}
