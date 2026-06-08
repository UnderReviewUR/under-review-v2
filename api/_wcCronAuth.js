/**
 * Shared cron auth for WC warmup + scrape-scheduler style routes.
 */

import { getEnv } from "./_env.js";

/**
 * @param {import("@vercel/node").VercelRequest} req
 */
export function isWcCronAuthorized(req) {
  const secret = getEnv("CRON_SECRET");
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = String(req.headers?.authorization || "");
  return auth === `Bearer ${secret}`;
}
