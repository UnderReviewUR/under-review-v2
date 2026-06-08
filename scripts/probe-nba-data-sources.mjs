/**
 * Audit BallDontLie + Odds API + fallback coverage for tonight's NBA board.
 * Usage: node scripts/probe-nba-data-sources.mjs
 */
import "dotenv/config";
import { getEnv } from "../api/_env.js";
import { bdlFetch } from "../api/_balldontlie.js";
import {
  fetchNbaSpreadsFromOddsApi,
  fetchNbaTotalsFromOddsApi,
  buildGameTotalsFromSlate,
  hydrateNbaGameSpreads,
} from "../api/_gameOddsPipeline.js";
import { fetchPlayerInjuries } from "../api/nba.js";
import { getEtDateString, getTomorrowEtDateString } from "../shared/nbaPlayoffSlateFromActionNetwork.js";

const bdlKey = getEnv("BALLDONTLIE_API_KEY");
const oddsKey = getEnv("ODDS_API_KEY");

async function probeBdl() {
  const today = getEtDateString();
  const tomorrow = getTomorrowEtDateString(today);
  const out = {
    keyPresent: Boolean(bdlKey),
    today,
    tomorrow,
    endpoints: {},
  };
  if (!bdlKey) return out;

  for (const [label, path, params] of [
    ["games_today", "/v1/games", { "dates[]": today, per_page: 25, postseason: true }],
    ["games_tomorrow", "/v1/games", { "dates[]": tomorrow, per_page: 25, postseason: true }],
    ["injuries", "/v1/player_injuries", { per_page: 5 }],
    ["active_players_nyk", "/v1/players/active", { team_ids: [20], per_page: 5 }],
    ["active_players_sas", "/v1/players/active", { team_ids: [27], per_page: 5 }],
  ]) {
    const res = await bdlFetch(path, params, { apiKey: bdlKey, timeoutMs: 12000 });
    const rows = Array.isArray(res.data?.data) ? res.data.data : [];
    out.endpoints[label] = {
      ok: res.ok,
      status: res.status,
      rowCount: rows.length,
      sample: rows.slice(0, 2),
      error: res.error || null,
    };
  }

  const injuryMap = await fetchPlayerInjuries(bdlKey);
  const finalsInjuries = Object.values(injuryMap || {}).filter((r) =>
    ["NYK", "SAS"].includes(String(r?.team || "").toUpperCase()),
  );
  out.finalsInjuryCount = finalsInjuries.length;
  out.finalsInjurySample = finalsInjuries.slice(0, 5).map((r) => ({
    player: r.player,
    team: r.team,
    status: r.status,
  }));

  return out;
}

async function probeOddsApi() {
  const out = { keyPresent: Boolean(oddsKey) };
  if (!oddsKey) return out;

  const spreads = await fetchNbaSpreadsFromOddsApi(oddsKey);
  const totals = await fetchNbaTotalsFromOddsApi(oddsKey);
  out.spreadsOk = spreads.ok;
  out.spreadsCount = spreads.byGameKey?.size ?? 0;
  out.spreadsSample = [...(spreads.byGameKey?.values() || [])]
    .filter((r) => /SAS|NYK|Spurs|Knicks/i.test(`${r.awayAbbr} ${r.homeAbbr}`))
    .slice(0, 2)
    .map((r) => ({
      gameKey: r.gameKey,
      displayLine: r.displayLine,
      source: r.source,
    }));

  out.totalsOk = totals.ok;
  out.totalsCount = totals.byGameKey?.size ?? 0;
  out.totalsSample = [...(totals.byGameKey?.values() || [])]
    .filter((r) => /SAS|NYK/i.test(`${r.awayAbbr} ${r.homeAbbr}`))
    .slice(0, 2)
    .map((r) => ({ gameKey: r.gameKey, total: r.total, source: r.source }));

  if (!spreads.ok || !totals.ok) {
    out.note =
      "Odds API request failed — board will fall back to ESPN / Action Network scrapers for spreads and ESPN for totals.";
  }
  return out;
}

async function probeBoard() {
  const { default: nbaHandler } = await import("../api/nba.js");
  let board = null;
  const res = {
    setHeader() {},
    status() {
      return this;
    },
    json(p) {
      board = p;
      return this;
    },
  };
  await nbaHandler({ method: "GET", query: { view: "board" }, headers: {} }, res);
  if (!board) return { error: "empty_board" };

  const finals = (board.todaysGames || []).find((g) => {
    const a = String(g?.awayTeam?.abbr || "").toUpperCase();
    const h = String(g?.homeTeam?.abbr || "").toUpperCase();
    return (a === "SAS" && h === "NYK") || (a === "NYK" && h === "SAS");
  });
  const matchup = finals ? `${finals.awayTeam?.abbr} @ ${finals.homeTeam?.abbr}` : null;

  return {
    fetchedAt: board.fetchedAt,
    matchup,
    playerCount: board.playerStats?.length || 0,
    injuryCount: board.injuries?.length || 0,
    propLinesCount: board.propLines?.length || 0,
    propsOddsPlayers: board.propsOdds?.players?.length || 0,
    statsSource: board.statsSource,
    rosterQuality: board.rosterGrounding?.rosterGroundingQuality,
    spread: matchup ? board.spreads?.[matchup] : null,
    total: matchup ? board.gameTotals?.[matchup] : null,
    spreadSource: matchup ? board.spreads?.[matchup]?.source : null,
    totalSource: matchup ? board.gameTotals?.[matchup]?.source : null,
  };
}

const report = {
  probedAt: new Date().toISOString(),
  balldontlie: await probeBdl(),
  oddsApi: await probeOddsApi(),
  board: await probeBoard(),
};

console.log(JSON.stringify(report, null, 2));
