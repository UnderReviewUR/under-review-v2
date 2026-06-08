/**
 * Cron / manual World Cup KV warmup — standings, outrights, Golden Boot, sims.
 */

import {
  scrapeAndCacheWcOutrights,
  scrapeAndCacheWcStandingsAndFixtures,
} from "./_wcData.js";
import { scrapeAndCacheWcGoldenBoot } from "./_wcGoldenBootOdds.js";
import { scrapeAndCacheWcTournamentSim } from "./_wcTournamentSimData.js";
import { scrapeAndCacheWcPlayers } from "./_wcPlayersData.js";
import { scrapeAndCacheWcInjuries } from "./_wcInjuriesData.js";
import { scrapeAndCacheWcApiFootball } from "./_wcApiFootballData.js";

/**
 * @param {string} [kind] — all | golden_boot | sim | outrights | standings | players
 * @param {number} [nowMs]
 */
export async function runWcWarmupBundle(kind = "all", nowMs = Date.now()) {
  const k = String(kind || "all").toLowerCase().replace(/-/g, "_");
  /** @type {Record<string, unknown>} */
  const results = {};

  const run = async (key, fn) => {
    try {
      results[key] = await fn();
      results[key] = { ...(results[key] || {}), ok: results[key]?.ok !== false };
    } catch (err) {
      results[key] = { ok: false, error: err?.message || "failed" };
    }
  };

  if (k === "all" || k === "standings") {
    await run("standings", () => scrapeAndCacheWcStandingsAndFixtures());
  }
  if (k === "all" || k === "outrights") {
    await run("outrights", () => scrapeAndCacheWcOutrights());
  }
  if (k === "all" || k === "golden_boot") {
    await run("golden_boot", () => scrapeAndCacheWcGoldenBoot());
  }
  if (k === "all" || k === "sim" || k === "tournament_sim") {
    await run("tournament_sim", () => scrapeAndCacheWcTournamentSim({ nowMs }));
  }
  if (k === "all" || k === "players") {
    await run("players", () => scrapeAndCacheWcPlayers());
  }
  if (k === "all" || k === "injuries") {
    await run("injuries", () => scrapeAndCacheWcInjuries());
  }
  if (k === "all" || k === "api_football") {
    await run("api_football", () => scrapeAndCacheWcApiFootball());
  }

  const ok = Object.values(results).every((r) => r && typeof r === "object" && r.ok !== false);

  return {
    ok,
    kind: k,
    nowMs,
    results,
  };
}
