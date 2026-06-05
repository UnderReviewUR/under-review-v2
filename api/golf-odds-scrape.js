/** Manual warm only — production cadence is `/api/scrape-scheduler`. */
import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { scrapeAndCachePgaChampionshipOdds } from "./_golfPgaChampionshipOdds.js";

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

  const forcePuppeteer =
    String(req.query?.puppeteer || "").trim() === "1" ||
    String(req.query?.forcePuppeteer || "").trim() === "1";

  try {
    const odds = await scrapeAndCachePgaChampionshipOdds({ forcePuppeteer });
    return res.status(200).json({
      ok: true,
      source: odds?.scrapeMethod || odds?.source || "pga_championship_site",
      fetchedAt: odds?.fetchedAt,
      posted: odds?.hasPostedLines,
      outrightCount: Array.isArray(odds?.outrights) ? odds.outrights.length : 0,
      freshness: odds?.freshness || null,
    });
  } catch (err) {
    console.error("[golf-odds-scrape]", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "scrape_failed",
    });
  }
}
