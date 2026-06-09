/**
 * BallDontLie GOAT trial — seed WC futures (R16 vs outright) + matches into KV.
 *
 * Requires BALLDONTLIE_API_KEY (GOAT tier, 5 req/min during trial).
 *
 * Local direct (uses Vercel KV from .env if set, else in-memory):
 *   npm run seed:bdl-wc-goat
 *   npm run seed:bdl-wc-goat -- --futures-only
 *   npm run seed:bdl-wc-goat -- --with-players --with-rosters
 *
 * Production HTTP (after deploy):
 *   $env:CRON_SECRET="..."; $env:WARM_BASE_URL="https://under-review.app"; npm run seed:bdl-wc-goat
 */
import "dotenv/config";

const direct = process.argv.includes("--direct");
const futuresOnly = process.argv.includes("--futures-only");
const withPlayers = process.argv.includes("--with-players");
const withRosters = process.argv.includes("--with-rosters");

async function seedViaHttp() {
  const base = (
    process.env.WARM_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3001"
  ).replace(/\/$/, "");

  const secret = process.env.CRON_SECRET;
  const headers = secret ? { Authorization: `Bearer ${secret}` } : {};

  const params = new URLSearchParams({ view: "bdl_seed", refresh: "1" });
  if (futuresOnly) params.set("matches", "0");
  if (withPlayers) params.set("players", "1");
  if (withRosters) params.set("rosters", "1");

  const url = `${base}/api/world-cup?${params.toString()}`;
  const res = await fetch(url, { method: "GET", headers, cache: "no-store" });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${url}`);
    err.body = body;
    throw err;
  }

  return { mode: "http", url, ...body };
}

async function seedDirect() {
  const { scrapeAndCacheWcBdlGoatSeed } = await import("../api/_wcBdlSeed.js");
  const result = await scrapeAndCacheWcBdlGoatSeed({
    includeMatches: !futuresOnly,
    includePlayers: withPlayers,
    includeRosters: withRosters,
  });
  return { mode: "direct", ...result };
}

try {
  const result = direct ? await seedDirect() : await seedViaHttp();
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  if (!result.ok) process.exit(1);
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: err?.message, body: err?.body }, null, 2));
  process.exit(1);
}
