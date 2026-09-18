/**
 * Multi-season NFL prop settlement for top-ADP / most-rostered players.
 *
 * Lines:
 *   2025 + 2026 YTD → BDL GOAT /odds/player_props/opening (real opening books)
 *   2024            → BDL fantasy weekly projections as market-proxy lines
 *                      (BDL does not archive 2024 opening player props)
 *
 * Usage: node --env-file=.env scripts/grade-nfl-prop-history.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getNflBdlApiKey,
  nflBdlFetch,
  nflBdlFetchAllPages,
} from "../api/_nflBdl.js";
import {
  removeTwoWayVig,
  flatBetEv,
  overPriceEdge,
  consensusOddsNearLine,
  americanToImpliedProb,
  isValidAmericanOdds,
} from "../shared/nflPropPriceMath.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "out");
const TOP_N = 75;
const CORE_PROPS = new Set([
  "passing_yards",
  "passing_tds",
  "passing_attempts",
  "passing_completions",
  "interceptions",
  "rushing_yards",
  "rushing_attempts",
  "receiving_yards",
  "receptions",
  "rushing_receiving_yards",
  "anytime_td",
]);

const PROP_TO_STAT = {
  passing_yards: (s) => num(s.passing_yards),
  passing_tds: (s) => num(s.passing_touchdowns),
  passing_attempts: (s) => num(s.passing_attempts),
  passing_completions: (s) => num(s.passing_completions),
  interceptions: (s) => num(s.passing_interceptions),
  rushing_yards: (s) => num(s.rushing_yards),
  rushing_attempts: (s) => num(s.rushing_attempts),
  receiving_yards: (s) => num(s.receiving_yards),
  receptions: (s) => num(s.receptions),
  rushing_receiving_yards: (s) => num(s.rushing_yards) + num(s.receiving_yards),
  anytime_td: (s) =>
    num(s.rushing_touchdowns) +
      num(s.receiving_touchdowns) +
      num(s.kick_return_touchdowns) +
      num(s.punt_return_touchdowns) >
    0
      ? 1
      : 0,
};

const PROJ_LINE_MAP = {
  passing_yards: (p) => num(p.passing_yards),
  passing_tds: (p) => num(p.passing_touchdowns),
  passing_attempts: (p) => num(p.passing_attempts),
  passing_completions: (p) => num(p.passing_completions),
  interceptions: (p) => num(p.passing_interceptions),
  rushing_yards: (p) => num(p.rushing_yards),
  rushing_attempts: (p) => num(p.rushing_attempts),
  receiving_yards: (p) => num(p.receiving_yards),
  receptions: (p) => num(p.receptions),
  rushing_receiving_yards: (p) => num(p.rushing_yards) + num(p.receiving_yards),
  anytime_td: (p) =>
    num(p.rushing_touchdowns) + num(p.receiving_touchdowns) + num(p.receiving_touchdowns),
};

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function playerName(p) {
  if (!p) return null;
  if (typeof p === "string") return p;
  const n = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return n || null;
}

function median(vals) {
  const a = vals.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function settle(actual, line, propType) {
  if (!Number.isFinite(actual) || !Number.isFinite(line)) return null;
  if (propType === "anytime_td") {
    // Milestone 0.5: Over hits if player scored a non-passing TD
    if (actual >= 1) return "over";
    return "under";
  }
  if (Math.abs(actual - line) < 1e-9) return "push";
  return actual > line ? "over" : "under";
}

function bump(map, key, field, n = 1) {
  if (!map[key]) map[key] = { over: 0, under: 0, push: 0, n: 0 };
  map[key][field] += n;
  map[key].n += n;
}

function rate(row, side) {
  const decidable = row.over + row.under;
  if (!decidable) return null;
  return row[side] / decidable;
}

async function fetchAdpTop(season, key, n = TOP_N) {
  const res = await nflBdlFetchAllPages(
    "/fantasy/adp",
    { season, per_page: 100 },
    { apiKey: key, maxPages: 2, timeoutMs: 25000 },
  );
  const rows = Array.isArray(res.data) ? res.data : [];
  // Prefer lower ADP; fall back to percent_rostered
  const scored = rows
    .map((r) => {
      const id = Number(r.player?.id ?? r.player_id);
      const name = playerName(r.player);
      const adp = Number(r.average_draft_position ?? r.adp);
      const rostered = Number(r.percent_rostered);
      const pos = String(r.position || r.player?.position_abbreviation || "").toUpperCase();
      // Skill props only — kickers/punters pad ADP but have no CORE_PROPS lines
      if (/^(K|PK|P|Kicker|Punter)$/i.test(pos) || /kicker|punter/i.test(pos)) return null;
      return { id, name, adp, rostered, pos, season };
    })
    .filter(Boolean)
    .filter((r) => Number.isFinite(r.id) && r.name);
  scored.sort((a, b) => {
    const aAdp = Number.isFinite(a.adp) && a.adp > 0 && a.adp < 100 ? a.adp : 999;
    const bAdp = Number.isFinite(b.adp) && b.adp > 0 && b.adp < 100 ? b.adp : 999;
    if (aAdp !== bAdp) return aAdp - bAdp;
    return (b.rostered || 0) - (a.rostered || 0);
  });
  const seen = new Set();
  const out = [];
  for (const r of scored) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
    if (out.length >= n) break;
  }
  return out;
}

async function fetchGames(season, weeks, key) {
  const games = [];
  for (const week of weeks) {
    const res = await nflBdlFetchAllPages(
      "/games",
      { seasons: [season], weeks: [week], per_page: 100 },
      { apiKey: key, maxPages: 2, timeoutMs: 25000 },
    );
    for (const g of res.data || []) {
      const status = String(g.status || "").toLowerCase();
      if (!status.includes("final") && status !== "completed") continue;
      games.push({
        id: Number(g.id),
        season,
        week: Number(g.week ?? week),
        date: g.date,
        homeTeamId: Number(g.home_team?.id),
        awayTeamId: Number(g.visitor_team?.id ?? g.away_team?.id),
        homeAbbr: String(g.home_team?.abbreviation || "").toUpperCase(),
        awayAbbr: String(
          g.visitor_team?.abbreviation || g.away_team?.abbreviation || "",
        ).toUpperCase(),
      });
    }
    await sleep(80);
  }
  return games;
}

/** @param {any} stat @param {{ homeTeamId?: number, awayTeamId?: number, homeAbbr?: string, awayAbbr?: string }|null} gameMeta */
function venueFromStat(stat, gameMeta) {
  const teamId = Number(stat?.team?.id);
  const teamAbbr = String(stat?.team?.abbreviation || "").toUpperCase();
  if (gameMeta && Number.isFinite(gameMeta.homeTeamId) && Number.isFinite(teamId)) {
    if (teamId === gameMeta.homeTeamId) return "home";
    if (teamId === gameMeta.awayTeamId) return "away";
  }
  const homeId = Number(stat?.game?.home_team?.id);
  const awayId = Number(stat?.game?.visitor_team?.id ?? stat?.game?.away_team?.id);
  if (Number.isFinite(teamId) && Number.isFinite(homeId)) {
    if (teamId === homeId) return "home";
    if (teamId === awayId) return "away";
  }
  const homeAbbr = String(
    gameMeta?.homeAbbr || stat?.game?.home_team?.abbreviation || "",
  ).toUpperCase();
  const awayAbbr = String(
    gameMeta?.awayAbbr ||
      stat?.game?.visitor_team?.abbreviation ||
      stat?.game?.away_team?.abbreviation ||
      "",
  ).toUpperCase();
  if (teamAbbr && homeAbbr && teamAbbr === homeAbbr) return "home";
  if (teamAbbr && awayAbbr && teamAbbr === awayAbbr) return "away";
  return null;
}

