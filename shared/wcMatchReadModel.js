/**
 * UR Match Read — deterministic TNNS-style match insight (no LLM).
 * Uses only data paths already in production: Elo, devigged ML, sim vs BDL, ESPN chance index.
 */

import { WC_ADVANCEMENT_MARKET } from "./wcAdvancementMarket.js";
import {
  computeGroupPathComparisons,
  computeGroupMispriceRankings,
} from "./wcGroupMispriceRanking.js";
import {
  buildLiveMatchChanceQualityFromDetail,
  isWcLiveMatchStatus,
} from "./wcMatchChanceQuality.js";
import {
  devigWcMatchMoneylineProbs,
  eloMatchWinProbabilityBar,
  resolveMatchWinProbabilityBar,
} from "./wcMatchMoneylineProbs.js";
import { resolveWcXiStatus } from "./wcXiStatus.js";
import { isWcKnockoutFixtureMatch } from "./wcKnockoutFixture.js";
import { isKnockoutPhase } from "./wcPhaseUtils.js";

/**
 * @param {{ teamA: { abbr: string, winPct: number }, teamB: { abbr: string, winPct: number }, draw: number }} bar
 */
function pickMatchFavorite(bar) {
  if (!bar) return null;
  const home = Number(bar.teamA?.winPct) || 0;
  const away = Number(bar.teamB?.winPct) || 0;
  const draw = Number(bar.draw) || 0;
  if (draw >= home && draw >= away) {
    return { kind: "draw", abbr: "DRAW", pct: draw };
  }
  if (home >= away) {
    return { kind: "team", abbr: bar.teamA.abbr, pct: home, side: "home" };
  }
  return { kind: "team", abbr: bar.teamB.abbr, pct: away, side: "away" };
}

/**
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 * @param {Array<{ abbreviation: string, eloRating: number, isHost?: boolean }>} teams
 * @param {Record<string, unknown> | null | undefined} matchOdds
 * @param {boolean} [oddsStale]
 */
function buildModelVsMarketLean(homeAbbr, awayAbbr, teams, matchOdds, oddsStale = false) {
  const eloBar = eloMatchWinProbabilityBar(homeAbbr, awayAbbr, teams);
  if (!eloBar) return null;

  const market =
    !oddsStale && matchOdds ? devigWcMatchMoneylineProbs(matchOdds) : null;
  if (!market) {
    const fav = pickMatchFavorite(eloBar);
    return {
      headline: fav ? `Elo leans ${fav.abbr} (${fav.pct}%)` : null,
      subline: "Model win chance (Elo) — no fresh 1X2 market on file",
      eloBar,
      marketBar: null,
      modelEdgePts: null,
    };
  }

  const marketBar = {
    teamA: { abbr: homeAbbr, winPct: market.homePct },
    draw: market.drawPct,
    teamB: { abbr: awayAbbr, winPct: market.awayPct },
    sourceLabel: `Market (${market.bookLabel})`,
  };

  const homeDelta = eloBar.teamA.winPct - market.homePct;
  const awayDelta = eloBar.teamB.winPct - market.awayPct;
  const drawDelta = eloBar.draw - market.drawPct;

  let headline = null;
  let subline = `Elo vs ${market.bookLabel} — same 1X2 snapshot`;
  let modelEdgePts = null;
  let edgeAbbr = null;

  const candidates = [
    { abbr: homeAbbr, delta: homeDelta, pct: eloBar.teamA.winPct },
    { abbr: awayAbbr, delta: awayDelta, pct: eloBar.teamB.winPct },
  ].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const top = candidates[0];
  if (top && Math.abs(top.delta) >= 3) {
    const dir = top.delta > 0 ? "underpriced" : "overpriced";
    edgeAbbr = top.abbr;
    modelEdgePts = Math.round(Math.abs(top.delta));
    headline = `Elo: ${top.abbr} ${dir} vs market (${top.delta > 0 ? "+" : ""}${top.delta.toFixed(0)}pt)`;
  } else if (Math.abs(drawDelta) >= 4) {
    headline =
      drawDelta > 0
        ? `Elo sees more draw value than market (+${drawDelta.toFixed(0)}pt)`
        : `Market prices draw heavier than Elo (${(-drawDelta).toFixed(0)}pt)`;
    modelEdgePts = Math.round(Math.abs(drawDelta));
    edgeAbbr = "DRAW";
  } else {
    const fav = pickMatchFavorite(marketBar);
    headline = fav ? `Market favorite: ${fav.abbr} (${fav.pct}%)` : null;
    subline = "Elo and market broadly agree on this 1X2";
  }

  return { headline, subline, eloBar, marketBar, modelEdgePts, edgeAbbr };
}

