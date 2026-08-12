import { applyCors } from "./_cors.js";
import { fetchNflverseLiveStatsSnapshot } from "./_nflverseLiveStats.js";
import { isNflMonthInSeason } from "../shared/slateModulePriority.js";

export const config = {
  api: { bodyParser: false },
};

/**
 * Refresh nflverse week aggregates (season / last3 / last1) into KV.
 * Query: seasonal=1 skips outside Sep–Feb; cache=1 reuses soft cache.
 */
export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const q = req.query || {};
    const seasonal = q.seasonal === "1" || q.seasonal === "true";
    const seasonalNow = q.now ? new Date(String(q.now)) : new Date();
    if (seasonal && !isNflMonthInSeason(seasonalNow)) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "outside_nfl_season_months",
        seasonal,
        checkedAt: seasonalNow.toISOString(),
      });
    }
    const force = q.cache !== "1" && q.cached !== "1";
    const snap = await fetchNflverseLiveStatsSnapshot({ force, now: seasonalNow });
    return res.status(200).json({
      ok: true,
      source: snap.source,
      force,
      seasonal,
      seasonYear: snap.seasonYear,
      preferredSeasonYear: snap.preferredSeasonYear,
      usedPriorSeasonFallback: snap.usedPriorSeasonFallback,
      playerCount: snap.playerCount,
      maxWeek: snap.maxWeek,
      fetchedAt: snap.fetchedAt,
      previousFetchedAt: snap.previousFetchedAt || null,
    });
  } catch (err) {
    console.error("[nfl-stats-refresh]", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "nflverse stats refresh failed",
    });
  }
}