async function fetchStatsForPlayers(season, weeks, playerIds, key) {
  /** @type {Map<string, any>} */
  const byKey = new Map();
  // Batch player ids to keep query reasonable
  const ids = [...playerIds];
  const chunk = 25;
  for (const week of weeks) {
    for (let i = 0; i < ids.length; i += chunk) {
      const slice = ids.slice(i, i + chunk);
      const res = await nflBdlFetchAllPages(
        "/stats",
        {
          seasons: [season],
          weeks: [week],
          player_ids: slice,
          season_type: 2,
          per_page: 100,
        },
        { apiKey: key, maxPages: 3, timeoutMs: 30000 },
      );
      for (const row of res.data || []) {
        const pid = Number(row.player?.id);
        const gid = Number(row.game?.id);
        if (!Number.isFinite(pid) || !Number.isFinite(gid)) continue;
        byKey.set(`${gid}:${pid}`, row);
      }
      await sleep(60);
    }
  }
  return byKey;
}

async function fetchOpeningProps(gameId, key) {
  const res = await nflBdlFetch(
    "/odds/player_props/opening",
    { game_id: gameId },
    { apiKey: key, timeoutMs: 25000 },
  );
  if (!res.ok || !Array.isArray(res.data?.data)) return [];
  return res.data.data;
}

