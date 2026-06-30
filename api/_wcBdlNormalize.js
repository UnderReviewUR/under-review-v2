/**
 * BallDontLie FIFA → Under Review internal shapes.
 *
 * Player props contract (GOAT): rows are player_id-only — join via /players or /rosters.
 * @see https://fifa.balldontlie.io/#player-props
 * @see https://www.balldontlie.io/openapi/fifa.yml
 */

import { normalizeEspnAbbr } from "./_wcEspn.js";
import { groupLetterForAbbr } from "./_wcEspn.js";
import { createEmptyMatchPlayerPropMarkets } from "../shared/wcMatchPlayerProps.js";
import { buildBdlGoatMatchIntel } from "../shared/wcBdlMatchIntel.js";
import {
  formatWcMatchFieldText,
  formatWcMatchGroupLetter,
} from "../shared/wcMatchFieldDisplay.js";
import { wcMatchEtDateYmd } from "../shared/wcKickoffDisplay.js";

/** BDL prop_type → internal match-player market key (see BDL docs for full enum). */
export const BDL_PROP_TO_MARKET = {
  anytime_goal: "anytime_scorer",
  first_goal: "first_goalscorer",
  last_goal: "last_goalscorer",
  goal_or_assist: "player_goal_or_assist",
  assists: "player_assists_ou",
  shots: "player_shots_ou",
  shots_on_target: "player_sot_ou",
  card: "player_card",
  red_card: "player_red_card",
  saves: "player_saves_ou",
  tackles: "player_tackles_ou",
  shot_each_half: "player_shots_each_half",
  shot_on_target_each_half: "player_sot_each_half",
};

/** Documented on BDL but not yet mapped to UR Take card markets. */
export const BDL_PROP_TYPES_NOT_YET_MAPPED = [];

const VENDOR_PRIORITY = ["draftkings", "fanduel", "betmgm", "caesars"];

function pickTeamAbbr(team) {
  if (!team || typeof team !== "object") return "";
  return normalizeEspnAbbr(
    team.abbreviation || team.abbr || team.country_code || team.code || team.name || "",
  );
}

export function normalizeBdlFifaStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "NS";
  if (["in_progress", "in progress", "live", "1h", "2h", "ht", "halftime"].includes(s)) {
    return s.includes("ht") || s.includes("half") ? "HT" : "live";
  }
  if (["completed", "finished", "final", "ft", "ended"].includes(s)) return "FT";
  if (["scheduled", "not started", "ns", "upcoming", "timed"].includes(s)) return "NS";
  if (s.includes("postpon")) return "POSTPONED";
  if (s.includes("cancel")) return "CANCELLED";
  return raw;
}

/**
 * @param {Record<string, unknown>} row — FIFAMatch
 * @param {number} [nowMs]
 */
export function normalizeBdlFifaMatchRow(row, nowMs = Date.now()) {
  if (!row || typeof row !== "object") return null;
  const homeTeam = pickTeamAbbr(row.home_team || row.homeTeam);
  const awayTeam = pickTeamAbbr(row.away_team || row.awayTeam);
  if (!homeTeam || !awayTeam) return null;

  const bdlMatchId = row.id != null ? Number(row.id) : null;
  const dateRaw = String(row.datetime || row.date || row.match_date || row.start_time || "");
  const commenceTs = Date.parse(dateRaw) || null;
  const etDate = wcMatchEtDateYmd(commenceTs) || dateRaw.slice(0, 10);
  const status = normalizeBdlFifaStatus(row.status || row.match_status || row.state);
  const isScored = status === "FT" || status === "live" || status === "HT";
  const homeScore = row.home_score ?? row.homeScore;
  const awayScore = row.away_score ?? row.awayScore;

  const groupLetter =
    formatWcMatchGroupLetter(row.group) ||
    formatWcMatchGroupLetter(row.group_name) ||
    groupLetterForAbbr(homeTeam) ||
    "";

  const stadium = row.stadium && typeof row.stadium === "object" ? row.stadium : null;

  return {
    id: bdlMatchId != null ? String(bdlMatchId) : `${homeTeam}-${awayTeam}-${dateRaw.slice(0, 10)}`,
    bdlMatchId,
    homeTeam,
    awayTeam,
    homeScore: isScored && homeScore != null ? Number(homeScore) : null,
    awayScore: isScored && awayScore != null ? Number(awayScore) : null,
    status,
    date: etDate,
    time:
      commenceTs != null
        ? new Date(commenceTs).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "America/New_York",
          }) + " ET"
        : "",
    stadium: formatWcMatchFieldText(stadium?.name || row.stadium || row.venue),
    city: formatWcMatchFieldText(stadium?.city || row.city),
    group: groupLetter,
    round: String(row.round_name || row.stage?.name || row.round || "").trim(),
    commenceTs,
    source: "balldontlie",
    oddsUpdatedAt: nowMs,
  };
}

