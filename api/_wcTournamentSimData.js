/**
 * World Cup 2026 — Monte Carlo tournament sim KV cache (4h TTL, invalidate on standings change).
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { buildStaticGroupsFallback, readWcGroupsFromKv, readWcMatchesFromKv } from "./_wcData.js";
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import {
  WC_TOURNAMENT_SIM_KV_KEY,
  WC_TOURNAMENT_SIM_SCRAPE_INTERVAL_MS,
  WC_TOURNAMENT_SIM_TTL_SECONDS,
} from "../shared/wc2026Constants.js";
import { isKvFresh } from "../shared/selfHealingKv.js";
import {
  completedWcMatchesFromList,
  formatSimResultsForPrompt,
  simulateTournament,
} from "../shared/wcTournamentSim.js";
import { resolveWcSimStrengthFromKv } from "./_wcSimStrengthInputs.js";

const DEFAULT_SIM_COUNT = 10000;

/**
 * Stable fingerprint from live group standings + completed match count.
 * @param {Record<string, Array<Record<string, unknown>>>} groups
 * @param {number} completedMatchCount
 */
export function buildWcStandingsFingerprint(groups, completedMatchCount = 0) {
  const parts = [`ft:${completedMatchCount}`];
  for (const letter of Object.keys(groups || {}).sort()) {
    const rows = Array.isArray(groups[letter]) ? groups[letter] : [];
    const chunk = rows
      .map((r) => {
        const team = String(r.team || r.abbreviation || "").toUpperCase();
        return `${team}:${r.points ?? 0}:${r.gd ?? 0}:${r.gf ?? 0}:${r.played ?? 0}`;
      })
      .sort()
      .join(",");
    parts.push(`${letter}=${chunk}`);
  }
  return parts.join("|");
}

/**
 * @param {Record<string, unknown> | null | undefined} cached
 * @param {string} fingerprint
 * @param {number} [maxAgeMs]
 * @param {number} [nowMs]
 */
export function isWcTournamentSimCacheValid(cached, fingerprint, maxAgeMs = WC_TOURNAMENT_SIM_SCRAPE_INTERVAL_MS, nowMs = Date.now()) {
  if (!cached?.teamStats || !cached?.simCount) return false;
  if (!teamStatsHasGroupWinPct(cached.teamStats)) return false;
  if (String(cached.fingerprint || "") !== fingerprint) return false;
  return isKvFresh(cached.lastUpdated, maxAgeMs, nowMs);
}

/**
 * @param {Record<string, unknown>} teamStats
 */
export function teamStatsHasGroupWinPct(teamStats) {
  const values = Object.values(teamStats || {});
  if (!values.length) return false;
  return values.every((row) => Number.isFinite(Number(row?.groupWinPct)));
}

/**
 * @param {Array<Record<string, unknown>>} matches
 */
export function completedMatchesForSim(matches) {
  return completedWcMatchesFromList(matches).filter((m) => !String(m?.id || "").startsWith("wc-promo-"));
}

/**
 * @param {{ groups?: Record<string, unknown>, matches?: Array<Record<string, unknown>>, simCount?: number, nowMs?: number }} [input]
 */
export async function scrapeAndCacheWcTournamentSim(input = {}) {
  const nowMs = input.nowMs ?? Date.now();
  const simCount = input.simCount ?? DEFAULT_SIM_COUNT;

  let groups = input.groups;
  let matches = input.matches;

  if (!groups) {
    const groupsKv = await readWcGroupsFromKv(Number.MAX_SAFE_INTEGER);
    groups =
      groupsKv?.groups && Object.keys(groupsKv.groups).length >= 12
        ? groupsKv.groups
        : buildStaticGroupsFallback();
  }

  if (!matches) {
    const matchesKv = await readWcMatchesFromKv(Number.MAX_SAFE_INTEGER);
    matches = Array.isArray(matchesKv?.matches) ? matchesKv.matches : [];
  }

  const completed = completedMatchesForSim(matches);
  const strengthInputs = await resolveWcSimStrengthFromKv(completed);
  const fingerprint = `${buildWcStandingsFingerprint(groups, completed.length)}|${strengthInputs.strengthFingerprint}`;

  const cached = await getDurableJson(WC_TOURNAMENT_SIM_KV_KEY);
  if (isWcTournamentSimCacheValid(cached, fingerprint, WC_TOURNAMENT_SIM_SCRAPE_INTERVAL_MS, nowMs)) {
    return { ok: true, ...cached, servedFromCache: true };
  }

  const simResults = simulateTournament(WC_2026_TEAMS, {
    simCount,
    completedMatches: completed,
    teamStrength: strengthInputs.teamStrength,
    strengthMatchesApplied: strengthInputs.strengthMatchesApplied,
    xgMatchesApplied: strengthInputs.xgMatchesApplied,
  });

  const payload = {
    ok: true,
    teamStats: simResults.teamStats,
    topContenders: simResults.topContenders,
    simCount: simResults.simCount,
    liveResultsApplied: simResults.liveResultsApplied,
    completedMatchCount: simResults.completedMatchCount,
    eloMatchesApplied: simResults.eloMatchesApplied,
    knockoutResultsApplied: simResults.knockoutResultsApplied,
    strengthMatchesApplied: simResults.strengthMatchesApplied,
    xgMatchesApplied: simResults.xgMatchesApplied,
    fingerprint,
    lastUpdated: nowMs,
    source: "monte_carlo_poisson_elo_live",
  };

  await setDurableJson(WC_TOURNAMENT_SIM_KV_KEY, payload, {
    ttlSeconds: WC_TOURNAMENT_SIM_TTL_SECONDS,
  });

  console.log(
    JSON.stringify({
      event: "wc_tournament_sim_cached",
      simCount,
      liveResultsApplied: simResults.liveResultsApplied,
      completedMatchCount: simResults.completedMatchCount,
      eloMatchesApplied: simResults.eloMatchesApplied,
      strengthMatchesApplied: simResults.strengthMatchesApplied,
      xgMatchesApplied: simResults.xgMatchesApplied,
      fingerprint,
    }),
  );

  return { ...payload, servedFromCache: false };
}