function consensusLines(propRows, playerIdSet) {
  /** @type {Map<string, Array<{ line: number, overOdds: number|null, underOdds: number|null, milestoneOdds: number|null }>>} */
  const buckets = new Map();
  for (const row of propRows) {
    const pid = Number(row.player_id);
    const prop = String(row.prop_type || "");
    if (!playerIdSet.has(pid) || !CORE_PROPS.has(prop)) continue;
    const mType = row.market?.type;
    if (mType === "milestone" && prop !== "anytime_td") continue;
    if (prop !== "anytime_td" && mType && mType !== "over_under") continue;
    const line = Number(row.line_value);
    if (!Number.isFinite(line)) continue;
    const k = `${pid}|${prop}`;
    if (!buckets.has(k)) buckets.set(k, []);
    const overOdds =
      mType === "over_under" && Number.isFinite(Number(row.market?.over_odds))
        ? Number(row.market.over_odds)
        : null;
    const underOdds =
      mType === "over_under" && Number.isFinite(Number(row.market?.under_odds))
        ? Number(row.market.under_odds)
        : null;
    const milestoneOdds =
      mType === "milestone" && Number.isFinite(Number(row.market?.odds))
        ? Number(row.market.odds)
        : null;
    buckets.get(k).push({ line, overOdds, underOdds, milestoneOdds });
  }
  /** @type {Array<{playerId:number, propType:string, line:number, books:number, overOdds:number|null, underOdds:number|null, milestoneOdds:number|null}>} */
  const out = [];
  for (const [k, quotes] of buckets) {
    const [pid, prop] = k.split("|");
    const line = median(quotes.map((q) => q.line));
    if (line == null) continue;
    const odds = consensusOddsNearLine(quotes, line);
    out.push({
      playerId: Number(pid),
      propType: prop,
      line,
      books: quotes.length,
      overOdds: odds.overOdds,
      underOdds: odds.underOdds,
      milestoneOdds: odds.milestoneOdds,
    });
  }
  return out;
}

/**
 * Price layer: empirical P(over) vs vig-removed fair + flat-bet EV at open odds.
 * EV is computed per leg then averaged (never average American odds).
 * @param {Array<Record<string, unknown>>} settlements
 */
