/**
 * Bounce scored transfer alerts to iPhone (ntfy) + optional Resend email.
 *
 * Lock-screen look (ntfy → APNs):
 * - Title  → bold headline on the banner
 * - Body   → secondary text under the title
 * - Tags   → emoji prefix on the title (soccer ⚽, etc.)
 * - Priority → iOS interruption level (5 = time-sensitive / urgent)
 * - Click  → opens the story URL when you tap
 */

import { getEnv } from "./_env.js";

const DEFAULT_ALERT_EMAIL = "jon.shepherd@myyahoo.com";

/**
 * @typedef {import("../shared/transferAlerts/scoreAlert.js").ScoredAlert} ScoredAlert
 */

/**
 * Short lock-screen body — title carries the headline; keep this scannable.
 * @param {ScoredAlert} alert
 * @returns {string}
 */
export function formatTransferAlertBody(alert) {
  const byline = alert.reporters?.length
    ? alert.reporters.join(" + ")
    : alert.source || alert.feedLabel || "wire";
  const lines = [
    alert.title,
    "",
    alert.barca ? `Barça · ${byline}` : byline,
    alert.link || null,
  ].filter(Boolean);
  return lines.join("\n");
}

/**
 * Banner title shown above the body on iPhone.
 * @param {ScoredAlert} alert
 * @returns {string}
 */
export function formatTransferAlertTitle(alert) {
  const who = alert.reporters?.[0] || "transfer";
  if (alert.barca) return `Barça · ${who}`.slice(0, 120);
  if (alert.tier === 1) return `Breaking · ${who}`.slice(0, 120);
  return `Transfer · ${who}`.slice(0, 120);
}

/**
 * ntfy tag emojis — first matching emoji tags prepend the notification title.
 * @param {ScoredAlert} alert
 * @returns {string}
 */
export function formatTransferAlertTags(alert) {
  const tags = ["soccer"];
  if (alert.barca) tags.push("stadium", "rotating_light");
  else if (alert.priority >= 5) tags.push("rotating_light");
  else if (alert.tier === 1) tags.push("loudspeaker");
  return tags.join(",");
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
    Tags: formatTransferAlertTags(alert),
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
  const enabled = String(getEnv("TRANSFER_ALERTS_EMAIL") || "1").trim() !== "0";
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
    results.push(await sendTransferAlertNtfy(alert));
  } catch (err) {
    results.push({
      channel: "ntfy",
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
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
