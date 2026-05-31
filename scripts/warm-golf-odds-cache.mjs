/**
 * Post-deploy: populate PGA Championship odds KV so home card + UR Take have lines
 * before the next cron tick (required for final-round Sunday if you deploy late).
 *
 * Production:
 *   $env:CRON_SECRET="..."; $env:WARM_BASE_URL="https://under-review.app"; npm run warm:golf-odds
 *
 * Local API (dev:api on :3001):
 *   npm run warm:golf-odds
 *
 * Direct scrape (no HTTP — uses KV/env from .env):
 *   npm run warm:golf-odds -- --direct
 */
import "dotenv/config";
import { scrapeAndCachePgaChampionshipOdds } from "../api/_golfPgaChampionshipOdds.js";
import { scrapeAndCachePgaTourOdds } from "../api/_golfPgaTourOdds.js";

const direct = process.argv.includes("--direct");
const tournamentIdArg = process.argv.find((arg) => arg.startsWith("--tournamentId="));
const tournamentId = tournamentIdArg ? tournamentIdArg.split("=").slice(1).join("=").trim() : "";

async function warmViaHttp() {
  const base = (
    process.env.WARM_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3001"
  ).replace(/\/$/, "");

  const secret = process.env.CRON_SECRET;
  const headers = secret ? { Authorization: `Bearer ${secret}` } : {};

  const url = `${base}/api/golf-odds-scrape${tournamentId ? `?tournamentId=${encodeURIComponent(tournamentId)}` : ""}`;
  const res = await fetch(url, { method: "GET", headers, cache: "no-store" });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${url}`);
    err.body = body;
    err.status = res.status;
    throw err;
  }

  return { mode: "http", url, ...body };
}

async function warmDirect() {
  const odds = tournamentId
    ? await scrapeAndCachePgaTourOdds(tournamentId)
    : await scrapeAndCachePgaChampionshipOdds({ forcePuppeteer: false });
  return {
    mode: "direct",
    source:
      odds?.source ||
      odds?.scrapeMethod ||
      (tournamentId ? "pgatour_site" : "pga_championship_site"),
    tournamentId: odds?.tournamentId || tournamentId || null,
    fetchedAt: odds?.fetchedAt,
    posted: odds?.hasPostedLines,
    outrightCount: Array.isArray(odds?.outrights) ? odds.outrights.length : 0,
    freshness: odds?.freshness || null,
  };
}

try {
  let result;
  if (direct) {
    result = await warmDirect();
  } else {
    try {
      result = await warmViaHttp();
    } catch (err) {
      const refused =
        err?.cause?.code === "ECONNREFUSED" ||
        err?.message?.includes("fetch failed") ||
        err?.status === 401;
      if (!refused && err?.status !== 404) throw err;
      console.warn("[warm:golf-odds] HTTP warm failed — falling back to direct scrape");
      result = await warmDirect();
    }
  }
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
} catch (err) {
  console.error("[warm:golf-odds]", err?.message || err);
  if (err?.body) console.error(err.body);
  process.exit(1);
}