function analyzeOpenPriceEv(settlements) {
  const open = settlements.filter((s) => s.source === "bdl_opening_props");

  /** @type {Record<string, any>} */
  const byProp = {};
  /** @type {Record<string, any>} */
  const byVenue = {};

  const ensure = (map, key) => {
    if (!map[key]) {
      map[key] = {
        n: 0,
        over: 0,
        under: 0,
        push: 0,
        fairOver: [],
        overEvLegs: [],
        underEvLegs: [],
        yesEvLegs: [],
        yesImplied: [],
      };
    }
    return map[key];
  };

  for (const s of open) {
    const prop = String(s.propType);
    const g = ensure(byProp, prop);
    g.n += 1;
    if (s.result === "over") g.over += 1;
    else if (s.result === "under") g.under += 1;
    else g.push += 1;

    if (s.venue === "home" || s.venue === "away") {
      const v = ensure(byVenue, s.venue);
      v.n += 1;
      if (s.result === "over") v.over += 1;
      else if (s.result === "under") v.under += 1;
    }

    const decidable = s.result === "over" || s.result === "under";
    if (!decidable) continue;

    // Milestone ATD: price is "yes" odds only
    if (prop === "anytime_td") {
      const mile = Number(s.milestoneOdds);
      if (!isValidAmericanOdds(mile)) continue;
      const won = s.result === "over";
      // Realized $1 bet EV on this leg
      const dec = mile > 0 ? 1 + mile / 100 : 1 + 100 / Math.abs(mile);
      const realized = won ? dec - 1 : -1;
      g.yesEvLegs.push(realized);
      const imp = americanToImpliedProb(mile);
      if (imp != null) g.yesImplied.push(imp);
      continue;
    }

    const oo = Number(s.overOdds);
    const uo = Number(s.underOdds);
    if (!isValidAmericanOdds(oo) || !isValidAmericanOdds(uo)) continue;

    const vig = removeTwoWayVig(oo, uo);
    if (vig) g.fairOver.push(vig.fairOver);

    const overWon = s.result === "over";
    const underWon = s.result === "under";
    const overDec = oo > 0 ? 1 + oo / 100 : 1 + 100 / Math.abs(oo);
    const underDec = uo > 0 ? 1 + uo / 100 : 1 + 100 / Math.abs(uo);
    g.overEvLegs.push(overWon ? overDec - 1 : -1);
    g.underEvLegs.push(underWon ? underDec - 1 : -1);

    if (s.venue === "home" || s.venue === "away") {
      const v = ensure(byVenue, s.venue);
      if (vig) v.fairOver.push(vig.fairOver);
      v.overEvLegs.push(overWon ? overDec - 1 : -1);
      v.underEvLegs.push(underWon ? underDec - 1 : -1);
    }
  }

  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  const propTable = Object.entries(byProp)
    .map(([propType, g]) => {
      const decidable = g.over + g.under;
      const empiricalOver = decidable ? g.over / decidable : null;
      const empiricalUnder = decidable ? g.under / decidable : null;
      const meanFairOver = avg(g.fairOver);
      const flatBetEvOver = avg(g.overEvLegs);
      const flatBetEvUnder = avg(g.underEvLegs);
      const flatBetEvYes = avg(g.yesEvLegs);
      const meanYesImplied = avg(g.yesImplied);
      const edgeVsFair =
        propType === "anytime_td"
          ? empiricalOver != null && meanYesImplied != null
            ? empiricalOver - meanYesImplied
            : null
          : overPriceEdge(empiricalOver, meanFairOver);

      return {
        propType,
        n: g.n,
        decidable,
        empiricalOverRate: empiricalOver,
        empiricalUnderRate: empiricalUnder,
        meanFairOver,
        meanYesImplied,
        edgeVsFairOverPp: edgeVsFair != null ? edgeVsFair * 100 : null,
        flatBetEvOver,
        flatBetEvUnder,
        flatBetEvYes,
        pricedLegs: g.overEvLegs.length || g.yesEvLegs.length,
      };
    })
    .sort((a, b) => b.n - a.n);

  const venueTable = Object.entries(byVenue).map(([venue, g]) => {
    const decidable = g.over + g.under;
    const empiricalOver = decidable ? g.over / decidable : null;
    const empiricalUnder = decidable ? g.under / decidable : null;
    const meanFairOver = avg(g.fairOver);
    return {
      venue,
      n: g.n,
      empiricalOverRate: empiricalOver,
      empiricalUnderRate: empiricalUnder,
      meanFairOver,
      edgeVsFairOverPp:
        empiricalOver != null && meanFairOver != null
          ? overPriceEdge(empiricalOver, meanFairOver) * 100
          : null,
      flatBetEvOver: avg(g.overEvLegs),
      flatBetEvUnder: avg(g.underEvLegs),
      pricedLegs: g.overEvLegs.length,
    };
  });

  // Overall two-way OU only
  const twoWay = open.filter(
    (s) =>
      s.propType !== "anytime_td" &&
      (s.result === "over" || s.result === "under") &&
      isValidAmericanOdds(Number(s.overOdds)) &&
      isValidAmericanOdds(Number(s.underOdds)),
  );
  let overEvSum = 0;
  let underEvSum = 0;
  let fairSum = 0;
  let fairN = 0;
  let overHits = 0;
  for (const s of twoWay) {
    const oo = Number(s.overOdds);
    const uo = Number(s.underOdds);
    const overDec = oo > 0 ? 1 + oo / 100 : 1 + 100 / Math.abs(oo);
    const underDec = uo > 0 ? 1 + uo / 100 : 1 + 100 / Math.abs(uo);
    const overWon = s.result === "over";
    overEvSum += overWon ? overDec - 1 : -1;
    underEvSum += overWon ? -1 : underDec - 1;
    if (overWon) overHits += 1;
    const vig = removeTwoWayVig(oo, uo);
    if (vig) {
      fairSum += vig.fairOver;
      fairN += 1;
    }
  }
  const overallN = twoWay.length;
  const empOver = overallN ? overHits / overallN : null;
  const meanFair = fairN ? fairSum / fairN : null;

  return {
    methodology:
      "Consensus open American odds at median line. Per-leg flat $1 EV averaged (never average American odds). " +
      "Fair P(over) = vig-removed mean. edgeVsFairOverPp = (empirical − fair) × 100. " +
      "Positive edge ⇒ Overs were underpriced vs this sample at open.",
    overallTwoWay: {
      n: overallN,
      empiricalOverRate: empOver,
      meanFairOver: meanFair,
      edgeVsFairOverPp:
        empOver != null && meanFair != null ? overPriceEdge(empOver, meanFair) * 100 : null,
      flatBetEvOver: overallN ? overEvSum / overallN : null,
      flatBetEvUnder: overallN ? underEvSum / overallN : null,
    },
    byProp: propTable,
    byVenue: venueTable,
  };
}

async function fetchWeeklyProjections(season, week, playerIds, key) {
  const out = new Map();
  const chunk = 40;
  for (let i = 0; i < playerIds.length; i += chunk) {
    const slice = playerIds.slice(i, i + chunk);
    const res = await nflBdlFetchAllPages(
      "/fantasy/projections",
      {
        season,
        week,
        scoring_format: "ppr",
        player_ids: slice,
        per_page: 50,
      },
      { apiKey: key, maxPages: 2, timeoutMs: 25000 },
    );
    for (const row of res.data || []) {
      const pid = Number(row.player?.id);
      if (!Number.isFinite(pid)) continue;
      out.set(pid, {
        stats: row.stats || {},
        gameId: Number(row.game?.id),
        name: playerName(row.player),
      });
    }
    await sleep(80);
  }
  return out;
}

