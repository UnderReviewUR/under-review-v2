/**
 * Owner-only breaking paste → Web Push (no cron).
 * Auth: same as transfer-alerts-push (owner code / owner Bearer / TRANSFER_ALERTS_PUSH_SECRET).
 *
 * POST { sport, source, text, link?, injectAsk?, code? }
 * GET  → vapid status + source/sport enums (owner only)
 */

import { applyCors } from "./_cors.js";
import {
  formatOwnerBreakingBody,
  OWNER_BREAKING_SOURCES,
  OWNER_BREAKING_SPORTS,
  parseOwnerBreakingPaste,
  sendOwnerWebPush,
  storeNflBreakingForAsk,
} from "./_ownerBreakingPush.js";
import { getVapidConfig, isOwnerPushActor, loadPushSubscriptions } from "./_transferAlertsPush.js";

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, POST, OPTIONS" })) return;

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isOwnerPushActor(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    const vapid = getVapidConfig();
    const { subscriptions } = await loadPushSubscriptions();
    return res.status(200).json({
      ok: true,
      vapidConfigured: Boolean(vapid),
      subscribed: subscriptions.length > 0,
      sports: OWNER_BREAKING_SPORTS,
      sources: OWNER_BREAKING_SOURCES,
    });
  }

  const parsed = parseOwnerBreakingPaste(req.body || {});
  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error });
  }

  const body = formatOwnerBreakingBody(parsed);
  const push = await sendOwnerWebPush({
    body,
    url: parsed.link || "/",
    urgency: "high",
  });

  /** @type {object | null} */
  let ask = null;
  if (parsed.injectAsk) {
    ask = await storeNflBreakingForAsk({
      text: parsed.text,
      source: parsed.source,
      link: parsed.link,
    });
  }

  return res.status(200).json({
    ok: Boolean(push.ok || push.skipped),
    push,
    ask,
    preview: body,
  });
}
