/**
 * Live Odds API usage smoke: prints `odds_api_usage` JSON lines with real x-requests-* headers.
 *
 * Usage (repo root):
 *   PowerShell: $env:ODDS_API_KEY="your_key"; node scripts/odds-api-usage-smoke.mjs
 */
import "dotenv/config";
import { logOddsApiUsage, computeExpectedOddsCredits, redactOddsApiUrl } from "../api/_oddsApiUsageLog.js";

const key = process.env.ODDS_API_KEY;
if (!key) {
  console.error("Set ODDS_API_KEY to run live Odds API header verification.");
  process.exit(1);
}

async function fetchAndLog(label, url) {
  const res = await fetch(url, { cache: "no-store" });
  logOddsApiUsage({ label, url, response: res });
  try {
    await res.json();
  } catch {
    /* ignore body parse errors */
  }
  return res;
}

console.log("\n--- A) Minimal URLs (same query shapes as production) ---\n");

const nbaList = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${key}&regions=us&markets=h2h&oddsFormat=american`;
await fetchAndLog("smoke.nba.events_list", nbaList);

const listRes = await fetch(nbaList, { cache: "no-store" });
const listData = await listRes.json().catch(() => []);
const first = Array.isArray(listData) && listData[0]?.id ? listData[0].id : null;
if (first) {
  const propMarkets =
    "player_points,player_rebounds,player_assists,player_points_rebounds_assists";
  const nbaEvent = `https://api.the-odds-api.com/v4/sports/basketball_nba/events/${first}/odds?apiKey=${key}&regions=us&markets=${propMarkets}&oddsFormat=american`;
  await fetchAndLog(`smoke.nba.event_props:${first}`, nbaEvent);
} else {
  console.log(JSON.stringify({ event: "smoke_skip", reason: "no_nba_events_in_list" }));
}

const mlbTotals = `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/?apiKey=${key}&regions=us&markets=totals&oddsFormat=american`;
await fetchAndLog("smoke.mlb.totals_list", mlbTotals);

const mlbList = `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/?apiKey=${key}&regions=us&markets=h2h&oddsFormat=american`;
await fetchAndLog("smoke.mlb.events_list", mlbList);

const golfOut = `https://api.the-odds-api.com/v4/sports/golf_pga/odds/?apiKey=${key}&regions=us&markets=outrights&oddsFormat=american`;
const gRes = await fetch(golfOut, { cache: "no-store" });
logOddsApiUsage({ label: "smoke.golf.outrights_list", url: golfOut, response: gRes });
const gData = await gRes.json().catch(() => []);
const ge = Array.isArray(gData) && gData[0]?.id ? gData[0].id : null;
if (ge) {
  const golfEv = `https://api.the-odds-api.com/v4/sports/golf_pga/events/${ge}/odds?apiKey=${key}&regions=us&markets=top_10_finish,top_20_finish,make_cut&oddsFormat=american`;
  await fetchAndLog(`smoke.golf.event_markets:${ge}`, golfEv);
}

console.log("\n--- B) Optional: buildNbaUrTakeBoard (logs many odds_api_usage lines from nba.js) ---\n");

try {
  const { buildNbaUrTakeBoard } = await import("../api/nba.js");
  await buildNbaUrTakeBoard("Best player prop angle tonight?");
  console.log(JSON.stringify({ event: "smoke_nba_board", status: "buildNbaUrTakeBoard_finished" }));
} catch (e) {
  console.log(
    JSON.stringify({
      event: "smoke_nba_board_skipped",
      reason: String(e?.message || e),
    }),
  );
}

console.log("\n--- Summary row (formula only, no network) ---\n");
const sample = `https://api.the-odds-api.com/v4/sports/basketball_nba/events/demo/odds?apiKey=${key}&regions=us&markets=a,b,c,d&oddsFormat=american`;
console.log(
  JSON.stringify({
    event: "smoke_formula_sample",
    url: redactOddsApiUrl(sample),
    computeExpectedOddsCredits: computeExpectedOddsCredits(sample),
  }),
);