function summarize(settlements) {
  const byProp = {};
  const bySeason = {};
  const bySource = {};
  const byPlayer = {};
  const byVenue = {};
  const byVenueProp = {};
  const byPropSide = {};
  for (const s of settlements) {
    bump(byProp, s.propType, s.result);
    bump(bySeason, String(s.season), s.result);
    bump(bySource, s.source, s.result);
    bump(byPlayer, s.player, s.result);
    if (s.venue === "home" || s.venue === "away") {
      bump(byVenue, s.venue, s.result);
      bump(byVenueProp, `${s.venue}|${s.propType}`, s.result);
    }
    const ps = `${s.propType}`;
    if (!byPropSide[ps]) byPropSide[ps] = { overHits: 0, underHits: 0, pushes: 0, n: 0 };
    byPropSide[ps].n += 1;
    if (s.result === "over") byPropSide[ps].overHits += 1;
    else if (s.result === "under") byPropSide[ps].underHits += 1;
    else byPropSide[ps].pushes += 1;
  }

  const propTable = Object.entries(byProp)
    .map(([propType, row]) => ({
      propType,
      n: row.n,
      overHitRate: rate(row, "over"),
      underHitRate: rate(row, "under"),
      pushRate: row.n ? row.push / row.n : 0,
      over: row.over,
      under: row.under,
      push: row.push,
      underEdgePp:
        rate(row, "under") != null && rate(row, "over") != null
          ? (rate(row, "under") - rate(row, "over")) * 100
          : null,
    }))
    .sort((a, b) => b.n - a.n);

  const playerTable = Object.entries(byPlayer)
    .map(([player, row]) => ({
      player,
      n: row.n,
      overHitRate: rate(row, "over"),
      underHitRate: rate(row, "under"),
      over: row.over,
      under: row.under,
      push: row.push,
    }))
    .sort((a, b) => b.n - a.n);

  const seasonTable = Object.entries(bySeason).map(([season, row]) => ({
    season: Number(season),
    n: row.n,
    overHitRate: rate(row, "over"),
    underHitRate: rate(row, "under"),
    over: row.over,
    under: row.under,
    push: row.push,
  }));

  const sourceTable = Object.entries(bySource).map(([source, row]) => ({
    source,
    n: row.n,
    overHitRate: rate(row, "over"),
    underHitRate: rate(row, "under"),
  }));

  const venueTable = Object.entries(byVenue).map(([venue, row]) => ({
    venue,
    n: row.n,
    overHitRate: rate(row, "over"),
    underHitRate: rate(row, "under"),
    over: row.over,
    under: row.under,
    push: row.push,
  }));

  const venuePropTable = Object.entries(byVenueProp)
    .map(([key, row]) => {
      const [venue, propType] = key.split("|");
      return {
        venue,
        propType,
        n: row.n,
        overHitRate: rate(row, "over"),
        underHitRate: rate(row, "under"),
        over: row.over,
        under: row.under,
        push: row.push,
      };
    })
    .sort((a, b) => b.n - a.n);

  return {
    propTable,
    playerTable,
    seasonTable,
    sourceTable,
    venueTable,
    venuePropTable,
    byPropSide,
  };
}

/** Opening-props-only rates for Ask prior module. */
function openingOnlyPriors(settlements) {
  const open = settlements.filter((s) => s.source === "bdl_opening_props");
  const byProp = {};
  const byPlayer = {};
  const byVenue = {};
  const byVenueProp = {};
  for (const s of open) {
    bump(byProp, s.propType, s.result);
    bump(byPlayer, s.player, s.result);
    if (s.venue === "home" || s.venue === "away") {
      bump(byVenue, s.venue, s.result);
      bump(byVenueProp, `${s.venue}|${s.propType}`, s.result);
    }
  }
  const market = Object.entries(byProp)
    .map(([propType, row]) => ({
      propType,
      n: row.n,
      underRate: rate(row, "under"),
      overRate: rate(row, "over"),
    }))
    .filter((r) => r.underRate != null)
    .sort((a, b) => b.n - a.n);

  const underPlayers = Object.entries(byPlayer)
    .map(([player, row]) => ({
      player,
      n: row.n,
      underRate: rate(row, "under"),
      overRate: rate(row, "over"),
    }))
    .filter((r) => r.n >= 25 && r.underRate != null && r.underRate >= 0.56)
    .sort((a, b) => b.underRate - a.underRate);

  const overPlayers = Object.entries(byPlayer)
    .map(([player, row]) => ({
      player,
      n: row.n,
      underRate: rate(row, "under"),
      overRate: rate(row, "over"),
    }))
    .filter((r) => r.n >= 25 && r.overRate != null && r.overRate >= 0.56)
    .sort((a, b) => b.overRate - a.overRate);

  const venue = Object.entries(byVenue).map(([venue, row]) => ({
    venue,
    n: row.n,
    underRate: rate(row, "under"),
    overRate: rate(row, "over"),
  }));

  const venueProp = Object.entries(byVenueProp)
    .map(([key, row]) => {
      const [venue, propType] = key.split("|");
      return {
        venue,
        propType,
        n: row.n,
        underRate: rate(row, "under"),
        overRate: rate(row, "over"),
      };
    })
    .filter((r) => r.n >= 40 && r.underRate != null)
    .sort((a, b) => Math.abs(b.underRate - 0.5) - Math.abs(a.underRate - 0.5));

  return { market, underPlayers, overPlayers, venue, venueProp, openN: open.length };
}

