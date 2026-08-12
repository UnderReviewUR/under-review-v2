import { applyCors } from "./_cors.js";
import { fetchNflGameDayStatusSnapshot } from "./_nflEspnGameDayStatus.js";
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
    const snap = await fetchNflGameDayStatusSnapshot({ force: q.cache !== "1" });
    return res.status(200).json({
      ok: true,
      source: snap.source,
      fetchedAt: snap.fetchedAt,
      eventCount: snap.eventCount,
      injuryRowCount: snap.injuryRowCount,
      events: Array.isArray(snap.events) ? snap.events.slice(0, 20) : [],
    });
  } catch (err) {
    console.error("[nfl-inactives-refresh]", err);
    return res.status(500).json({ ok: false, error: err?.message || "inactives refresh failed" });
  }
}
