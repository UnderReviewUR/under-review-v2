/**
 * Warm NBA props KV via /api/nba-props-scrape (or direct scrape).
 *
 *   $env:CRON_SECRET="..."; $env:WARM_BASE_URL="https://under-review.app"; npm run warm:nba-props
 *   npm run warm:nba-props -- --direct
 *   npm run warm:nba-props -- --direct --gameId=<action_network_event_id>
 */
import "dotenv/config";
import { scrapeAndCacheNbaProps } from "../api/_nbaProps.js";

const direct = process.argv.includes("--direct");
const gameArg = process.argv.find((a) => a.startsWith("--gameId="));
const gameId = gameArg ? gameArg.split("=")[1] : null;

async function warmViaHttp() {
  const base = (
    process.env.WARM_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3001"
  ).replace(/\/$/, "");

  const secret = process.env.CRON_SECRET;
  const headers = secret ? { Authorization: `Bearer ${secret}` } : {};
  const qs = gameId ? `?gameId=${encodeURIComponent(gameId)}` : "";
  const url = `${base}/api/nba-props-scrape${qs}`;

  const res = await fetch(url, { method: "GET", headers, cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${url}`);
    err.body = body;
    throw err;
  }
  return { mode: "http", url, ...body };
}

async function warmDirect() {
  const props = await scrapeAndCacheNbaProps(gameId);
  return {
    mode: "direct",
    gameId: props.gameId,
    source: props.source,
    scrapeMethod: props.scrapeMethod,
    fetchedAt: props.fetchedAt,
    posted: props.hasPostedLines,
    playerCount: props.playerCount,
    freshness: props.freshness,
  };
}

try {
  const result = direct ? await warmDirect() : await warmViaHttp();
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
} catch (err) {
  console.error("[warm:nba-props]", err?.message || err);
  if (err?.body) console.error(err.body);
  process.exit(1);
}