async function gradeOpeningSeasons(seasonsCfg, topPlayers, key) {
  const playerIdSet = new Set(topPlayers.map((p) => p.id));
  const nameById = new Map(topPlayers.map((p) => [p.id, p.name]));
  const settlements = [];
  const coveredPlayers = new Set();

  for (const { season, weeks } of seasonsCfg) {
    console.error(`\n=== Opening-props grade ${season} weeks ${weeks[0]}-${weeks[weeks.length - 1]} ===`);
    const games = await fetchGames(season, weeks, key);
    console.error(`final games: ${games.length}`);
    const statsMap = await fetchStatsForPlayers(
      season,
      weeks,
      topPlayers.map((p) => p.id),
      key,
    );
    console.error(`stat rows for top players: ${statsMap.size}`);

    const gameIdsNeeded = new Set();
    for (const [k] of statsMap) {
      const gid = Number(k.split(":")[0]);
      if (Number.isFinite(gid)) gameIdsNeeded.add(gid);
    }
    // Also include all final games — props may exist even if we filter after
    for (const g of games) gameIdsNeeded.add(g.id);

    let gi = 0;
    for (const gid of gameIdsNeeded) {
      gi += 1;
      if (gi % 25 === 0) console.error(`  opening props ${gi}/${gameIdsNeeded.size}`);
      const props = await fetchOpeningProps(gid, key);
      await sleep(70);
      if (!props.length) continue;
      const lines = consensusLines(props, playerIdSet);
      const gameMeta = games.find((g) => g.id === gid) || { season, week: null };
      for (const line of lines) {
        const stat = statsMap.get(`${gid}:${line.playerId}`);
        if (!stat) continue;
        const getter = PROP_TO_STAT[line.propType];
        if (!getter) continue;
        // DNP / no usage: skip if all relevant volume zero and prop is volume-ish
        const actual = getter(stat);
        const result = settle(actual, line.line, line.propType);
        if (!result) continue;
        const name = nameById.get(line.playerId) || playerName(stat.player) || `id:${line.playerId}`;
        coveredPlayers.add(line.playerId);
        settlements.push({
          season: gameMeta.season ?? season,
          week: gameMeta.week,
          gameId: gid,
          playerId: line.playerId,
          player: name,
          propType: line.propType,
          line: line.line,
          books: line.books,
          overOdds: line.overOdds ?? null,
          underOdds: line.underOdds ?? null,
          milestoneOdds: line.milestoneOdds ?? null,
          actual,
          result,
          venue: venueFromStat(stat, gameMeta),
          source: "bdl_opening_props",
        });
      }
    }
    console.error(`settlements so far: ${settlements.length}`);
  }

  return { settlements, coveredPlayers };
}

