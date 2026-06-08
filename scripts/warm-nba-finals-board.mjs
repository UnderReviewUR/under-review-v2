/**
 * Pre-tipoff NBA Finals board warm — props + spreads/totals with retries and fallbacks.
 *
 *   npm run warm:nba-finals
 *   npm run warm:nba-finals -- --attempts=6 --interval-ms=300000
 *   npm run warm:nba-finals -- --until-tipoff
 *   npm run warm:nba-finals -- --direct
 *
 * Env: BALLDONTLIE_API_KEY, ODDS_API_KEY, CRON_SECRET (for remote warmup)
 */
import "dotenv/config";
import { scrapeAndCacheNbaProps } from "../api/_nbaProps.js";
import {
  hydrateNbaGameSpreads,
  buildGameTotalsFromSlate,
  refreshDueNbaGameOddsSnapshots,
} from "../api/_gameOddsPipeline.js";
import { getEnv } from "../api/_env.js";

const args = process.argv.slice(2);
const direct = args.includes("--direct");
const untilTipoff = args.includes("--until-tipoff");
const attemptsArg = args.find((a) => a.startsWith("--attempts="));
const intervalArg = args.find((a) => a.startsWith("--interval-ms="));
const maxAttempts = attemptsArg ? Math.max(1, Number(attemptsArg.split("=")[1]) || 1) : untilTipoff ? 999 : 3;
const intervalMs = intervalArg ? Math.max(30_000, Number(intervalArg.split("=")[1]) || 120_000) : 120_000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseTipoffMs(games) {
  let best = null;
  for (const g of games || []) {
    const t = Date.parse(String(g?.startTimeUtc || g?.commenceTime || ""));
    if (!Number.isFinite(t)) continue;
    if (best == null || t < best) best = t;
  }
  return best;
}

function summarizeBoard(board) {
  const finals = (board?.todaysGames || []).find((g) => {
    const a = String(g?.awayTeam?.abbr || "").toUpperCase();
    const h = String(g?.homeTeam?.abbr || "").toUpperCase();
    return (a === "SAS" && h === "NYK") || (a === "NYK" && h === "SAS");
  });
  const label = finals ? `${finals.awayTeam?.abbr} @ ${finals.homeTeam?.abbr}` : null;
  const spread = label ? board?.spreads?.[label] : null;
  const total = label ? board?.gameTotals?.[label] : null;
  return {
    matchup: label,
    players: board?.playerStats?.length || 0,
    injuries: board?.injuries?.length || 0,
    propLines: board?.propLines?.length || 0,
    propsOddsPlayers: board?.propsOdds?.players?.length || 0,
    spreadLine: spread?.displayLine || spread?.current?.displayLine || null,
    spreadSource: spread?.source || spread?.current?.source || null,
    totalLine: total?.total ?? null,
    totalSource: total?.source || null,
    rosterQuality: board?.rosterGrounding?.rosterGroundingQuality || null,
  };
}

async function warmPropsDirect() {
  try {
    const props = await scrapeAndCacheNbaProps();
    return {
      ok: true,
      playerCount: props.playerCount,
      posted: props.hasPostedLines,
      scrapeMethod: props.scrapeMethod,
    };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

async function warmPropsHttp() {
  const base = (
    process.env.WARM_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3001"
  ).replace(/\/$/, "");
  const secret = process.env.CRON_SECRET;
  const headers = secret ? { Authorization: `Bearer ${secret}` } : {};
  const res = await fetch(`${base}/api/nba-props-scrape`, { method: "GET", headers, cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, ...body };
}

async function fetchFreshBoard() {
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
  await nbaHandler({ method: "GET", query: { view: "board", warmup: "1" }, headers: {} }, res);
  return board;
}

async function warmOddsLayers(board) {
  const oddsKey = getEnv("ODDS_API_KEY");
  const games = board?.todaysGames || [];
  const [spreads, totals, refresh] = await Promise.all([
    hydrateNbaGameSpreads(games, oddsKey),
    buildGameTotalsFromSlate(games, oddsKey),
    refreshDueNbaGameOddsSnapshots(games, oddsKey),
  ]);
  return {
    spreadKeys: Object.keys(spreads.spreads || {}),
    totalKeys: Object.keys(totals || {}),
    oddsRefreshCount: refresh.refreshed,
  };
}

async function runOnce(attempt) {
  const props = direct ? await warmPropsDirect() : await warmPropsHttp();
  const board = await fetchFreshBoard();
  const odds = board ? await warmOddsLayers(board) : null;
  const summary = summarizeBoard(board);
  const ready =
    summary.propLines > 0 || summary.propsOddsPlayers > 0
      ? Boolean(summary.spreadLine || summary.totalLine)
      : Boolean(summary.spreadLine);

  const payload = {
    attempt,
    at: new Date().toISOString(),
    props,
    odds,
    summary,
    ready,
  };
  console.log(JSON.stringify(payload, null, 2));
  return { board, ready, tipoffMs: parseTipoffMs(board?.todaysGames) };
}

let attempt = 0;
while (attempt < maxAttempts) {
  attempt += 1;
  const { ready, tipoffMs } = await runOnce(attempt);
  const now = Date.now();
  if (untilTipoff && Number.isFinite(tipoffMs) && now >= tipoffMs) {
    console.log(JSON.stringify({ event: "warm_nba_finals_stop", reason: "tipoff_reached" }));
    break;
  }
  if (ready && !untilTipoff) {
    console.log(JSON.stringify({ event: "warm_nba_finals_stop", reason: "ready" }));
    break;
  }
  if (attempt >= maxAttempts) break;
  if (untilTipoff && Number.isFinite(tipoffMs) && tipoffMs - now < intervalMs) {
    const wait = Math.max(15_000, tipoffMs - now - 60_000);
    console.log(JSON.stringify({ event: "warm_nba_finals_wait", waitMs: wait, until: "pre_tipoff" }));
    await sleep(wait);
  } else {
    console.log(JSON.stringify({ event: "warm_nba_finals_wait", waitMs: intervalMs }));
    await sleep(intervalMs);
  }
}

process.exit(0);
