/**
 * Bounce scored transfer alerts to iPhone (Web Push on the Under Review home-screen app).
 *
 * Lock-screen look (B/R-style spoiler, ntfy → APNs):
 * - Title  → the news itself (not desk/emoji branding)
 * - Body   → extra fact + (reporter)
 * - Priority → iOS interruption level (5 = time-sensitive / urgent)
 * - Click  → opens the story URL when you tap
 */

import { getEnv } from "./_env.js";
import {
  formatTransferSpoilerBody,
  formatTransferSpoilerTitle,
} from "../shared/transferAlerts/formatSpoiler.js";
import { sendTransferAlertWebPush } from "./_transferAlertsPush.js";

const DEFAULT_ALERT_EMAIL = "jon.shepherd@myyahoo.com";

/**
 * @typedef {import("../shared/transferAlerts/scoreAlert.js").ScoredAlert} ScoredAlert
 */

/**
 * Secondary lock-screen line.
 * @param {ScoredAlert} alert
 * @returns {string}
 */
export function formatTransferAlertBody(alert) {
  return formatTransferSpoilerBody(alert);
}

/**
 * Bold lock-screen line — spoiler, not "Breaking · ornstein".
 * @param {ScoredAlert} alert
 * @returns {string}
 */
export function formatTransferAlertTitle(alert) {
  return formatTransferSpoilerTitle(alert);
}

/**
 * @param {ScoredAlert} alert
 * @returns {Promise<{ channel: string, ok: boolean, skipped?: boolean, reason?: string, status?: number }>}
 */
export async function sendTransferAlertNtfy(alert) {
  const topic = String(getEnv("TRANSFER_ALERTS_NTFY_TOPIC") || "").trim();
  if (!topic) {
    return { channel: "ntfy", ok: false, skipped: true, reason: "topic_missing" };
  }

  const server = String(
    getEnv("TRANSFER_ALERTS_NTFY_SERVER") || "https://ntfy.sh",
  ).replace(/\/$/, "");

  const headers = {
    Title: formatTransferAlertTitle(alert),
    Priority: String(alert.priority || 3),
    "Content-Type": "text/plain; charset=utf-8",
  };
  if (alert.link) headers.Click = alert.link;

  const token = String(getEnv("TRANSFER_ALERTS_NTFY_TOKEN") || "").trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${server}/${encodeURIComponent(topic)}`, {
    method: "POST",
    headers,
    body: formatTransferAlertBody(alert),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ntfy ${res.status}: ${text.slice(0, 200)}`);
  }

  return { channel: "ntfy", ok: true, status: res.status };
}

/**
 * @param {ScoredAlert} alert
 * @returns {Promise<{ channel: string, ok: boolean, skipped?: boolean, reason?: string }>}
 */
export async function sendTransferAlertEmail(alert) {
  const enabled = String(getEnv("TRANSFER_ALERTS_EMAIL") || "0").trim() === "1";
  if (!enabled) {
    return { channel: "email", ok: false, skipped: true, reason: "disabled" };
  }

  const resendKey = getEnv("RESEND_API_KEY");
  const from = getEnv("AUTH_EMAIL_FROM") || getEnv("TRANSFER_ALERTS_FROM");
  if (!resendKey || !from) {
    return { channel: "email", ok: false, skipped: true, reason: "send_config_missing" };
  }

  const to =
    String(getEnv("TRANSFER_ALERTS_EMAIL_TO") || "").trim() ||
    String(getEnv("WC_PROPS_ALERT_EMAIL") || "").trim() ||
    DEFAULT_ALERT_EMAIL;

  const subject = formatTransferAlertTitle(alert);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `${subject} — ${alert.title}`.slice(0, 180),
      text: formatTransferAlertBody(alert),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`resend ${res.status}: ${text.slice(0, 200)}`);
  }

  return { channel: "email", ok: true };
}

/**
 * @param {ScoredAlert} alert
 * @returns {Promise<{ alertId: string, results: object[] }>}
 */
export async function bounceTransferAlert(alert) {
  const results = [];

  try {
    results.push(await sendTransferAlertWebPush(alert));
  } catch (err) {
    results.push({
      channel: "webpush",
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const ntfyOn = String(getEnv("TRANSFER_ALERTS_NTFY") || "0").trim() === "1";
  if (ntfyOn) {
    try {
      results.push(await sendTransferAlertNtfy(alert));
    } catch (err) {
      results.push({
        channel: "ntfy",
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  try {
    results.push(await sendTransferAlertEmail(alert));
  } catch (err) {
    results.push({
      channel: "email",
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  console.log(
    JSON.stringify({
      event: "transfer_alert_bounced",
      id: alert.id,
      title: alert.title,
      barca: alert.barca,
      score: alert.score,
      reporters: alert.reporters,
      results,
    }),
  );

  return { alertId: alert.id, results };
}