/**
 * Link BDL slate rows to ESPN ids (preserve frontend event ids when possible).
 * @param {Array<Record<string, unknown>>} bdlMatches
 * @param {Array<Record<string, unknown>>} espnMatches
 */
export function linkBdlMatchesToEspn(bdlMatches, espnMatches) {
  /** @type {Map<string, Record<string, unknown>>} */
  const espnByKey = new Map();
  for (const m of espnMatches || []) {
    const key = `${m.homeTeam}-${m.awayTeam}-${m.date}`;
    espnByKey.set(key, m);
  }

  return (bdlMatches || []).map((bm) => {
    const key = `${bm.homeTeam}-${bm.awayTeam}-${bm.date}`;
    const espn = espnByKey.get(key);
    if (!espn) return bm;
    return {
      ...bm,
      id: String(espn.id),
      espnEventId: String(espn.id),
      bdlMatchId: bm.bdlMatchId,
      odds: bm.odds || espn.odds,
    };
  });
}

function impliedProbFromAmerican(am) {
  const v = Number(am);
  if (!Number.isFinite(v)) return null;
  if (v > 0) return 100 / (v + 100);
  return -v / (-v + 100);
}

/** BDL may nest knockout to-advance prices in markets[] (not always present). */
export function pickBdlNestedToAdvanceOdds(markets) {
  if (!Array.isArray(markets) || !markets.length) return null;

  for (const market of markets) {
    const name = String(market?.name || market?.key || "").toLowerCase();
    if (!/\b(to advance|advance to|team to advance|winner advances)\b/i.test(name)) continue;
    if (/group|tournament winner|outright/.test(name)) continue;

    const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
    const home = outcomes.find((o) => o?.type === "home");
    const away = outcomes.find((o) => o?.type === "away");
    if (home?.american_odds == null && away?.american_odds == null) continue;

    return {
      home: home?.american_odds != null ? formatAm(home.american_odds) : null,
      away: away?.american_odds != null ? formatAm(away.american_odds) : null,
    };
  }

  return null;
}

/** BDL nests match O/U in markets[] when top-level total_value is null (common on DK/FD). */
export function pickMainNestedMatchTotal(markets) {
  if (!Array.isArray(markets) || !markets.length) return null;

  /** @type {Array<{ line: string, over: number, under: number }>} */
  const candidates = [];
  for (const market of markets) {
    if (market?.type !== "total") continue;
    if (market?.period !== "match" || market?.scope !== "match") continue;
    const line = market?.line_value;
    if (line == null || String(line).trim() === "") continue;

    const name = String(market?.name || market?.key || "").toLowerCase();
    if (!name.includes("over/under")) continue;
    if (/band|1st half|first half|team|moneyline|half time/.test(name)) continue;

    const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
    const over = outcomes.find((o) => o?.type === "over");
    const under = outcomes.find((o) => o?.type === "under");
    if (over?.american_odds == null || under?.american_odds == null) continue;

    candidates.push({
      line: String(line),
      over: Number(over.american_odds),
      under: Number(under.american_odds),
    });
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const balA = Math.abs(
      (impliedProbFromAmerican(a.over) ?? 0.5) - (impliedProbFromAmerican(a.under) ?? 0.5),
    );
    const balB = Math.abs(
      (impliedProbFromAmerican(b.over) ?? 0.5) - (impliedProbFromAmerican(b.under) ?? 0.5),
    );
    return balA - balB;
  });

  const best = candidates[0];
  return {
    totalLine: best.line,
    totalOver: formatAm(best.over),
    totalUnder: formatAm(best.under),
  };
}

