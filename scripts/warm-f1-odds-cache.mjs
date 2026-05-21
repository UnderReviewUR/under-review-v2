/**
 * Warm F1 Smarkets odds KV.
 *
 *   npm run warm:f1-odds
 *   npm run warm:f1-odds -- --direct
 *   npm run warm:f1-odds -- --direct --eventId=45053151
 */
import "dotenv/config";
import { scrapeAndCacheF1Odds } from "../api/_f1Odds.js";

const direct = process.argv.includes("--direct");
const eventArg = process.argv.find((a) => a.startsWith("--eventId="));
const eventId = eventArg ? eventArg.split("=")[1] : undefined;

async function warmDirect() {
  const odds = await scrapeAndCacheF1Odds(eventId);
  const sample = (odds.markets?.raceWinner || []).slice(0, 5).map((r) => ({
    driverName: r.driverName,
    americanOdds: r.americanOdds,
    decimalOdds: r.decimalOdds,
  }));
  return {
    mode: "direct",
    eventId: odds.eventId,
    raceName: odds.raceName,
    raceStartMs: odds.raceStartMs,
    fetchedAt: odds.fetchedAt,
    posted: odds.hasPostedLines,
    freshness: odds.freshness,
    raceWinnerSample: sample,
    fastestLapSample: (odds.markets?.fastestLap || []).slice(0, 3),
  };
}

try {
  if (!direct) {
    console.error("Use --direct for local warm (no HTTP route yet).");
    process.exit(1);
  }
  const result = await warmDirect();
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  const bad = (result.raceWinnerSample || []).filter(
    (r) => r.americanOdds == null || !Number.isFinite(r.americanOdds),
  );
  if (!result.posted || bad.length === result.raceWinnerSample?.length) {
    console.error("[warm:f1-odds] No valid americanOdds on race winner sample");
    process.exit(1);
  }
} catch (err) {
  console.error("[warm:f1-odds]", err?.message || err);
  if (err?.body) console.error(err.body);
  process.exit(1);
}
