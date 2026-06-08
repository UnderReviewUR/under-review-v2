/**
 * Dashboard-friendly player markets health summary.
 */

import { getDurableJson } from "./_durableStore.js";
import { readWcPlayersFromKv } from "./_wcPlayersData.js";
import {
  WC_GOLDEN_BOOT_KV_KEY,
  WC_INJURIES_KV_KEY,
  WC_MATCH_PLAYER_PROPS_KV_KEY,
  WC_GOLDEN_BOOT_MAX_AGE_MS,
  WC_PLAYER_MARKETS_OVERRIDE_KV_KEY,
  WC_API_FOOTBALL_KV_KEY,
} from "../shared/wc2026PlayerConstants.js";
import { wcApiFootballQuotaState } from "../shared/wcApiFootballQuota.js";
import { isWcApiFootballEnabled } from "../shared/wcApiFootballPolicy.js";
import { attachGoldenBootFreshness } from "../shared/wcPlayerOddsFreshness.js";
import { wcRosterCompleteness } from "../shared/wcRosterCompleteness.js";
import { readWcTournamentSimFromKv } from "./_wcTournamentSimData.js";
import { WC_TOURNAMENT_SIM_SCRAPE_INTERVAL_MS } from "../shared/wc2026Constants.js";
import { wcBookScrapeFlagsSnapshot, listEnabledWcGoldenBootBooks } from "../shared/wcBookScrapePolicy.js";
import { WC_GOLDEN_BOOT_SOURCE_COUNT } from "../shared/wcGoldenBootSourceRegistry.js";
import {
  WC_OUTRIGHTS_AGGREGATOR_COUNT,
  listEnabledWcOutrightsAggregators,
} from "../shared/wcOutrightsAggregatorRegistry.js";
import { readWcOutrightsFromKv } from "./_wcData.js";
import { getWcBreakingLineWithOverride } from "./_wcPlayerMarketsOverride.js";

/**
 * @param {number | null | undefined} lastUpdated
 * @param {number} maxAgeMs
 */
function staleHours(lastUpdated, maxAgeMs, nowMs = Date.now()) {
  const ts = Number(lastUpdated);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  const ageMs = nowMs - ts;
  if (ageMs <= maxAgeMs) return 0;
  return Math.round((ageMs / 3_600_000) * 10) / 10;
}

/**
 * @param {number} [nowMs]
 */