function isMatchPeriodMarket(market) {
  const period = String(market?.period || "").toLowerCase();
  const scope = String(market?.scope || "").toLowerCase();
  if (period && period !== "match") return false;
  if (scope && scope !== "match" && scope !== "both_teams") return false;
  return true;
}

/** BDL `both_teams_to_score` market → Yes/No prices (BTTS / GG). */
export function pickBdlNestedBtts(markets) {
  if (!Array.isArray(markets) || !markets.length) return null;
  for (const market of markets) {
    const type = String(market?.type || "").toLowerCase();
    const name = String(market?.name || market?.key || "").toLowerCase();
    const isBtts =
      type === "both_teams_to_score" || /both teams to score|btts|both to score/.test(name);
    if (!isBtts) continue;
    if (!isMatchPeriodMarket(market)) continue;

    const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
    const yes = outcomes.find(
      (o) => String(o?.type).toLowerCase() === "yes" || /^yes$/i.test(String(o?.name || "").trim()),
    );
    const no = outcomes.find(
      (o) => String(o?.type).toLowerCase() === "no" || /^no$/i.test(String(o?.name || "").trim()),
    );
    if (yes?.american_odds == null && no?.american_odds == null) continue;
    return {
      yes: yes?.american_odds != null ? formatAm(yes.american_odds) : null,
      no: no?.american_odds != null ? formatAm(no.american_odds) : null,
    };
  }
  return null;
}

/** BDL `draw_no_bet` market → home/away prices (stake refunded on a draw). */
export function pickBdlNestedDrawNoBet(markets) {
  if (!Array.isArray(markets) || !markets.length) return null;
  for (const market of markets) {
    const type = String(market?.type || "").toLowerCase();
    const name = String(market?.name || market?.key || "").toLowerCase();
    const isDnb = type === "draw_no_bet" || /draw no bet|\bdnb\b/.test(name);
    if (!isDnb) continue;
    if (!isMatchPeriodMarket(market)) continue;

    const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
    const home = outcomes.find(
      (o) => String(o?.type).toLowerCase() === "home" || String(o?.side).toLowerCase() === "home",
    );
    const away = outcomes.find(
      (o) => String(o?.type).toLowerCase() === "away" || String(o?.side).toLowerCase() === "away",
    );
    if (home?.american_odds == null && away?.american_odds == null) continue;
    return {
      home: home?.american_odds != null ? formatAm(home.american_odds) : null,
      away: away?.american_odds != null ? formatAm(away.american_odds) : null,
    };
  }
  return null;
}

/** BDL `double_chance` market → 1X (home/draw), X2 (away/draw), 12 (home/away). */
export function pickBdlNestedDoubleChance(markets) {
  if (!Array.isArray(markets) || !markets.length) return null;
  for (const market of markets) {
    const type = String(market?.type || "").toLowerCase();
    const name = String(market?.name || market?.key || "").toLowerCase();
    const isDc = type === "double_chance" || /double chance/.test(name);
    if (!isDc) continue;
    if (!isMatchPeriodMarket(market)) continue;

    const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
    let homeOrDraw = null;
    let awayOrDraw = null;
    let homeOrAway = null;
    for (const o of outcomes) {
      if (o?.american_odds == null) continue;
      const oName = String(o?.name || "").toLowerCase();
      const side = String(o?.side || "").toLowerCase();
      const hasDraw = /draw|tie/.test(oName);
      const price = formatAm(o.american_odds);
      if (!price) continue;
      if (hasDraw && side === "home") homeOrDraw = price;
      else if (hasDraw && side === "away") awayOrDraw = price;
      else if (!hasDraw) homeOrAway = price;
      else if (hasDraw && !homeOrDraw) homeOrDraw = price;
      else if (hasDraw) awayOrDraw = price;
    }
    if (!homeOrDraw && !awayOrDraw && !homeOrAway) continue;
    return { homeOrDraw, awayOrDraw, homeOrAway };
  }
  return null;
}

