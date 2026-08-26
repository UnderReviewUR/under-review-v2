/**
 * Owner-only: VAPID public key + save Web Push subscription for transfer alerts.
 * POST { code? } with Bearer owner token, or owner code in body.
 */

import { applyCors } from "./_cors.js";
import {
  getVapidConfig,
  isOwnerPushActor,
  loadPushSubscriptions,
  savePushSubscription,
} from "./_transferAlertsPush.js";

export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, POST, OPTIONS" })) return;

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isOwnerPushActor(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const vapid = getVapidConfig();
  if (!vapid) {
    return res.status(503).json({ error: "vapid_missing" });
  }

  if (req.method === "GET") {
    const { subscriptions } = await loadPushSubscriptions();
    return res.status(200).json({
      vapidPublicKey: vapid.publicKey,
      subscribed: subscriptions.length > 0,
    });
  }

  const saved = await savePushSubscription(req.body?.subscription);
  if (!saved.ok) {
    return res.status(400).json({ error: saved.reason || "invalid_subscription" });
  }

  return res.status(200).json({ ok: true, count: saved.count, vapidPublicKey: vapid.publicKey });
}
