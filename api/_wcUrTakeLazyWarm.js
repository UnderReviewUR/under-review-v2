/**
 * Lazy KV warm on World Cup UR Take — refresh stale Golden Boot, sims, outrights before context build.
 */

import { getDurableJson } from "./_durableStore.js";
import { readWcOutrightsFromKv, scrapeAndCacheWcOutrights, scrapeAndCacheWcStandingsAndFixtures } from "./_wcData.js";
import { scrapeAndCacheWcGoldenBoot } from "./_wcGoldenBootOdds.js";
import { scrapeAndCacheWcGoldenGlove } from "./_wcGoldenGloveOdds.js";
import { scrapeAndCacheWcTournamentSim } from "./_wcTournamentSimData.js";
import { isKvFresh } from "../shared/selfHealingKv.js";
import {
  WC_GOLDEN_BOOT_KV_KEY,
  WC_GOLDEN_BOOT_MAX_AGE_MS,
  WC_GOLDEN_GLOVE_KV_KEY,
  WC_GOLDEN_GLOVE_MAX_AGE_MS,
} from "../shared/wc2026PlayerConstants.js";
import {
  WC_OUTRIGHTS_SCRAPE_INTERVAL_MS,
  WC_STANDINGS_SCRAPE_INTERVAL_MS,
  WC_TOURNAMENT_SIM_KV_KEY,
  WC_TOURNAMENT_SIM_SCRAPE_INTERVAL_MS,
} from "../shared/wc2026Constants.js";

const LAZY_WARM_TASK_TIMEOUT_MS = 4500;
const LAZY_WARM_TOTAL_BUDGET_MS = 8000;

/**
 * @param {Promise<unknown>} promise
 * @param {number} ms
 * @param {string} label
 */
async function withTimeout(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * @param {number} [nowMs]
 */
export async function resolveWcLazyWarmPlan(nowMs = Date.now()) {
  /** @type {Array<"golden_boot"|"golden_glove"|"tournament_sim"|"outrights"|"standings">} */
  const tasks = [];

  const gbKv = await getDurableJson(WC_GOLDEN_BOOT_KV_KEY);
  const gbStale =
    !gbKv?.rows?.length ||
    !isKvFresh(gbKv?.lastUpdated, WC_GOLDEN_BOOT_MAX_AGE_MS, nowMs) ||
    String(gbKv?.source || "").includes("seed");
  if (gbStale) tasks.push("golden_boot");

  const ggKv = await getDurableJson(WC_GOLDEN_GLOVE_KV_KEY);
  const ggStale =
    !ggKv?.rows?.length ||
    !isKvFresh(ggKv?.lastUpdated, WC_GOLDEN_GLOVE_MAX_AGE_MS, nowMs) ||
    String(ggKv?.source || "").includes("seed");
  if (ggStale) tasks.push("golden_glove");

  const simKv = await getDurableJson(WC_TOURNAMENT_SIM_KV_KEY);
  const simStale =
    !simKv?.teamStats ||
    !isKvFresh(simKv?.lastUpdated, WC_TOURNAMENT_SIM_SCRAPE_INTERVAL_MS, nowMs);
  if (simStale) tasks.push("tournament_sim");

  const outrightsKv = await readWcOutrightsFromKv(nowMs);
  const outrightsStale =
    !outrightsKv?.outrights ||
    !Object.keys(outrightsKv.outrights || {}).length ||
    Boolean(outrightsKv.stale) ||
    !isKvFresh(outrightsKv?.lastUpdated, WC_OUTRIGHTS_SCRAPE_INTERVAL_MS, nowMs);
  if (outrightsStale) tasks.push("outrights");

  if (gbStale || simStale || outrightsStale || ggStale) {
    tasks.push("standings");
  }

  return [...new Set(tasks)];
}

/**
 * @param {number} [nowMs]
 * @param {{ maxTotalMs?: number }} [opts]
 */
export async function maybeWarmWcUrTakeKv(nowMs = Date.now(), opts = {}) {
  const maxTotalMs = Number(opts.maxTotalMs) || LAZY_WARM_TOTAL_BUDGET_MS;
  const started = Date.now();
  const plan = await resolveWcLazyWarmPlan(nowMs);
  if (!plan.length) {
    return { warmed: false, plan: [], results: [], elapsedMs: 0 };
  }

  /** @type {Array<{ task: string, ok: boolean, error?: string }>} */
  const results = [];

  for (const task of plan) {
    if (Date.now() - started >= maxTotalMs) {
      results.push({ task, ok: false, error: "budget_exhausted" });
      break;
    }

    const remaining = Math.max(500, maxTotalMs - (Date.now() - started));
    const taskTimeout = Math.min(LAZY_WARM_TASK_TIMEOUT_MS, remaining);

    try {
      if (task === "golden_boot") {
        await withTimeout(scrapeAndCacheWcGoldenBoot(), taskTimeout, "golden_boot");
      } else if (task === "golden_glove") {
        await withTimeout(scrapeAndCacheWcGoldenGlove(), taskTimeout, "golden_glove");
      } else if (task === "tournament_sim") {
        await withTimeout(scrapeAndCacheWcTournamentSim({ nowMs }), taskTimeout, "tournament_sim");
      } else if (task === "outrights") {
        await withTimeout(scrapeAndCacheWcOutrights(), taskTimeout, "outrights");
      } else if (task === "standings") {
        await withTimeout(scrapeAndCacheWcStandingsAndFixtures(), taskTimeout, "standings");
      }
      results.push({ task, ok: true });
    } catch (err) {
      results.push({ task, ok: false, error: err?.message || "warm_failed" });
    }
  }

  const elapsedMs = Date.now() - started;
  console.log(
    JSON.stringify({
      event: "wc_urtake_lazy_warm",
      plan,
      results,
      elapsedMs,
    }),
  );

  return {
    warmed: results.some((r) => r.ok),
    plan,
    results,
    elapsedMs,
  };
}