/**
 * @param {number} [maxAgeMs]
 * @param {number} [nowMs]
 */
export async function readWcTournamentSimFromKv(maxAgeMs = WC_TOURNAMENT_SIM_SCRAPE_INTERVAL_MS, nowMs = Date.now()) {
  const cached = await getDurableJson(WC_TOURNAMENT_SIM_KV_KEY);
  if (!cached?.teamStats) return null;
  return {
    ...cached,
    stale: !isKvFresh(cached.lastUpdated, maxAgeMs, nowMs),
  };
}

/**
 * Load cached sim or compute + cache on miss/stale fingerprint.
 * @param {{ groups?: Record<string, unknown>, matches?: Array<Record<string, unknown>>, mentionedTeams?: string[], nowMs?: number }} [opts]
 */
export async function resolveWcTournamentSimForPrompt(opts = {}) {
  const nowMs = opts.nowMs ?? Date.now();
  let groups = opts.groups;
  let matches = opts.matches;

  if (!groups) {
    const groupsKv = await readWcGroupsFromKv(Number.MAX_SAFE_INTEGER);
    groups =
      groupsKv?.groups && Object.keys(groupsKv.groups).length
        ? groupsKv.groups
        : buildStaticGroupsFallback();
  }

  if (!matches) {
    const matchesKv = await readWcMatchesFromKv(Number.MAX_SAFE_INTEGER);
    matches = Array.isArray(matchesKv?.matches) ? matchesKv.matches : [];
  }

  const completed = completedMatchesForSim(matches);
  const fingerprint = buildWcStandingsFingerprint(groups, completed.length);

  const kvOnly = Boolean(opts.kvOnly);
  let row = await readWcTournamentSimFromKv(
    kvOnly ? Number.MAX_SAFE_INTEGER : WC_TOURNAMENT_SIM_SCRAPE_INTERVAL_MS,
    nowMs,
  );
  if (
    !kvOnly &&
    (!row?.teamStats ||
      !teamStatsHasGroupWinPct(row.teamStats) ||
      String(row.fingerprint || "") !== fingerprint)
  ) {
    try {
      const fresh = await scrapeAndCacheWcTournamentSim({
        groups,
        matches,
        nowMs,
      });
      if (fresh?.teamStats && teamStatsHasGroupWinPct(fresh.teamStats)) {
        row = fresh;
      }
    } catch (err) {
      console.warn("[wc-tournament-sim] prompt refresh failed:", err?.message || err);
    }
  }

  if (!row?.teamStats || !teamStatsHasGroupWinPct(row.teamStats)) return null;
  if (row.stale || String(row.fingerprint || "") !== fingerprint) {
    console.warn(
      JSON.stringify({
        event: "wc_tournament_sim_prompt_stale",
        fingerprint,
        cachedFingerprint: row.fingerprint || null,
      }),
    );
  }

  const simResults = {
    teamStats: row.teamStats,
    topContenders: row.topContenders || Object.values(row.teamStats).sort((a, b) => b.winPct - a.winPct).slice(0, 20),
    simCount: row.simCount || DEFAULT_SIM_COUNT,
    liveResultsApplied: Boolean(row.liveResultsApplied),
    completedMatchCount: Number(row.completedMatchCount) || 0,
    eloMatchesApplied: Number(row.eloMatchesApplied) || 0,
    knockoutResultsApplied: Number(row.knockoutResultsApplied) || 0,
    strengthMatchesApplied: Number(row.strengthMatchesApplied) || 0,
    xgMatchesApplied: Number(row.xgMatchesApplied) || 0,
  };

  return {
    simResults,
    promptBlock: formatSimResultsForPrompt(
      simResults,
      opts.mentionedTeams || [],
      opts.question || "",
    ),
    lastUpdated: row.lastUpdated,
    fingerprint: row.fingerprint,
    stale: Boolean(row.stale),
  };
}

/**
 * Recompute sim after a finalized match (non-blocking fire-and-forget safe).
 */
export async function refreshWcTournamentSimAfterFt() {
  try {
    return await scrapeAndCacheWcTournamentSim();
  } catch (err) {
    console.warn("[wc-tournament-sim] refresh after FT failed:", err?.message || err);
    return { ok: false, error: err?.message || "sim_refresh_failed" };
  }
}