async function gradeProjectionProxy2024(topPlayers, key) {
  const weeks = Array.from({ length: 18 }, (_, i) => i + 1);
  const settlements = [];
  const coveredPlayers = new Set();
  const ids = topPlayers.map((p) => p.id);
  const nameById = new Map(topPlayers.map((p) => [p.id, p.name]));

  console.error(`\n=== 2024 projection-proxy grade weeks 1-18 ===`);
  const statsMap = await fetchStatsForPlayers(2024, weeks, ids, key);
  console.error(`stat rows: ${statsMap.size}`);

  for (const week of weeks) {
    const projs = await fetchWeeklyProjections(2024, week, ids, key);
    console.error(`  week ${week}: ${projs.size} projections`);
    for (const [pid, proj] of projs) {
      const gid = proj.gameId;
      if (!Number.isFinite(gid)) continue;
      const stat = statsMap.get(`${gid}:${pid}`);
      if (!stat) continue;
      const name = nameById.get(pid) || proj.name || `id:${pid}`;
      for (const propType of CORE_PROPS) {
        if (propType === "anytime_td") {
          // Projection TD probs aren't a clean OU line — skip for proxy season
          continue;
        }
        const lineFn = PROJ_LINE_MAP[propType];
        const actFn = PROP_TO_STAT[propType];
        if (!lineFn || !actFn) continue;
        let line = lineFn(proj.stats);
        if (!Number.isFinite(line) || line <= 0) continue;
        // Round to half-yard / half-unit like books
        line = Math.round(line * 2) / 2;
        // Skip tiny projection lines (noise)
        if (propType.includes("yards") && line < 10) continue;
        if (propType === "receptions" && line < 1.5) continue;
        const actual = actFn(stat);
        const result = settle(actual, line, propType);
        if (!result) continue;
        coveredPlayers.add(pid);
        settlements.push({
          season: 2024,
          week,
          gameId: gid,
          playerId: pid,
          player: name,
          propType,
          line,
          books: 0,
          actual,
          result,
          venue: venueFromStat(stat, null),
          source: "fantasy_projection_proxy",
        });
      }
    }
  }
  return { settlements, coveredPlayers };
}

function buildSolutions(summary, topPlayers, coveredIds) {
  const solutions = [];
  const underHeavy = summary.propTable
    .filter((p) => p.n >= 80 && p.underHitRate != null && p.underHitRate >= 0.54)
    .sort((a, b) => b.underHitRate - a.underHitRate);
  const overHeavy = summary.propTable
    .filter((p) => p.n >= 80 && p.overHitRate != null && p.overHitRate >= 0.54)
    .sort((a, b) => b.overHitRate - a.overHitRate);

  if (underHeavy.length) {
    solutions.push({
      id: "default-under-bias-star-volume",
      title: "Default Under bias on star volume props at open",
      detail: `Across graded opening lines, Unders cleared more often on: ${underHeavy
        .slice(0, 5)
        .map((p) => `${p.propType} (${(p.underHitRate * 100).toFixed(1)}% Under, n=${p.n})`)
        .join("; ")}. UR board should prefer Under when projection ≈ open and edge is thin.`,
      props: underHeavy.slice(0, 6).map((p) => p.propType),
    });
  }
  if (overHeavy.length) {
    solutions.push({
      id: "over-exceptions",
      title: "Over exceptions (do not blanket-Under)",
      detail: `Overs hit ≥54% on: ${overHeavy
        .slice(0, 5)
        .map((p) => `${p.propType} (${(p.overHitRate * 100).toFixed(1)}% Over, n=${p.n})`)
        .join("; ")}.`,
      props: overHeavy.slice(0, 6).map((p) => p.propType),
    });
  }

  const underPlayers = summary.playerTable
    .filter((p) => p.n >= 40 && p.underHitRate != null && p.underHitRate >= 0.56)
    .slice(0, 12);
  const overPlayers = summary.playerTable
    .filter((p) => p.n >= 40 && p.overHitRate != null && p.overHitRate >= 0.56)
    .slice(0, 12);
  if (underPlayers.length) {
    solutions.push({
      id: "player-under-cluster",
      title: "Players whose opens systematically faded (Under-lean roster)",
      detail: underPlayers
        .map((p) => `${p.player} Under ${(p.underHitRate * 100).toFixed(0)}% (n=${p.n})`)
        .join("; "),
      players: underPlayers.map((p) => p.player),
    });
  }
  if (overPlayers.length) {
    solutions.push({
      id: "player-over-cluster",
      title: "Players whose opens systematically cleared (Over-lean roster)",
      detail: overPlayers
        .map((p) => `${p.player} Over ${(p.overHitRate * 100).toFixed(0)}% (n=${p.n})`)
        .join("; "),
      players: overPlayers.map((p) => p.player),
    });
  }

  const missing = topPlayers.filter((p) => !coveredIds.has(p.id)).map((p) => p.name);
  solutions.push({
    id: "board-rules",
    title: "Ship these UR Ask board rules from the sample",
    detail:
      "1) On receiving_yards / receptions / rushing_yards for ADP stars, require a real projection edge to flip Over — open Unders win more often. " +
      "2) Keep anytime_td as a separate milestone market; do not mix with yardage side logic. " +
      "3) Prefer opening-line consensus (median books) over a single vendor. " +
      "4) After final, store opening props + settlement so 2026+ builds a first-party archive (BDL live props disappear). " +
      (missing.length
        ? `5) ${missing.length} of top-${TOP_N} lacked settleable lines in-window: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}.`
        : `5) All ${TOP_N} most-bet proxies had at least one graded line.`),
  });

  return solutions;
}