/** BDL `spread` (handicap) market → main home/away handicap line + prices. */
export function pickBdlNestedMatchSpread(markets) {
  if (!Array.isArray(markets) || !markets.length) return null;
  /** @type {Array<{ line: number, home: string | null, away: string | null }>} */
  const candidates = [];
  for (const market of markets) {
    const type = String(market?.type || "").toLowerCase();
    const name = String(market?.name || market?.key || "").toLowerCase();
    const isSpread = type === "spread" || /spread|handicap/.test(name);
    if (!isSpread) continue;
    if (!isMatchPeriodMarket(market)) continue;
    if (/team total|alt|1st half|first half|second half/.test(name)) continue;

    const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
    const home = outcomes.find(
      (o) => String(o?.type).toLowerCase() === "home" || String(o?.side).toLowerCase() === "home",
    );
    const away = outcomes.find(
      (o) => String(o?.type).toLowerCase() === "away" || String(o?.side).toLowerCase() === "away",
    );
    if (home?.american_odds == null && away?.american_odds == null) continue;
    const lineRaw =
      home?.handicap ?? home?.line_value ?? market?.line_value ?? away?.handicap ?? away?.line_value;
    const lineNum = Number.parseFloat(String(lineRaw));
    candidates.push({
      line: Number.isFinite(lineNum) ? lineNum : NaN,
      home: home?.american_odds != null ? formatAm(home.american_odds) : null,
      away: away?.american_odds != null ? formatAm(away.american_odds) : null,
    });
  }
  if (!candidates.length) return null;
  // Prefer the most balanced (main) line — smallest |home implied - away implied|.
  candidates.sort((a, b) => {
    const balA = Math.abs(
      (impliedProbFromAmerican(Number(String(a.home).replace("+", ""))) ?? 0.5) -
        (impliedProbFromAmerican(Number(String(a.away).replace("+", ""))) ?? 0.5),
    );
    const balB = Math.abs(
      (impliedProbFromAmerican(Number(String(b.home).replace("+", ""))) ?? 0.5) -
        (impliedProbFromAmerican(Number(String(b.away).replace("+", ""))) ?? 0.5),
    );
    return balA - balB;
  });
  const best = candidates[0];
  return {
    line: Number.isFinite(best.line) ? best.line : null,
    home: best.home,
    away: best.away,
  };
}

/** @param {Record<string, unknown>} row */
export function extractBdlRowTotals(row) {
  if (!row || typeof row !== "object") {
    return { totalLine: null, totalOver: null, totalUnder: null };
  }
  if (row.total_value != null && row.total_over_odds != null) {
    return {
      totalLine: row.total_value,
      totalOver: formatAm(row.total_over_odds),
      totalUnder: row.total_under_odds != null ? formatAm(row.total_under_odds) : null,
    };
  }
  return pickMainNestedMatchTotal(row.markets) || { totalLine: null, totalOver: null, totalUnder: null };
}

function findBdlOddsRowForVendor(rows, vendor) {
  return rows.find((r) => String(r.vendor || "").toLowerCase() === vendor) || null;
}

/**
 * @param {Array<Record<string, unknown>>} oddsRows — FIFABettingOdd[]
 * @param {number} matchId
 */
