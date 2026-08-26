/**
 * Transfer alert bounce — Vercel cron polls trusted wires and Web Pushes the owner’s
 * Under Review home-screen app. ntfy is opt-in (`TRANSFER_ALERTS_NTFY=1`).
 *
 * Auth: Authorization Bearer CRON_SECRET (Vercel Cron injects automatically).
 */

import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { runTransferAlertsTick } from "./_transferAlertsRun.js";

export const config = {
  maxDuration: 60,
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
    const summary = await runTransferAlertsTick({ dryRun });
    return res.status(200).json(summary);
  } catch (err) {
    console.error(
      "[transfer-alerts]",
      err instanceof Error ? err.message : String(err),
    );
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
