/** Manual warm only — production cadence is `/api/scrape-scheduler`. */
import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { scrapeAndCacheNflProps } from "./_nflProps.js";
import { listUpcomingNflPropsScrapeGames } from "./_nflProps.js";

export const config = {
  maxDuration: 60,
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

  const gameId = req.query?.gameId ?? req.query?.game_id ?? null;

  try {
    let gid = gameId;
    let tipoffMs = null;
    if (gid == null) {
      const upcoming = await listUpcomingNflPropsScrapeGames();
      const first = upcoming[0];
      if (!first?.providerGameId) {
        return res.status(404).json({ ok: false, error: "no_upcoming_nfl_games" });
      }
      gid = first.providerGameId;
      tipoffMs = first.tipoffMs;
    }

    const props = await scrapeAndCacheNflProps(gid, { tipoffMs });
    return res.status(200).json({
      ok: true,
      gameId: props.providerGameId ?? props.gameId,
      source: props.source || "action_network",
      scrapeMethod: props.scrapeMethod || "rest",
      fetchedAt: props.fetchedAt,
      posted: props.hasPostedLines,
      playerCount: props.playerCount ?? (Array.isArray(props.players) ? props.players.length : 0),
      freshness: props.freshness || null,
    });
  } catch (err) {
    console.error("[nfl-props-scrape]", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "scrape_failed",
    });
  }
}
