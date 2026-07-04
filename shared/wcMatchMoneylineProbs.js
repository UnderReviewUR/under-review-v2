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
} from "../src/data/wc2026WinProbability.js";
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";

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
 */
export function eloMatchWinProbabilityBar(homeAbbr, awayAbbr, teamsData) {
  const a = (teamsData || []).find((t) => t.abbreviation === homeAbbr);
  const b = (teamsData || []).find((t) => t.abbreviation === awayAbbr);
  if (!a || !b) return null;
  const eloA = applyHostAdvantage(a.eloRating, a.isHost);
  const eloB = applyHostAdvantage(b.eloRating, b.isHost);
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
 * }} input
 */
export function resolveMatchWinProbabilityBar(input) {
  const homeAbbr = String(input?.homeAbbr || "").trim();
  const awayAbbr = String(input?.awayAbbr || "").trim();
  const teams = input?.teams || [];
  if (!homeAbbr || !awayAbbr || !teams.length) return null;

  if (!input?.oddsStale && input?.matchOdds) {
    const reconciled = reconcileWcMatchOddsHomeAway(input.matchOdds, homeAbbr, awayAbbr, teams);
    const market = devigWcMatchMoneylineProbs(reconciled);
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

  return eloMatchWinProbabilityBar(homeAbbr, awayAbbr, teams);
}

/**
 * When book ML sides disagree sharply with Elo (home/away attach inversion), swap home/away prices.
 * @param {Record<string, unknown> | null | undefined} matchOdds
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 * @param {Array<{ abbreviation: string, eloRating: number, isHost?: boolean }>} [teams]
 */
export function reconcileWcMatchOddsHomeAway(
  matchOdds,
  homeAbbr,
  awayAbbr,
  teams = WC_2026_TEAMS,
) {
  if (!matchOdds || typeof matchOdds !== "object") return matchOdds;
  const home = String(homeAbbr || "").trim().toUpperCase();
  const away = String(awayAbbr || "").trim().toUpperCase();
  if (!home || !away) return matchOdds;

  const homeMl = readWcMatchMoneylineAmerican(matchOdds.home);
  const awayMl = readWcMatchMoneylineAmerican(matchOdds.away);
  if (!homeMl || !awayMl) return matchOdds;

  const bar = eloMatchWinProbabilityBar(home, away, teams);
  if (!bar) return matchOdds;

  const homeN = parseAmericanOddsNumber(homeMl);
  const awayN = parseAmericanOddsNumber(awayMl);
  if (homeN == null || awayN == null) return matchOdds;

  const homeImp = impliedProbFromAmerican(homeN) ?? 0;
  const awayImp = impliedProbFromAmerican(awayN) ?? 0;
  const bookFavIsHome = homeImp >= awayImp;
  const bookFavElo = bookFavIsHome ? bar.teamA.winPct : bar.teamB.winPct;
  const bookDogElo = bookFavIsHome ? bar.teamB.winPct : bar.teamA.winPct;

  if (bookFavElo >= 35 || bookDogElo < 45) return matchOdds;

  const toAdvanceHome = readWcMatchMoneylineAmerican(matchOdds.toAdvanceHome);
  const toAdvanceAway = readWcMatchMoneylineAmerican(matchOdds.toAdvanceAway);
  const drawNoBet =
    matchOdds.drawNoBet && typeof matchOdds.drawNoBet === "object" ? matchOdds.drawNoBet : null;

  return {
    ...matchOdds,
    home: { moneyline: awayMl },
    away: { moneyline: homeMl },
    toAdvanceHome: toAdvanceAway ? { moneyline: toAdvanceAway } : matchOdds.toAdvanceHome,
    toAdvanceAway: toAdvanceHome ? { moneyline: toAdvanceHome } : matchOdds.toAdvanceAway,
    spreadHome: matchOdds.spreadAway ?? matchOdds.spreadHome,
    spreadAway: matchOdds.spreadHome ?? matchOdds.spreadAway,
    drawNoBet: drawNoBet
      ? { home: drawNoBet.away ?? drawNoBet.home, away: drawNoBet.home ?? drawNoBet.away }
      : matchOdds.drawNoBet,
    oddsHomeAwayReconciled: true,
  };
}

/**
 * Book favorite after Elo reconciliation — use for prebuilt ML headlines and checkpoint copy.
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 * @param {Record<string, unknown> | null | undefined} matchOdds
 * @param {Array<{ abbreviation: string, eloRating: number, isHost?: boolean }>} [teams]
 */
export function pickWcBookFavorite(homeAbbr, awayAbbr, matchOdds, teams = WC_2026_TEAMS) {
  const odds = reconcileWcMatchOddsHomeAway(matchOdds, homeAbbr, awayAbbr, teams);
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
