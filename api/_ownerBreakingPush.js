/**
 * Owner-only breaking Web Push — reuses transfer-alerts VAPID + KV subscriptions.
 * Paste path (no cron) and Alabama RSS cron both call sendOwnerWebPush.
 */

import webpush from "web-push";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { getEnv } from "./_env.js";
import {
  deletePushSubscription,
  getVapidConfig,
  loadPushSubscriptions,
} from "./_transferAlertsPush.js";

export const NFL_BREAKING_KV_KEY = "owner_breaking:nfl_v1";
export const NFL_BREAKING_TTL_SECONDS = 36 * 60 * 60;

export const OWNER_BREAKING_SOURCES = [
  "Schefter",
  "Rapoport",
  "Shams",
  "Ornstein",
  "Other",
];

export const OWNER_BREAKING_SPORTS = ["nfl", "soccer", "cfb", "other"];

/**
 * @param {{
 *   body: string,
 *   url?: string,
 *   title?: string,
 *   urgency?: "very-low" | "low" | "normal" | "high",
 *   sendImpl?: Function,
 * }} opts
 */
export async function sendOwnerWebPush(opts = {}) {
  const body = String(opts.body || "").trim();
  if (!body) {
    return { channel: "webpush", ok: false, skipped: true, reason: "empty_body" };
  }

  const vapid = getVapidConfig();
  if (!vapid) {
    return { channel: "webpush", ok: false, skipped: true, reason: "vapid_missing" };
  }

  const { subscriptions } = await loadPushSubscriptions();
  if (!subscriptions.length) {
    return { channel: "webpush", ok: false, skipped: true, reason: "no_subscribers" };
  }

  const payload = JSON.stringify({
    title: opts.title != null ? String(opts.title) : "\u200B",
    body,
    url: String(opts.url || "/").trim() || "/",
  });

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const sendOne =
    opts.sendImpl ||
    ((sub) =>
      webpush.sendNotification(sub, payload, {
        TTL: 86400,
        urgency: opts.urgency || "high",
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
      skipped: errors.every((e) => e === "gone"),
      reason: errors[0] || "send_failed",
      errors,
    };
  }

  return { channel: "webpush", ok: true, sent, errors };
}

/**
 * Format lock-screen body: "Schefter · NFL — text"
 * @param {{ sport: string, source: string, text: string }} row
 */
export function formatOwnerBreakingBody(row) {
  const source = String(row.source || "Other").trim() || "Other";
  const sport = String(row.sport || "other").trim().toUpperCase();
  const text = String(row.text || "")
    .replace(/\s+/g, " ")
    .trim();
  return `${source} · ${sport} — ${text}`;
}

/**
 * Persist NFL paste for Ask breaking inject (KV + optional env still wins).
 * @param {{ text: string, source?: string, link?: string | null }} row
 */
export async function storeNflBreakingForAsk(row) {
  const text = String(row.text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return { ok: false, reason: "empty" };
  const source = String(row.source || "Other").trim() || "Other";
  const link = String(row.link || "").trim() || null;
  const stamped = new Date().toISOString().slice(0, 10);
  const line = `${stamped} | ${source}: ${text}`;
  await setDurableJson(
    NFL_BREAKING_KV_KEY,
    { line, source, text, link, at: Date.now() },
    { ttlSeconds: NFL_BREAKING_TTL_SECONDS },
  );
  return { ok: true, line };
}

/**
 * Resolve NFL Ask breaking line: env NFL_BREAKING beats KV paste.
 * Same spirit as TENNIS_BREAKING / WC_BREAKING.
 * @returns {Promise<string>}
 */
export async function getNflBreakingLine() {
  const fromEnv = getEnv("NFL_BREAKING", { treatEmptyAsMissing: false });
  if (fromEnv !== undefined) return String(fromEnv || "").trim();
  const raw = await getDurableJson(NFL_BREAKING_KV_KEY);
  return String(raw?.line || "").trim();
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, sport: string, source: string, text: string, link: string | null, injectAsk: boolean } | { ok: false, error: string }}
 */
export function parseOwnerBreakingPaste(body) {
  const sportRaw = String(body?.sport || "nfl")
    .trim()
    .toLowerCase();
  const sport = OWNER_BREAKING_SPORTS.includes(sportRaw) ? sportRaw : null;
  if (!sport) return { ok: false, error: "invalid_sport" };

  const sourceRaw = String(body?.source || "Other").trim();
  const source = OWNER_BREAKING_SOURCES.find(
    (s) => s.toLowerCase() === sourceRaw.toLowerCase(),
  );
  if (!source) return { ok: false, error: "invalid_source" };

  const text = String(body?.text || body?.line || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || text.length < 8) return { ok: false, error: "text_too_short" };
  if (text.length > 280) return { ok: false, error: "text_too_long" };

  let link = String(body?.link || body?.url || "").trim() || null;
  if (link && !/^https:\/\//i.test(link)) return { ok: false, error: "invalid_link" };

  const injectAsk =
    body?.injectAsk === true ||
    body?.injectAsk === 1 ||
    String(body?.injectAsk || "").trim() === "1" ||
    (sport === "nfl" && body?.injectAsk !== false && body?.injectAsk !== 0);

  return { ok: true, sport, source, text, link, injectAsk: Boolean(injectAsk && sport === "nfl") };
}
