import { applyCors } from "./_cors.js";
import { fetchNflRosterSnapshot } from "./_nflEspnRoster.js";
import { isNflMonthInSeason } from "../shared/slateModulePriority.js";

export const config = {
  api: { bodyParser: false },
};

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
    const snap = await fetchNflRosterSnapshot({ force });
    return res.status(200).json({
      ok: true,
      source: snap.source || "espn_site_api",
      force,
      seasonal,
      playerCount: Array.isArray(snap.players) ? snap.players.length : 0,
      fetchedAt: snap.fetchedAt,
      previousFetchedAt: snap.previousFetchedAt || null,
      changeSummary: snap.changeSummary || { total: 0 },
      changes: Array.isArray(snap.changesSinceLastRefresh)
        ? snap.changesSinceLastRefresh.slice(0, 50)
        : [],
    });
  } catch (err) {
    console.error("[nfl-roster-refresh]", err);
    return res.status(500).json({ ok: false, error: err?.message || "refresh failed" });
  }
}
