/**
 * GOAT-primary prefetch — exhaust BallDontLie before UR Take context reads ESPN/scrape KV.
 */

import { getDurableJson } from "./_durableStore.js";
import {
  scrapeAndCacheWcOutrights,
  scrapeAndCacheWcStandingsAndFixtures,
} from "./_wcData.js";
import {
  scrapeAndCacheWcBdlGoldenBoot,
  scrapeAndCacheWcBdlReferenceCatalog,
} from "./_wcBdlData.js";
import { scrapeAndCacheWcBdlGoatSeed } from "./_wcBdlSeed.js";
import { scrapeAndCacheWcGoldenBoot } from "./_wcGoldenBootOdds.js";
import {
  isWcGoatPrimaryEnabled,
  shouldPreferBdlRefreshOverKv,
} from "../shared/wcBdlPolicy.js";
import {
  WC_GOLDEN_BOOT_KV_KEY,
  WC_GOLDEN_BOOT_MAX_AGE_MS,
  WC_PLAYERS_KV_KEY,
} from "../shared/wc2026PlayerConstants.js";
import {
  WC_GROUPS_KV_KEY,
  WC_MATCHES_KV_KEY,
  WC_OUTRIGHTS_KV_KEY,
} from "../shared/wc2026Constants.js";
import { isKvFresh } from "../shared/selfHealingKv.js";
import { warmWcBdlMatchPlayerPropsForMatches } from "./_wcBdlMatchPropsWarm.js";

const PREFETCH_STEP_TIMEOUT_MS = 4000;

/**
 * @param {Promise<unknown>} promise
 * @param {number} ms
 * @param {string} label
 */
async function withStepTimeout(promise, ms, label) {
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
 * @param {{ timeoutMs?: number, runId?: string }} [opts]
 */
export async function prefetchWcGoatDataForUrTake(nowMs = Date.now(), opts = {}) {
  if (!isWcGoatPrimaryEnabled()) {
    return { skipped: true, reason: "goat_primary_off", steps: [] };
  }

  const budgetMs = Number(opts.timeoutMs) || 5500;
  const started = Date.now();
  const runId = opts.runId || "prefetch";
  /** @type {Array<Record<string, unknown>>} */
  const steps = [];

  /**
   * @param {string} step
   * @param {() => Promise<Record<string, unknown>>} fn
   */
  async function runStep(step, fn) {
    if (Date.now() - started >= budgetMs) {
      steps.push({ step, ok: false, error: "budget_exhausted" });
      return null;
    }
    const remaining = Math.max(800, budgetMs - (Date.now() - started));
    const stepTimeout = Math.min(PREFETCH_STEP_TIMEOUT_MS, remaining);
    try {
      const data = await withStepTimeout(fn(), stepTimeout, step);
      const entry = { step, ok: true, ...data };
      steps.push(entry);
      return data;
    } catch (err) {
      const entry = { step, ok: false, error: err?.message || "step_failed" };
      steps.push(entry);
      return null;
    }
  }

  await runStep("bdl_standings_matches", async () => {
    const [groupsKv, matchesKv] = await Promise.all([
      getDurableJson(WC_GROUPS_KV_KEY),
      getDurableJson(WC_MATCHES_KV_KEY),
    ]);
    const needsRefresh =
      shouldPreferBdlRefreshOverKv(groupsKv) || shouldPreferBdlRefreshOverKv(matchesKv);
    if (!needsRefresh) {
      return {
        skipped: true,
        groupsSource: groupsKv?.source || null,
        matchesSource: matchesKv?.source || null,
      };
    }
    const r = await scrapeAndCacheWcStandingsAndFixtures();
    const refreshedGroups = await getDurableJson(WC_GROUPS_KV_KEY);
    const refreshedMatches = await getDurableJson(WC_MATCHES_KV_KEY);
    return {
      refreshed: Boolean(r?.ok),
      groupsSource: refreshedGroups?.source || null,
      matchesSource: refreshedMatches?.source || null,
    };
  });

  await runStep("bdl_reference_catalog", async () => {
    const playersKv = await getDurableJson(WC_PLAYERS_KV_KEY);
    if (!shouldPreferBdlRefreshOverKv(playersKv)) {
      return { skipped: true, source: playersKv?.source || null };
    }
    const r = await scrapeAndCacheWcBdlReferenceCatalog();
    return {
      refreshed: Boolean(r?.ok),
      players: r?.players ?? r?.counts?.players ?? 0,
      source: "balldontlie_players_rosters",
    };
  });

  await runStep("bdl_outrights_futures", async () => {
    const outrightsKv = await getDurableJson(WC_OUTRIGHTS_KV_KEY);
    if (!shouldPreferBdlRefreshOverKv({ source: outrightsKv?.sourceTier || outrightsKv?.source })) {
      return { skipped: true, sourceTier: outrightsKv?.sourceTier || null };
    }
    const r = await scrapeAndCacheWcOutrights();
    await scrapeAndCacheWcBdlGoatSeed().catch(() => null);
    return { refreshed: Boolean(r?.ok), sourceTier: r?.sourceTier || r?.source || null };
  });

  await runStep("bdl_match_player_props_warm", async () => {
    const matchesKv = await getDurableJson(WC_MATCHES_KV_KEY);
    const matches = Array.isArray(matchesKv?.matches) ? matchesKv.matches : [];
    if (!matches.length) {
      return { skipped: true, reason: "no_matches" };
    }
    return warmWcBdlMatchPlayerPropsForMatches(matches, nowMs, { maxMatches: 12 });
  });

  await runStep("bdl_golden_boot_probe", async () => {
    const gbKv = await getDurableJson(WC_GOLDEN_BOOT_KV_KEY);
    const gbStale =
      !gbKv?.rows?.length ||
      !isKvFresh(gbKv?.lastUpdated, WC_GOLDEN_BOOT_MAX_AGE_MS, nowMs) ||
      String(gbKv?.source || "").includes("seed");
    if (!gbStale && !shouldPreferBdlRefreshOverKv(gbKv)) {
      return { skipped: true, source: gbKv?.source || null, rowCount: gbKv?.rows?.length || 0 };
    }
    const bdl = await scrapeAndCacheWcBdlGoldenBoot();
    if (bdl?.ok && bdl?.rows?.length) {
      return { source: "balldontlie", rowCount: bdl.rows.length, bdlExhausted: false };
    }
    const fallback = await scrapeAndCacheWcGoldenBoot();
    return {
      source: fallback?.source || "espn_fallback",
      rowCount: fallback?.rows?.length || 0,
      bdlExhausted: true,
      bdlError: bdl?.error || null,
    };
  });

  const elapsedMs = Date.now() - started;
  const summary = {
    skipped: false,
    elapsedMs,
    steps,
    matchesSource: (await getDurableJson(WC_MATCHES_KV_KEY))?.source || null,
    groupsSource: (await getDurableJson(WC_GROUPS_KV_KEY))?.source || null,
    playersSource: (await getDurableJson(WC_PLAYERS_KV_KEY))?.source || null,
  };

  console.log(JSON.stringify({ event: "wc_goat_urtake_prefetch", ...summary }));

  return summary;
}