/**
 * Best advancement misprice among teams in this fixture's group (home/away prioritized).
 * @param {string} groupLetter
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 * @param {{ teamStats?: Record<string, unknown>, bdlFutures?: { byMarketType?: Record<string, unknown>, lastUpdated?: number } } | null} mispriceContext
 */
function pickGroupEdgeForMatch(groupLetter, homeAbbr, awayAbbr, mispriceContext) {
  if (!mispriceContext?.teamStats || !mispriceContext?.bdlFutures?.byMarketType) {
    return null;
  }
  const letter = String(groupLetter || "").trim().toUpperCase();
  if (!letter) return null;

  const rows = computeGroupPathComparisons({
    groupLetter: letter,
    teamStats: mispriceContext.teamStats,
    bdlFutures: mispriceContext.bdlFutures,
  }).filter((r) => r.path === "advance from group" && r.delta != null && r.impliedPct != null);

  const fixtureAbbrs = new Set([homeAbbr, awayAbbr].map((a) => String(a || "").toUpperCase()));
  const inFixture = rows.filter((r) => fixtureAbbrs.has(r.teamAbbr));
  const pool = inFixture.length ? inFixture : rows;
  const best = pool.sort((a, b) => Math.abs(Number(b.delta) || 0) - Math.abs(Number(a.delta) || 0))[0];
  if (!best || Math.abs(Number(best.delta) || 0) < 2) return null;

  const sign = Number(best.delta) >= 0 ? "+" : "";
  return {
    teamAbbr: best.teamAbbr,
    simPct: best.simPct,
    impliedPct: best.impliedPct,
    delta: best.delta,
    label: `Group ${letter}: ${best.teamAbbr} advance ${sign}${Number(best.delta).toFixed(1)}pt vs market`,
    detail: `UR sim ${best.simPct.toFixed(0)}% · market ${best.impliedPct.toFixed(0)}%`,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} payload
 */
function formatLiveMomentum(payload) {
  if (!payload?.team) return null;
  const home = payload.team.home;
  const away = payload.team.away;
  const homeIdx = home?.chanceIndex;
  const awayIdx = away?.chanceIndex;
  if (homeIdx == null && awayIdx == null) return null;

  const homeAbbr = payload.homeTeam || "HOME";
  const awayAbbr = payload.awayTeam || "AWAY";
  const h = Number(homeIdx) || 0;
  const a = Number(awayIdx) || 0;
  const total = h + a || 1;

  let headline = null;
  if (h > a * 1.15) {
    headline = `${homeAbbr} creating more right now`;
  } else if (a > h * 1.15) {
    headline = `${awayAbbr} creating more right now`;
  } else {
    headline = "Chance index tight — neither side dominant";
  }

  const players = (payload.players || []).slice(0, 3).map((p) => ({
    name: String(p.name || "").trim(),
    abbr: p.nationAbbr,
    index: p.chanceIndex,
    goals: p.goals || 0,
    shotsOnTarget: p.shotsOnTarget || 0,
  }));

  return {
    headline,
    subline: payload.sourceLabel || "Live chance index (ESPN-derived — not Opta xG)",
    home: { abbr: homeAbbr, index: homeIdx, sharePct: Math.round((h / total) * 100) },
    away: { abbr: awayAbbr, index: awayIdx, sharePct: Math.round((a / total) * 100) },
    players,
  };
}

/**
 * @param {{
 *   match: Record<string, unknown>,
 *   teams?: Array<Record<string, unknown>>,
 *   detail?: Record<string, unknown> | null,
 *   mispriceContext?: { teamStats?: Record<string, unknown>, bdlFutures?: { byMarketType?: Record<string, unknown>, lastUpdated?: number } } | null,
 *   tournamentPhase?: string,
 *   allMatches?: Array<Record<string, unknown>>,
 * }} input
 */
export function buildWcMatchReadDisplay(input) {
  const match = input?.match;
  const teams = Array.isArray(input?.teams) ? input.teams : [];
  if (!match || !teams.length) return null;

  const homeAbbr = String(match.homeTeam || "").trim().toUpperCase();
  const awayAbbr = String(match.awayTeam || "").trim().toUpperCase();
  if (!homeAbbr || !awayAbbr) return null;

  const status = String(match.status || "").toLowerCase();
  const live = isWcLiveMatchStatus(status);
  const finished = status === "ft" || status === "finished" || status === "complete";
  const detail = input?.detail && typeof input.detail === "object" ? input.detail : null;
  const intelRow = detail || match;

  const xiStatus = resolveWcXiStatus(intelRow);
  const winBar = resolveMatchWinProbabilityBar({
    homeAbbr,
    awayAbbr,
    teams,
    matchOdds: match?.odds,
    oddsStale: match?.oddsStale === true,
  });

  if (live) {
    const livePayload = buildLiveMatchChanceQualityFromDetail({
      ...intelRow,
      homeTeam: homeAbbr,
      awayTeam: awayAbbr,
      status: intelRow.status || "live",
    });
    const momentum = formatLiveMomentum(livePayload);
    if (!momentum && !winBar) return null;
    return {
      mode: "live",
      badge: "LIVE MATCH READ",
      headline: momentum?.headline || "Live — stats updating",
      subline: momentum?.subline || null,
      winBar,
      momentum,
      groupEdge: null,
      modelLean: null,
      xiStatus,
      askPrompt: `Best live angle on ${homeAbbr} vs ${awayAbbr} right now?`,
    };
  }

  if (finished) {
    const modelLean = buildModelVsMarketLean(homeAbbr, awayAbbr, teams, match?.odds, match?.oddsStale);
    return {
      mode: "post",
      badge: "FINAL MATCH READ",
      headline:
        match.homeScore != null && match.awayScore != null
          ? `Final: ${homeAbbr} ${match.homeScore}–${match.awayScore} ${awayAbbr}`
          : "Full time",
      subline: modelLean?.headline || winBar?.sourceLabel || null,
      winBar,
      momentum: null,
      groupEdge: null,
      modelLean,
      xiStatus,
      askPrompt: `How did chance quality look in ${homeAbbr} vs ${awayAbbr}?`,
    };
  }

  const modelLean = buildModelVsMarketLean(homeAbbr, awayAbbr, teams, match?.odds, match?.oddsStale);
  const knockoutScope = {
    tournamentPhase: input?.tournamentPhase,
    allMatches: input?.allMatches,
  };
  const groupEdge = isWcKnockoutFixtureMatch(match, knockoutScope)
    ? null
    : pickGroupEdgeForMatch(match.group, homeAbbr, awayAbbr, input?.mispriceContext);

  let headline = modelLean?.headline || null;
  if (!headline && winBar) {
    const fav = pickMatchFavorite(winBar);
    headline = fav ? `UR read: ${fav.abbr} (${fav.pct}%)` : null;
  }

  if (!headline && !groupEdge && !winBar) return null;

  return {
    mode: "pre",
    badge: "MATCH READ",
    headline,
    subline: modelLean?.subline || winBar?.sourceLabel || null,
    winBar,
    momentum: null,
    groupEdge,
    modelLean,
    xiStatus,
    askPrompt: `Best bet on ${homeAbbr} vs ${awayAbbr} if I only know the moneyline?`,
  };
}

/**
 * Tournament-wide top misprice rows for "Today's edges" strip (deterministic).
 * @param {{ teamStats?: Record<string, unknown>, bdlFutures?: { byMarketType?: Record<string, unknown>, lastUpdated?: number } } | null} mispriceContext
 * @param {number} [topN]
 * @param {string} [tournamentPhase]
 */
export function buildWcTournamentEdgeStrip(mispriceContext, topN = 3, tournamentPhase = "") {
  if (isKnockoutPhase(tournamentPhase)) return [];
  if (!mispriceContext?.teamStats || !mispriceContext?.bdlFutures?.byMarketType) {
    return [];
  }
  const ranked = computeGroupMispriceRankings({
    teamStats: mispriceContext.teamStats,
    bdlFutures: mispriceContext.bdlFutures,
    question: "",
    overrideMarket: WC_ADVANCEMENT_MARKET.GROUP_ESCAPE,
    topN,
  });
  return ranked.map((row) => {
    const sign = row.delta >= 0 ? "+" : "";
    return {
      group: row.group,
      teamAbbr: row.teamAbbr,
      delta: row.delta,
      simPct: row.simPct,
      impliedPct: row.impliedPct,
      label: `Group ${row.group} · ${row.teamAbbr} advance ${sign}${row.delta.toFixed(1)}pt`,
      detail: `Sim ${row.simPct.toFixed(0)}% vs market ${row.impliedPct.toFixed(0)}%`,
    };
  });
}
