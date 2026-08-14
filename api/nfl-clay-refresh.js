/**
 * Weekly Clay volume-prior refresh.
 *
 * Sources (first win):
 * 1) POST JSON body { players, asOf, ... }
 * 2) NFL_CLAY_PROJECTIONS_URL env (JSON blob you control — gist/Blob/S3)
 * 3) Re-publish bundled seed to KV (keeps Ask path warm; marks seed source)
 *
 * Cadence: Vercel cron Tue 15:00 UTC. Content usually moves weekly/biweekly —
 * cron still runs weekly so staleness never drifts past ~7–14 days unnoticed.
 */
import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import {
  loadNflClayProjections,
  persistNflClayProjections,
  validateNflClayBundle,
} from "./_nflClayProjections.js";
import { NFL_CLAY_PROJECTIONS_SEED } from "./data/nfl-clay-projections.js";

export const config = {
  api: { bodyParser: true },
};

function authorizeCronOrManual(req) {
  const secret = getEnv("CRON_SECRET");
  if (!secret) return true; // local / unset — allow (same as depth cron softness)
  const auth = String(req.headers.authorization || "");
  if (auth === `Bearer ${secret}`) return true;
  // Vercel Cron injects this header on scheduled invokes
  if (String(req.headers["x-vercel-cron"] || "") === "1") return true;
  return false;
}

async function fetchRemoteBundle(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`remote fetch HTTP ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;

  if (req.method === "GET" && String(req.query?.view || "") === "status") {
    const status = await loadNflClayProjections();
    return res.status(200).json({
      ok: true,
      source: status.source,
      stale: status.stale,
      ageDays: status.ageDays,
      asOf: status.bundle?.asOf || null,
      playerCount: Object.keys(status.bundle?.players || {}).length,
    });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!authorizeCronOrManual(req) && req.method === "POST") {
    // POST ingest requires secret when configured
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    let incoming = null;
    let via = "seed";

    if (req.method === "POST" && req.body && typeof req.body === "object" && req.body.players) {
      incoming = req.body;
      via = "post_body";
    } else {
      const remoteUrl = getEnv("NFL_CLAY_PROJECTIONS_URL");
      if (remoteUrl) {
        incoming = await fetchRemoteBundle(remoteUrl);
        via = "remote_url";
      }
    }

    if (!incoming) {
      incoming = {
        ...NFL_CLAY_PROJECTIONS_SEED,
        updatedAt: new Date().toISOString(),
      };
      via = "bundled_seed";
    }

    const validated = validateNflClayBundle(incoming);
    if (!validated.ok) {
      return res.status(400).json({ ok: false, error: validated.error, via });
    }

    const saved = await persistNflClayProjections({
      ...validated.bundle,
      source: via === "bundled_seed" ? "seed" : via,
      updatedAt: new Date().toISOString(),
    });

    const after = await loadNflClayProjections();
    return res.status(200).json({
      ok: true,
      via,
      asOf: saved.asOf,
      playerCount: Object.keys(saved.players || {}).length,
      stale: after.stale,
      ageDays: after.ageDays,
      source: after.source,
    });
  } catch (err) {
    console.error("[nfl-clay-refresh]", err);
    return res.status(500).json({ ok: false, error: err?.message || "refresh failed" });
  }
}