export function pickBdlMatchOddsForMatch(oddsRows, matchId) {
  const rows = (oddsRows || []).filter((r) => Number(r.match_id ?? r.matchId) === Number(matchId));
  if (!rows.length) return null;

  let mlHit = null;
  for (const vendor of VENDOR_PRIORITY) {
    const hit = findBdlOddsRowForVendor(rows, vendor);
    if (!hit) continue;
    const home = formatAm(hit.moneyline_home_odds);
    const away = formatAm(hit.moneyline_away_odds);
    const draw = formatAm(hit.moneyline_draw_odds);
    if (!home && !away && !draw) continue;
    mlHit = { hit, home, away, draw, vendor };
    break;
  }
  if (!mlHit) return null;

  let totals = { totalLine: null, totalOver: null, totalUnder: null };
  let toAdvance = null;
  let btts = null;
  let drawNoBet = null;
  let doubleChance = null;
  let nestedSpread = null;
  for (const vendor of VENDOR_PRIORITY) {
    const hit = findBdlOddsRowForVendor(rows, vendor);
    if (!hit) continue;
    totals = extractBdlRowTotals(hit);
    if (totals.totalLine != null && totals.totalOver != null) break;
  }
  for (const vendor of VENDOR_PRIORITY) {
    const hit = findBdlOddsRowForVendor(rows, vendor);
    if (!hit) continue;
    toAdvance = toAdvance || pickBdlNestedToAdvanceOdds(hit.markets);
    btts = btts || pickBdlNestedBtts(hit.markets);
    drawNoBet = drawNoBet || pickBdlNestedDrawNoBet(hit.markets);
    doubleChance = doubleChance || pickBdlNestedDoubleChance(hit.markets);
    nestedSpread = nestedSpread || pickBdlNestedMatchSpread(hit.markets);
    if (toAdvance && btts && drawNoBet && doubleChance && nestedSpread) break;
  }

  const spreadHome =
    mlHit.hit.spread_home_odds != null ? formatAm(mlHit.hit.spread_home_odds) : nestedSpread?.home || null;
  const spreadHomeLine =
    mlHit.hit.spread_home_value ?? (nestedSpread?.line != null ? nestedSpread.line : null);
  const spreadAway = nestedSpread?.away || null;

  return {
    home: mlHit.home ? { moneyline: mlHit.home } : undefined,
    away: mlHit.away ? { moneyline: mlHit.away } : undefined,
    draw: mlHit.draw ? { moneyline: mlHit.draw } : undefined,
    toAdvanceHome: toAdvance?.home ? { moneyline: toAdvance.home } : undefined,
    toAdvanceAway: toAdvance?.away ? { moneyline: toAdvance.away } : undefined,
    provider: String(mlHit.hit.vendor || "BDL"),
    spreadHome,
    spreadHomeLine,
    spreadAway,
    totalOver: totals.totalOver,
    totalLine: totals.totalLine,
    totalUnder: totals.totalUnder,
    btts: btts && (btts.yes || btts.no) ? btts : undefined,
    drawNoBet: drawNoBet && (drawNoBet.home || drawNoBet.away) ? drawNoBet : undefined,
    doubleChance:
      doubleChance && (doubleChance.homeOrDraw || doubleChance.awayOrDraw || doubleChance.homeOrAway)
        ? doubleChance
        : undefined,
  };
}

function formatAm(n) {
  if (n == null || n === "") return null;
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return v > 0 ? `+${v}` : String(v);
}

/**
 * Attach BDL 1X2 moneylines to slate rows (DraftKings → FanDuel → BetMGM → Caesars).
 * @param {Array<Record<string, unknown>>} matches
 * @param {Array<Record<string, unknown>>} oddsRows
 * @param {number} [nowMs]
 */
export function attachBdlMoneylinesToMatches(matches, oddsRows, nowMs = Date.now()) {
  return (matches || []).map((m) => {
    const bdlMatchId = m?.bdlMatchId ?? m?.id;
    if (bdlMatchId == null) return m;
    const odds = pickBdlMatchOddsForMatch(oddsRows, bdlMatchId);
    if (!odds) return m;
    return { ...m, odds, oddsUpdatedAt: nowMs };
  });
}

/**
 * Build player_id → display name map from BDL reference / roster rows.
 * @param {Array<Record<string, unknown>>} players
 */
export function buildBdlPlayerIdLookup(players = []) {
  /** @type {Record<string, { name: string, nationAbbr?: string | null }>} */
  const lookup = {};
  for (const raw of players) {
    const id = raw?.id ?? raw?.bdlPlayerId ?? raw?.player?.id;
    const name = String(
      raw?.name ||
        raw?.shortName ||
        raw?.short_name ||
        raw?.player?.name ||
        raw?.player?.short_name ||
        "",
    ).trim();
    if (id == null || !name) continue;
    const nationAbbr =
      String(
        raw?.countryCode ||
          raw?.country_code ||
          raw?.player?.country_code ||
          raw?.nationAbbr ||
          "",
      )
        .trim()
        .toUpperCase()
        .slice(0, 3) || null;
    lookup[String(id)] = { name, nationAbbr };
  }
  return lookup;
}

