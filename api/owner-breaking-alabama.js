/**
 * Owner Alabama football RSS poll → Web Push.
 * Cron every 30m. Auth: Bearer CRON_SECRET.
 */

import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { runAlabamaBreakingTick } from "./_ownerBreakingAlabamaRun.js";

export const config = {
  maxDuration: 45,
};

function isAuthorizedCron(req) {
  const secret = getEnv("CRON_SECRET");
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.authorization === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, POST, OPTIONS" })) return;

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const dryRun =
    String(req.query?.dryRun || req.query?.dry_run || "").trim() === "1";

  try {
    const summary = await runAlabamaBreakingTick({ dryRun });
    return res.status(200).json(summary);
  } catch (err) {
    console.error(
      "[owner-breaking-alabama]",
      err instanceof Error ? err.message : String(err),
    );
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
