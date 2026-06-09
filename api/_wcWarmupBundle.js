/**
 * Cron / manual World Cup KV warmup — standings, outrights, Golden Boot, sims.
 * Vercel cron: 15:00 + 23:00 UTC daily (~11am + 7pm US Eastern in summer).
 * Per-match odds still refresh on the 5-min scrape-scheduler (tighter near kickoff).
 */

import {
  scrapeAndCacheWcOutrights,
  scrapeAndCacheWcStandingsAndFixtures,
} from "./_wcData.js";
import { scrapeAndCacheWcGoldenBoot } from "./_wcGoldenBootOdds.js";
import { scrapeAndCacheWcTournamentSim } from "./_wcTournamentSimData.js";
import { scrapeAndCacheWcPlayers } from "./_wcPlayersData.js";
import { scrapeAndCacheWcInjuries } from "./_wcInjuriesData.js";
import { isWcGoatPrimaryEnabled } from "../shared/wcBdlPolicy.js";
import { scrapeAndCacheWcBdlStandingsAndFixtures, scrapeAndCacheWcBdlReferenceCatalog } from "./_wcBdlData.js";

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
  if ((k === "all" || k === "bdl") && isWcGoatPrimaryEnabled()) {
    await run("bdl_core", () => scrapeAndCacheWcBdlStandingsAndFixtures());
    await run("bdl_reference", () => scrapeAndCacheWcBdlReferenceCatalog());
  }
  if (k === "all" || k === "players") {
    if (isWcGoatPrimaryEnabled()) {
      await run("bdl_players", () => scrapeAndCacheWcBdlReferenceCatalog());
    }
    await run("players", () => scrapeAndCacheWcPlayers());
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
  if (k === "all" || k === "injuries") {
    await run("injuries", () => scrapeAndCacheWcInjuries());
  }

  const ok = Object.values(results).every((r) => r && typeof r === "object" && r.ok !== false);

  return {
    ok,
    kind: k,
    nowMs,
    results,
  };
}
