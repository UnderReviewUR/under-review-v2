/**
 * Manual / legacy spread refresh — production cadence is `/api/scrape-scheduler` (every 5 min).
 */
import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { refreshDueNbaGameOddsSnapshots } from "./_gameOddsPipeline.js";
import { fetchNbaSlateGamesForOddsRefresh } from "./nba.js";

export const config = {
  maxDuration: 120,
};

function isAuthorizedCron(req) {
  const secret = getEnv("CRON_SECRET");
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.authorization === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const games = await fetchNbaSlateGamesForOddsRefresh();
    const result = await refreshDueNbaGameOddsSnapshots(games);
    return res.status(200).json({
      ok: true,
      slateGames: games.length,
      ...result,
    });
  } catch (err) {
    console.error("[game-odds-refresh]", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "refresh_failed",
    });
  }
}
