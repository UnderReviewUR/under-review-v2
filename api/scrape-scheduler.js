/**
 * Unified pre-game scrape scheduler — Vercel cron every 5 minutes.
 * Replaces fixed-interval per-sport scrape crons (NBA props, golf odds, game spreads).
 */

import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { collectAllScrapeTargets } from "./_scrapeSchedule.js";
import { runDueScrapes } from "./_scrapeSchedulerRun.js";

export const config = {
  maxDuration: 300,
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

  const nowMs = Date.now();

  try {
    const targets = await collectAllScrapeTargets(nowMs);

    if (!targets.length) {
      console.log(
        JSON.stringify({
          event: "scrape_scheduler_tick",
          targets: 0,
          note: "no_upcoming_games",
        }),
      );
      return res.status(200).json({
        ok: true,
        targets: 0,
        executed: 0,
        results: [],
        note: "no_upcoming_games",
      });
    }

    const run = await runDueScrapes(targets, nowMs);

    console.log(
      JSON.stringify({
        event: "scrape_scheduler_tick",
        targets: run.targets,
        executed: run.executed,
        scraped: run.results.filter((r) => r.action === "scraped").length,
      }),
    );

    return res.status(200).json({ ok: true, ...run });
  } catch (err) {
    console.error("[scrape-scheduler]", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "scheduler_failed",
    });
  }
}