function bdlPropOddsRank(odds) {
  const raw = String(odds || "").trim().replace(/^\+/, "");
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 999999;
  if (String(odds).startsWith("-")) return n;
  return n;
}

function isBdlPropOverSide(side) {
  const raw = String(side || "").trim().toLowerCase();
  return !raw || raw === "yes" || raw === "over";
}

/** Primary O/U line to keep when collapsing for display-only helpers. */
export const BDL_INGEST_PREFERRED_OU_LINE = {
  player_shots_ou: 1.5,
  player_sot_ou: 0.5,
  player_assists_ou: 0.5,
  player_saves_ou: 3.5,
  player_tackles_ou: 1.5,
  player_shots_each_half: 1,
  player_sot_each_half: 1,
};

function bdlIngestPreferredLineForMarket(marketKey) {
  if (Object.prototype.hasOwnProperty.call(BDL_INGEST_PREFERRED_OU_LINE, marketKey)) {
    return BDL_INGEST_PREFERRED_OU_LINE[marketKey];
  }
  if (String(marketKey).includes("_ou")) return 1.5;
  if (String(marketKey).includes("each_half")) return 1;
  return null;
}

function isBdlLadderedPropMarket(marketKey) {
  const key = String(marketKey || "");
  if (key === "player_goal_or_assist") return false;
  return key.includes("_ou") || key.includes("each_half");
}

/**
 * Display/helper collapse — KV ingest stores the full BDL ladder (all lines per player).
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} marketKey
 */
export function collapseBdlIngestRowsOnePerPlayer(rows, marketKey = "") {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return [];

  const isLaddered = isBdlLadderedPropMarket(marketKey);
  const preferredLine = bdlIngestPreferredLineForMarket(marketKey);
  /** @type {Map<string, Record<string, unknown>>} */
  const byPlayer = new Map();

  for (const row of list) {
    const name = String(row?.name || "").trim();
    const odds = String(row?.americanOdds || "").trim();
    if (!name || !odds) continue;
    if (isLaddered && !isBdlPropOverSide(row?.side)) continue;

    const playerKey = name.toLowerCase();
    const existing = byPlayer.get(playerKey);
    if (!existing) {
      byPlayer.set(playerKey, row);
      continue;
    }

    if (isLaddered && preferredLine != null) {
      const target = preferredLine;
      const candLine = Number.parseFloat(String(row.line ?? ""));
      const incLine = Number.parseFloat(String(existing.line ?? ""));
      const candDist = Number.isFinite(candLine) ? Math.abs(candLine - target) : 99;
      const incDist = Number.isFinite(incLine) ? Math.abs(incLine - target) : 99;
      if (candDist !== incDist) {
        if (candDist < incDist) byPlayer.set(playerKey, row);
        continue;
      }
      if (candLine !== incLine && Number.isFinite(candLine) && Number.isFinite(incLine)) {
        if (candLine < incLine) {
          byPlayer.set(playerKey, row);
          continue;
        }
        if (candLine > incLine) continue;
      }
    }

    if (bdlPropOddsRank(odds) < bdlPropOddsRank(String(existing.americanOdds || ""))) {
      byPlayer.set(playerKey, row);
    }
  }

  return [...byPlayer.values()];
}

/**
 * @param {Array<Record<string, unknown>>} rows — FIFAPlayerProp[]
 * @param {Record<string, { name: string, nationAbbr?: string | null }>} [playerLookup]
 */
