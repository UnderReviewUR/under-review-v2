import { applyCors } from "./_cors.js";
import { fetchNflFantasyRankingsSnapshot } from "./_nflEspnFantasyRankings.js";

export const config = {
  api: { bodyParser: false },
};

/**
 * Refresh ESPN Fantasy rankings into KV.
 * Query: force via default; cache=1 to reuse soft cache; now=ISO optional.
 */
export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const q = req.query || {};
    const force = q.cache !== "1" && q.cached !== "1";
    const now = q.now ? new Date(String(q.now)) : new Date();
    const snap = await fetchNflFantasyRankingsSnapshot({ force, now });
    return res.status(200).json({
      ok: true,
      source: snap.source,
      force,
      seasonYear: snap.seasonYear,
      playerCount: snap.playerCount,
      fetchedAt: snap.fetchedAt,
      previousFetchedAt: snap.previousFetchedAt || null,
    });
  } catch (err) {
    console.error("[nfl-fantasy-rankings-refresh]", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "fantasy rankings refresh failed",
    });
  }
}
