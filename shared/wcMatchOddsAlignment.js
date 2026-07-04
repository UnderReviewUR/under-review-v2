/**
 * BDL / slate moneyline alignment — deterministic team-identity first, Elo sanity second.
 * Prevents inverted home/away prices (e.g. "Paraguay -550" when France is the book favorite).
 */

import {
  impliedProbFromAmerican,
  parseAmericanOddsNumber,
} from "./wcGoldenBootConsensus.js";
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import {
  eloWinProbability,
  applyHostAdvantage,
} from "../src/data/wc2026WinProbability.js";

function readMlSide(side) {
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

function normAbbr(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function pairKey(a, b) {
  const x = normAbbr(a);
  const y = normAbbr(b);
  return x && y ? [x, y].sort().join("|") : "";
}

/**
 * Swap every home/away-priced field on a match odds object.
 * @param {Record<string, unknown> | null | undefined} matchOdds
 */
export function swapWcMatchOddsHomeAway(matchOdds) {
  if (!matchOdds || typeof matchOdds !== "object") return matchOdds;

  const homeMl = readMlSide(matchOdds.home);
  const awayMl = readMlSide(matchOdds.away);
  const toAdvanceHome = readMlSide(matchOdds.toAdvanceHome);
  const toAdvanceAway = readMlSide(matchOdds.toAdvanceAway);
  const drawNoBet =
    matchOdds.drawNoBet && typeof matchOdds.drawNoBet === "object" ? matchOdds.drawNoBet : null;

  return {
    ...matchOdds,
    home: awayMl ? { moneyline: awayMl } : matchOdds.home,
    away: homeMl ? { moneyline: homeMl } : matchOdds.away,
    toAdvanceHome: toAdvanceAway ? { moneyline: toAdvanceAway } : matchOdds.toAdvanceHome,
    toAdvanceAway: toAdvanceHome ? { moneyline: toAdvanceHome } : matchOdds.toAdvanceAway,
    spreadHome: matchOdds.spreadAway ?? matchOdds.spreadHome,
    spreadAway: matchOdds.spreadHome ?? matchOdds.spreadAway,
    spreadHomeLine:
      matchOdds.spreadAway != null
        ? matchOdds.spreadHomeLine ?? matchOdds.spreadAwayLine
        : matchOdds.spreadHomeLine,
    drawNoBet: drawNoBet
      ? { home: drawNoBet.away ?? drawNoBet.home, away: drawNoBet.home ?? drawNoBet.away }
      : matchOdds.drawNoBet,
    doubleChance:
      matchOdds.doubleChance && typeof matchOdds.doubleChance === "object"
        ? {
            homeOrDraw: matchOdds.doubleChance.awayOrDraw ?? matchOdds.doubleChance.homeOrDraw,
            awayOrDraw: matchOdds.doubleChance.homeOrDraw ?? matchOdds.doubleChance.awayOrDraw,
            homeOrAway: matchOdds.doubleChance.homeOrAway,
          }
        : matchOdds.doubleChance,
  };
}

/**
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 * @param {Array<{ abbreviation: string, eloRating: number, isHost?: boolean }>} teams
 * @param {string | null | undefined} [venueNation]
 */
export function eloMatchWinProbabilityBarNeutral(homeAbbr, awayAbbr, teams, venueNation = null) {
  const home = normAbbr(homeAbbr);
  const away = normAbbr(awayAbbr);
  const a = (teams || []).find((t) => t.abbreviation === home);
  const b = (teams || []).find((t) => t.abbreviation === away);
  if (!a || !b) return null;
  const eloA = applyHostAdvantage(a.eloRating, a.isHost, venueNation);
  const eloB = applyHostAdvantage(b.eloRating, b.isHost, venueNation);
  const probs = eloWinProbability(eloA, eloB);
  return {
    teamA: { abbr: home, winPct: probs.win },
    draw: probs.draw,
    teamB: { abbr: away, winPct: probs.loss },
  };
}

/**
 * True when book favorite side disagrees sharply with neutral Elo (likely home/away inversion).
 * @param {Record<string, unknown>} matchOdds
 * @param {string} slateHome
 * @param {string} slateAway
 * @param {Array<{ abbreviation: string, eloRating: number, isHost?: boolean }>} [teams]
 */
export function detectWcMoneylineHomeAwayInversionByElo(
  matchOdds,
  slateHome,
  slateAway,
  teams = WC_2026_TEAMS,
) {
  const home = normAbbr(slateHome);
  const away = normAbbr(slateAway);
  if (!home || !away) return false;

  const homeMl = readMlSide(matchOdds?.home);
  const awayMl = readMlSide(matchOdds?.away);
  if (!homeMl || !awayMl) return false;

  const homeN = parseAmericanOddsNumber(homeMl);
  const awayN = parseAmericanOddsNumber(awayMl);
  if (homeN == null || awayN == null) return false;

  const bar = eloMatchWinProbabilityBarNeutral(home, away, teams);
  if (!bar) return false;

  const homeImp = impliedProbFromAmerican(homeN) ?? 0;
  const awayImp = impliedProbFromAmerican(awayN) ?? 0;
  const bookFavIsHome = homeImp >= awayImp;
  const bookFavElo = bookFavIsHome ? bar.teamA.winPct : bar.teamB.winPct;
  const bookDogElo = bookFavIsHome ? bar.teamB.winPct : bar.teamA.winPct;

  return bookFavElo < 35 && bookDogElo >= 45;
}

/**
 * Align BDL odds (anchored to BDL match home_team) onto the slate's homeTeam/awayTeam.
 * @param {Record<string, unknown> | null | undefined} matchOdds
 * @param {string} slateHome
 * @param {string} slateAway
 * @param {{
 *   oddsAnchorHome?: string,
 *   oddsAnchorAway?: string,
 *   bdlOddsAnchorHome?: string,
 *   bdlOddsAnchorAway?: string,
 *   teams?: Array<{ abbreviation: string, eloRating: number, isHost?: boolean }>,
 *   venueNation?: string | null,
 * }} [opts]
 */
export function alignWcMatchOddsToSlateTeams(matchOdds, slateHome, slateAway, opts = {}) {
  if (!matchOdds || typeof matchOdds !== "object") return matchOdds;

  const home = normAbbr(slateHome);
  const away = normAbbr(slateAway);
  if (!home || !away) return matchOdds;

  const anchorHome = normAbbr(opts.oddsAnchorHome || opts.bdlOddsAnchorHome);
  const anchorAway = normAbbr(opts.oddsAnchorAway || opts.bdlOddsAnchorAway);
  const teams = opts.teams || WC_2026_TEAMS;

  let aligned = { ...matchOdds };
  let anchorSwapped = false;

  if (anchorHome && anchorAway) {
    const slatePair = pairKey(home, away);
    const anchorPair = pairKey(anchorHome, anchorAway);
    if (slatePair && anchorPair && slatePair === anchorPair && home !== anchorHome) {
      aligned = swapWcMatchOddsHomeAway(aligned);
      anchorSwapped = true;
      aligned.oddsAlignedToSlate = "bdl_anchor_swap";
    }
  }

  const sanity = validateWcMoneylinePublicationGuard(home, away, aligned, teams, opts.venueNation);
  if (!sanity.ok && !anchorSwapped && detectWcMoneylineHomeAwayInversionByElo(aligned, home, away, teams)) {
    aligned = swapWcMatchOddsHomeAway(aligned);
    aligned.oddsAlignedToSlate = "elo_inversion_swap";
  }

  return aligned;
}

/**
 * Fail-closed guard before publishing ML headlines — block implausible favorite labels.
 * @param {string} slateHome
 * @param {string} slateAway
 * @param {Record<string, unknown> | null | undefined} matchOdds
 * @param {Array<{ abbreviation: string, eloRating: number, isHost?: boolean }>} [teams]
 * @param {string | null | undefined} [venueNation]
 */
export function validateWcMoneylinePublicationGuard(
  slateHome,
  slateAway,
  matchOdds,
  teams = WC_2026_TEAMS,
  venueNation = null,
) {
  const home = normAbbr(slateHome);
  const away = normAbbr(slateAway);
  const homeMl = readMlSide(matchOdds?.home);
  const awayMl = readMlSide(matchOdds?.away);

  if (!home || !away || !homeMl || !awayMl) {
    return { ok: true, reason: null, favoriteAbbr: home || null, favoriteOdds: homeMl || awayMl };
  }

  const homeN = parseAmericanOddsNumber(homeMl);
  const awayN = parseAmericanOddsNumber(awayMl);
  if (homeN == null || awayN == null) {
    return { ok: true, reason: null, favoriteAbbr: home, favoriteOdds: homeMl };
  }

  const homeImp = impliedProbFromAmerican(homeN) ?? 0;
  const awayImp = impliedProbFromAmerican(awayN) ?? 0;
  const favIsHome = homeImp >= awayImp;
  const favoriteAbbr = favIsHome ? home : away;
  const favoriteOdds = favIsHome ? homeMl : awayMl;
  const favoriteImp = Math.max(homeImp, awayImp);

  const bar = eloMatchWinProbabilityBarNeutral(home, away, teams, venueNation);
  if (!bar) {
    return { ok: true, reason: null, favoriteAbbr, favoriteOdds };
  }

  const favEloPct =
    favoriteAbbr === home ? bar.teamA.winPct : bar.teamB.winPct;

  if (favoriteImp >= 0.62 && favEloPct < 30) {
    return {
      ok: false,
      reason: "favorite_price_elo_mismatch",
      favoriteAbbr,
      favoriteOdds,
      favoriteImp,
      favEloPct,
    };
  }

  return { ok: true, reason: null, favoriteAbbr, favoriteOdds, favoriteImp, favEloPct };
}

/** ESPN WC event ids are 6+ digits — never treat them as BDL match ids for odds attach. */
export function looksLikeWcEspnEventIdForOdds(eventId) {
  const idStr = String(eventId ?? "").trim();
  return /^\d{6,}$/.test(idStr);
}

/**
 * @param {Record<string, unknown> | null | undefined} match
 */
export function resolveBdlMatchIdForOddsAttach(match) {
  if (match?.bdlMatchId != null && Number.isFinite(Number(match.bdlMatchId))) {
    return Number(match.bdlMatchId);
  }
  const idStr = String(match?.id ?? "").trim();
  if (!idStr || looksLikeWcEspnEventIdForOdds(idStr)) return null;
  if (/^\d+$/.test(idStr) && Number.isFinite(Number(idStr))) return Number(idStr);
  return null;
}