export function normalizeBdlPlayerPropsToMarkets(rows, playerLookup = {}) {
  const markets = createEmptyMatchPlayerPropMarkets();
  /** @type {Record<string, Map<string, Record<string, unknown>>>} */
  const byMarket = {};
  for (const key of Object.keys(markets)) {
    byMarket[key] = new Map();
  }

  for (const row of rows || []) {
    const marketKey = BDL_PROP_TO_MARKET[String(row.prop_type || "")];
    if (!marketKey || !byMarket[marketKey]) continue;

    const player = row.player && typeof row.player === "object" ? row.player : {};
    let name = String(player.name || player.short_name || "").trim();
    let nationAbbr = String(
      player.country_code || player.nationAbbr || player.team_abbr || player.team || "",
    )
      .trim()
      .toUpperCase()
      .slice(0, 3);

    if (!name && row.player_id != null) {
      const hit = playerLookup[String(row.player_id)];
      if (hit?.name) {
        name = hit.name;
        if (hit.nationAbbr) nationAbbr = hit.nationAbbr;
      }
    }
    if (!name) continue;
    if (nationAbbr) nationAbbr = normalizeEspnAbbr(nationAbbr) || nationAbbr;

    const market = row.market || {};
    const marketType = String(market.type || "").toLowerCase();
    const vendor = String(row.vendor || "bdl").toLowerCase();

    if (marketType === "milestone" && market.odds != null) {
      pushPropRow(
        byMarket[marketKey],
        name,
        formatAm(market.odds),
        vendor,
        row,
        row.line_value != null ? String(row.line_value) : null,
        "over",
        nationAbbr || null,
      );
    } else if (marketType === "over_under") {
      if (market.over_odds != null) {
        pushPropRow(
          byMarket[marketKey],
          name,
          formatAm(market.over_odds),
          vendor,
          row,
          row.line_value,
          "over",
          nationAbbr,
        );
      }
      if (market.under_odds != null) {
        pushPropRow(
          byMarket[marketKey],
          name,
          formatAm(market.under_odds),
          vendor,
          row,
          row.line_value,
          "under",
          nationAbbr,
        );
      }
    }
  }

  for (const [marketKey, map] of Object.entries(byMarket)) {
    // Store full BDL ladder in KV — display layer collapses for card face.
    markets[marketKey] = [...map.values()];
  }
  return markets;
}

function pushPropRow(map, name, americanOdds, vendor, row, line, side, nationAbbr = null) {
  if (!americanOdds) return;
  const key = `${name.toLowerCase()}|${line || ""}|${side || ""}`;
  const existing = map.get(key);
  if (!existing) {
    map.set(key, {
      name,
      americanOdds,
      nationAbbr: nationAbbr || null,
      line: line != null ? String(line) : null,
      side: side || null,
      bookOdds: { [vendor]: americanOdds },
    });
  } else {
    existing.bookOdds[vendor] = americanOdds;
    if (nationAbbr && !existing.nationAbbr) existing.nationAbbr = nationAbbr;
  }
}

/**
 * Build WcMatchDetail-compatible object from BDL match bundle.
 * @param {{ bdlMatchId: number, eventId: string, homeTeam?: string, awayTeam?: string, match?: Record<string, unknown>, lineups?: Array<Record<string, unknown>>, events?: Array<Record<string, unknown>>, playerStats?: Array<Record<string, unknown>>, teamStats?: Array<Record<string, unknown>>, shots?: Array<Record<string, unknown>>, momentum?: Array<Record<string, unknown>>, bestPlayers?: Array<Record<string, unknown>>, avgPositions?: Array<Record<string, unknown>>, teamForm?: Array<Record<string, unknown>> }} bundle
 */