export async function buildWcPlayerMarketsStatus(nowMs = Date.now()) {
  const [playersKv, goldenBootRaw, injuries, matchProps, override, tournamentSim, apiFootball, outrightsKv] =
    await Promise.all([
      readWcPlayersFromKv(),
      getDurableJson(WC_GOLDEN_BOOT_KV_KEY),
      getDurableJson(WC_INJURIES_KV_KEY),
      getDurableJson(WC_MATCH_PLAYER_PROPS_KV_KEY),
      getDurableJson(WC_PLAYER_MARKETS_OVERRIDE_KV_KEY),
      readWcTournamentSimFromKv(WC_TOURNAMENT_SIM_SCRAPE_INTERVAL_MS, nowMs),
      getDurableJson(WC_API_FOOTBALL_KV_KEY),
      readWcOutrightsFromKv(nowMs),
    ]);

  const goldenBoot = attachGoldenBootFreshness(goldenBootRaw, nowMs);
  const roster = wcRosterCompleteness(playersKv || {});
  const injuryRows = Array.isArray(injuries?.rows) ? injuries.rows : [];
  const highImpact = injuryRows.filter((r) => r.impact === "high").length;
  const starsOut = Array.isArray(injuries?.starsOut) ? injuries.starsOut.length : 0;
  const byEventId =
    matchProps?.byEventId && typeof matchProps.byEventId === "object" ? matchProps.byEventId : {};
  const eventIds = Object.keys(byEventId);

  const breakingOverride = await getWcBreakingLineWithOverride();

  return {
    ok: true,
    generatedAt: nowMs,
    alerts: {
      goldenBootStaleHours: staleHours(goldenBoot?.lastUpdated, WC_GOLDEN_BOOT_MAX_AGE_MS, nowMs),
      goldenBootRowCount: Array.isArray(goldenBoot?.rows) ? goldenBoot.rows.length : 0,
      goldenBootStale: Boolean(goldenBoot?.stale),
      playerRegistryCoverage: {
        playerCount: roster.playerCount,
        teamCount: roster.teamCount,
        rosterComplete: roster.rosterComplete,
        rosterSource: playersKv?.source ?? "unknown",
      },
      activeInjuriesCount: injuryRows.length,
      highImpactInjuriesCount: highImpact,
      starsOutCount: starsOut,
      matchPropsEventCount: eventIds.length,
      hasManualOverride: Boolean(
        override?.breakingLine ||
          override?.goldenBootPatches?.length ||
          override?.injuryPatches?.length,
      ),
      hasBreakingOverride: Boolean(breakingOverride),
    },
    outrights: {
      lastUpdated: outrightsKv?.lastUpdated ?? null,
      source: outrightsKv?.source ?? null,
      sourceTier: outrightsKv?.sourceTier ?? null,
      rowCount: outrightsKv?.outrights ? Object.keys(outrightsKv.outrights).length : 0,
      stale: Boolean(outrightsKv?.stale),
      aggregatorsRegistered: WC_OUTRIGHTS_AGGREGATOR_COUNT,
      aggregatorsEnabledNow: listEnabledWcOutrightsAggregators().length,
      aggregatorsAttempted: outrightsKv?.aggregatorsAttempted ?? null,
      aggregatorsOk: outrightsKv?.aggregatorsOk ?? null,
    },
    goldenBoot: {
      lastUpdated: goldenBoot?.lastUpdated ?? null,
      source: goldenBoot?.source ?? null,
      booksUsed: goldenBoot?.booksUsed ?? [],
      rowCount: Array.isArray(goldenBoot?.rows) ? goldenBoot.rows.length : 0,
      stale: Boolean(goldenBoot?.stale),
      freshness: goldenBoot?.freshness ?? null,
      sourcesRegistered: WC_GOLDEN_BOOT_SOURCE_COUNT,
      sourcesEnabledNow: listEnabledWcGoldenBootBooks().length,
      sourcesAttempted: goldenBootRaw?.sourcesAttempted ?? null,
      sourcesOk: goldenBootRaw?.sourcesOk ?? null,
    },
    players: {
      lastUpdated: playersKv?.lastUpdated ?? null,
      source: playersKv?.source ?? null,
      playerCount: roster.playerCount,
      teamCount: roster.teamCount,
      rosterComplete: roster.rosterComplete,
    },
    injuries: {
      lastUpdated: injuries?.lastUpdated ?? null,
      rowCount: injuryRows.length,
      starsOutCount: starsOut,
      source: injuries?.source ?? null,
    },
    tournamentSim: {
      lastUpdated: tournamentSim?.lastUpdated ?? null,
      simCount: tournamentSim?.simCount ?? 0,
      liveResultsApplied: Boolean(tournamentSim?.liveResultsApplied),
      completedMatchCount: tournamentSim?.completedMatchCount ?? 0,
      stale: Boolean(tournamentSim?.stale),
      topWinPct: tournamentSim?.topContenders?.[0]?.winPct ?? null,
      topTeam: tournamentSim?.topContenders?.[0]?.abbreviation ?? null,
    },
    matchPlayerProps: {
      lastUpdated: matchProps?.lastUpdated ?? null,
      eventCount: eventIds.length,
      sampleEventIds: eventIds.slice(0, 8),
    },
    apiFootball: {
      enabled: isWcApiFootballEnabled(),
      lastUpdated: apiFootball?.lastUpdated ?? null,
      fixtureLinkedCount: apiFootball?.fixtureMap?.linkedCount ?? 0,
      assistLeaderCount: apiFootball?.leaders?.assists?.length ?? 0,
      yellowLeaderCount: apiFootball?.leaders?.yellowCards?.length ?? 0,
      quota: wcApiFootballQuotaState(apiFootball, nowMs),
    },
    scrapeFlags: wcBookScrapeFlagsSnapshot(),
    override: override
      ? {
          lastUpdated: override.lastUpdated,
          breakingLine: override.breakingLine || null,
          goldenBootPatchCount: override.goldenBootPatches?.length ?? 0,
          injuryPatchCount: override.injuryPatches?.length ?? 0,
        }
      : null,
  };
}
