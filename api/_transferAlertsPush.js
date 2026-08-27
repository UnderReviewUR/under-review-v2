/**
 * Owner-only Web Push for transfer alerts (Under Review home-screen app).
 */

import crypto from "crypto";
import webpush from "web-push";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { getEnv, getAccessTokenSecretSync, resolveOwnerCodeForRegistry } from "./_env.js";
import { verifyToken } from "./_hmacToken.js";
import {
  formatTransferSpoilerBody,
} from "../shared/transferAlerts/formatSpoiler.js";

export const WEBPUSH_KV_KEY = "transfer_alerts:webpush_v1";

/**
 * @param {string} a
 * @param {string} b
 */
export function codesEqual(a, b) {
  const left = Buffer.from(String(a || "").trim().toLowerCase(), "utf8");
  const right = Buffer.from(String(b || "").trim().toLowerCase(), "utf8");
  if (!left.length || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/**
 * @param {{ headers?: Record<string, string>, body?: { code?: string } }} req
 * @returns {boolean}
 */
export function isOwnerPushActor(req) {
  const owner = resolveOwnerCodeForRegistry();
  const extra = String(getEnv("TRANSFER_ALERTS_PUSH_SECRET") || "").trim();
  const headerCode = String(
    req.headers?.["x-ur-owner-code"] || req.headers?.["X-UR-Owner-Code"] || "",
  ).trim();
  const code = String(req.body?.code || headerCode).trim();
  if (code && owner && codesEqual(code, owner)) return true;
  if (code && extra && codesEqual(code, extra)) return true;

  const auth = String(req.headers?.authorization || "");
  const m = auth.match(/^Bearer\s+(\S+)/i);
  if (!m) return false;
  const secret = getAccessTokenSecretSync();
  if (!secret) return false;
  const payload = verifyToken(m[1], secret);
  return Boolean(payload && payload.tier === "owner");
}

/**
 * @returns {{ publicKey: string, privateKey: string, subject: string } | null}
 */
export function getVapidConfig() {
  const publicKey = String(getEnv("VAPID_PUBLIC_KEY") || "").trim();
  const privateKey = String(getEnv("VAPID_PRIVATE_KEY") || "").trim();
  const subject = String(
    getEnv("VAPID_SUBJECT") || "mailto:jon.shepherd@myyahoo.com",
  ).trim();
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

/**
 * @param {unknown} sub
 * @returns {{ endpoint: string, keys: { p256dh: string, auth: string } } | null}
 */
export function normalizePushSubscription(sub) {
  if (!sub || typeof sub !== "object") return null;
  const endpoint = String(sub.endpoint || "").trim();
  const keys = sub.keys || {};
  const p256dh = String(keys.p256dh || "").trim();
  const auth = String(keys.auth || "").trim();
  if (!endpoint.startsWith("https://") || !p256dh || !auth) return null;
  return { endpoint, keys: { p256dh, auth } };
}

/**
 * @returns {Promise<{ subscriptions: object[] }>}
 */
export async function loadPushSubscriptions() {
  const raw = await getDurableJson(WEBPUSH_KV_KEY);
  const list = Array.isArray(raw?.subscriptions) ? raw.subscriptions : [];
  return { subscriptions: list.filter((s) => normalizePushSubscription(s)) };
}

/**
 * @param {object} subscription
 */
export async function savePushSubscription(subscription) {
  const row = normalizePushSubscription(subscription);
  if (!row) return { ok: false, reason: "invalid_subscription" };
  const { subscriptions } = await loadPushSubscriptions();
  const next = [
    row,
    ...subscriptions.filter((s) => s.endpoint !== row.endpoint),
  ].slice(0, 4);
  await setDurableJson(WEBPUSH_KV_KEY, { subscriptions: next });
  return { ok: true, count: next.length };
}

/**
 * @param {string} endpoint
 */
export async function deletePushSubscription(endpoint) {
  const { subscriptions } = await loadPushSubscriptions();
  const next = subscriptions.filter((s) => s.endpoint !== endpoint);
  await setDurableJson(WEBPUSH_KV_KEY, { subscriptions: next });
  return { ok: true, count: next.length };
}

/**
 * @param {import("./_transferAlertsNotify.js").ScoredAlert} alert
 * @param {{ sendImpl?: Function }} [opts]
 */
export async function sendTransferAlertWebPush(alert, opts = {}) {
  const vapid = getVapidConfig();
  if (!vapid) {
    return { channel: "webpush", ok: false, skipped: true, reason: "vapid_missing" };
  }

  const { subscriptions } = await loadPushSubscriptions();
  if (!subscriptions.length) {
    return { channel: "webpush", ok: false, skipped: true, reason: "no_subscribers" };
  }

  const payload = JSON.stringify({
    title: "",
    body: formatTransferSpoilerBody(alert),
    url: alert.link || "/",
  });

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const sendOne =
    opts.sendImpl ||
    ((sub) =>
      webpush.sendNotification(sub, payload, {
        TTL: 86400,
        urgency: alert.priority >= 5 ? "high" : "normal",
      }));

  let sent = 0;
  /** @type {string[]} */
  const errors = [];

  for (const sub of subscriptions) {
    try {
      await sendOne(sub);
      sent += 1;
    } catch (err) {
      const status = err?.statusCode || err?.status;
      if (status === 404 || status === 410) {
        await deletePushSubscription(sub.endpoint);
        errors.push("gone");
      } else {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
  }

  if (sent === 0) {
    return {
      channel: "webpush",
      ok: false,
      skipped: sent === 0 && errors.every((e) => e === "gone"),
      reason: errors[0] || "send_failed",
      errors,
    };
  }

  return { channel: "webpush", ok: true, sent, errors };
}