export function normalizeBdlMatchDetailBundle(bundle) {
  const match = bundle.match || {};
  const homeTeam =
    normalizeEspnAbbr(bundle.homeTeam) || pickTeamAbbr(match.home_team || match.homeTeam);
  const awayTeam =
    normalizeEspnAbbr(bundle.awayTeam) || pickTeamAbbr(match.away_team || match.awayTeam);
  const status = normalizeBdlFifaStatus(match.status);
  const phase = status === "FT" ? "post" : status === "NS" ? "pre" : "live";
  const dateRaw = String(match.datetime || bundle.date || "").slice(0, 10);

  /** @type {Record<string, { formation: string | null, starters: unknown[], bench: unknown[] }>} */
  const lineups = {
    home: { formation: match.home_formation ? String(match.home_formation) : null, starters: [], bench: [] },
    away: { formation: match.away_formation ? String(match.away_formation) : null, starters: [], bench: [] },
  };
  /** @type {Record<string, unknown[]>} */
  const players = { home: [], away: [] };

  const homeTeamId = match.home_team?.id ?? match.homeTeam?.id;
  const awayTeamId = match.away_team?.id ?? match.awayTeam?.id;

  for (const row of bundle.lineups || []) {
    const isHome =
      row.is_home === true ||
      (homeTeamId != null && Number(row.team_id) === Number(homeTeamId));
    const side = isHome ? "home" : "away";
    const p = row.player || {};
    const lp = {
      bdlPlayerId: p.id != null ? String(p.id) : null,
      name: String(p.name || p.short_name || "").trim(),
      jersey: row.shirt_number != null ? String(row.shirt_number) : null,
      position: row.position ? String(row.position) : null,
      starter: Boolean(row.is_starter),
    };
    if (lp.starter) lineups[side].starters.push(lp);
    else lineups[side].bench.push(lp);
  }

  for (const row of bundle.playerStats || []) {
    const side = row.is_home === true ? "home" : "away";
    const p = row.player || {};
    const name = String(p.name || p.short_name || "").trim();
    players[side].push({
      bdlPlayerId: row.player_id != null ? String(row.player_id) : p.id != null ? String(p.id) : null,
      name: name || (row.player_id != null ? `player ${row.player_id}` : "unknown"),
      goals: Number(row.goals ?? 0),
      assists: Number(row.assists ?? 0),
      shots: Number(row.shots ?? row.shots_total ?? 0),
      shotsOnTarget: Number(row.shots_on_target ?? 0),
      saves: Number(row.saves ?? 0),
      keyPasses: row.key_passes != null ? Number(row.key_passes) : null,
      yellowCards: Number(row.yellow_cards ?? 0),
      redCards: Number(row.red_cards ?? 0),
      minutesPlayed: row.minutes_played != null ? Number(row.minutes_played) : null,
      xg: row.expected_goals != null ? Number(row.expected_goals) : null,
      xa: row.expected_assists != null ? Number(row.expected_assists) : null,
      rating: row.rating != null && Number.isFinite(Number(row.rating)) ? Number(row.rating) : null,
    });
  }

  /** @type {Record<string, Record<string, number | null>>} */
  const teamStats = { home: {}, away: {} };
  for (const row of bundle.teamStats || []) {
    const side = row.is_home === true ? "home" : "away";
    teamStats[side] = {
      shots: Number(row.shots ?? row.shots_total ?? 0),
      shotsOnTarget: Number(row.shots_on_target ?? 0),
      possessionPct: row.possession_pct != null ? Number(row.possession_pct) : null,
      passes: Number(row.passes_total ?? 0),
      passesCompleted: Number(row.passes_accurate ?? 0),
      fouls: Number(row.fouls ?? 0),
      corners: Number(row.corners ?? 0),
    };
  }

  const goals = [];
  for (const ev of bundle.events || []) {
    if (String(ev.incident_type || "").toLowerCase() !== "goal") continue;
    const scorer = ev.player?.name ? String(ev.player.name) : null;
    if (!scorer) continue;
    goals.push({
      minute: ev.time_minute != null ? Number(ev.time_minute) : null,
      addedTime: ev.added_time != null ? Number(ev.added_time) : null,
      scorer,
      assist: ev.assist_player?.name ? String(ev.assist_player.name) : null,
      team: ev.is_home === true ? homeTeam : awayTeam,
    });
  }

  const lineupConfirmed =
    lineups.home.starters.length >= 11 && lineups.away.starters.length >= 11;

  const homeScore = match.home_score != null ? Number(match.home_score) : null;
  const awayScore = match.away_score != null ? Number(match.away_score) : null;

  const bdlGoat = buildBdlGoatMatchIntel(bundle, { homeTeam, awayTeam });

  return {
    eventId: String(bundle.eventId),
    bdlMatchId: bundle.bdlMatchId,
    source: "balldontlie",
    truthLayer: "balldontlie_goat",
    lastUpdated: Date.now(),
    fetchedAt: Date.now(),
    homeTeam,
    awayTeam,
    homeScore: Number.isFinite(homeScore) ? homeScore : null,
    awayScore: Number.isFinite(awayScore) ? awayScore : null,
    status,
    phase,
    date: dateRaw,
    commenceTs: Date.parse(String(match.datetime || "")) || null,
    venue: match.stadium?.name ? String(match.stadium.name) : null,
    lineupConfirmed,
    lineups,
    players,
    teamStats,
    goals,
    injuries: [],
    finalized: status === "FT",
    bdlGoat,
  };
}