async function main() {
  const key = getNflBdlApiKey();
  if (!key) throw new Error("BALLDONTLIE_API_KEY missing");

  console.error(`Building top-${TOP_N} union from ADP 2024/2025/2026…`);
  const adpBySeason = {
    2024: await fetchAdpTop(2024, key, TOP_N),
    2025: await fetchAdpTop(2025, key, TOP_N),
    2026: await fetchAdpTop(2026, key, TOP_N),
  };

  /** Prefer 2026 ADP order, then fill from 2025/2024 until TOP_N unique */
  const topMap = new Map();
  for (const p of adpBySeason[2026]) topMap.set(p.id, { ...p, seasons: [2026] });
  for (const season of [2025, 2024]) {
    for (const p of adpBySeason[season]) {
      if (topMap.has(p.id)) {
        topMap.get(p.id).seasons.push(season);
        continue;
      }
      if (topMap.size >= TOP_N) continue;
      topMap.set(p.id, { ...p, seasons: [season] });
    }
  }
  for (const season of [2025, 2024, 2026]) {
    if (topMap.size >= TOP_N) break;
    for (const p of adpBySeason[season]) {
      if (topMap.has(p.id)) continue;
      topMap.set(p.id, { ...p, seasons: [season] });
      if (topMap.size >= TOP_N) break;
    }
  }
  const topPlayers = [...topMap.values()];
  console.error(
    `Top players: ${topPlayers.length} — ${topPlayers
      .slice(0, 10)
      .map((p) => p.name)
      .join(", ")}…`,
  );

  // 2026 YTD: weeks with finals only
  const opening = await gradeOpeningSeasons(
    [
      { season: 2025, weeks: Array.from({ length: 18 }, (_, i) => i + 1) },
      { season: 2026, weeks: [1, 2, 3] },
    ],
    topPlayers,
    key,
  );

  const proxy2024 = await gradeProjectionProxy2024(topPlayers, key);

  const settlements = [...opening.settlements, ...proxy2024.settlements];
  const coveredIds = new Set([...opening.coveredPlayers, ...proxy2024.coveredPlayers]);
  const summary = summarize(settlements);
  const openingPriors = openingOnlyPriors(settlements);
  const priceEv = analyzeOpenPriceEv(settlements);
  const solutions = buildSolutions(summary, topPlayers, coveredIds);

  const report = {
    generatedAt: new Date().toISOString(),
    methodology: {
      topPlayers: `Union of BDL fantasy ADP top-${TOP_N} across 2024–2026 (prefer 2026 order). Proxy for most-bet.`,
      lines2025_2026: "BDL GOAT /odds/player_props/opening — median line across books per player/prop.",
      lines2024:
        "BDL does not archive 2024 opening player props. Used fantasy weekly projection stats rounded to .5 as OU lines (labeled fantasy_projection_proxy).",
      markets: [...CORE_PROPS],
      settle: "actual > line → over; < → under; equal → push. anytime_td: non-passing TD ≥1 → over.",
      venue: "home/away from player team vs game home_team.",
    },
    topPlayers: topPlayers.map((p, i) => ({
      rank: i + 1,
      id: p.id,
      name: p.name,
      pos: p.pos,
      adp: p.adp,
      covered: coveredIds.has(p.id),
    })),
    coverage: {
      topN: TOP_N,
      covered: coveredIds.size,
      missing: topPlayers.filter((p) => !coveredIds.has(p.id)).map((p) => p.name),
      settlementCount: settlements.length,
      bySource: summary.sourceTable,
      bySeason: summary.seasonTable,
      byVenue: summary.venueTable,
    },
    byProp: summary.propTable,
    byPlayer: summary.playerTable.slice(0, 75),
    byVenueProp: summary.venuePropTable,
    openingPriors,
    priceEv,
    solutions,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, "nfl-prop-history-grade.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  writeFileSync(
    join(OUT_DIR, "nfl-prop-history-settlements.json"),
    JSON.stringify(settlements, null, 2),
  );
  console.error(`\nWrote ${outPath}`);
  console.error(
    `Settlements=${settlements.length} covered=${coveredIds.size}/${TOP_N} solutions=${solutions.length}`,
  );
  console.log(
    JSON.stringify(
      {
        outPath,
        coverage: report.coverage,
        priceEv: {
          overallTwoWay: priceEv.overallTwoWay,
          byProp: priceEv.byProp.slice(0, 12),
          byVenue: priceEv.byVenue,
        },
        openingPriors: {
          openN: openingPriors.openN,
          venue: openingPriors.venue,
        },
        solutions,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
