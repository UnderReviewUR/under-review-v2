/**
 * Phase 1 — WC props monitoring alerts via Resend email.
 * Structured console events call emitWcPropsMonitoringAlert; email is rate-limited per arm.
 */

import { getEnv } from "./_env.js";

const DEFAULT_ALERT_EMAIL = "jon.shepherd@myyahoo.com";
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

/** @type {Map<string, number>} */
const lastSentByKey = new Map();

/**
 * @param {Record<string, unknown>} payload
 * @returns {string}
 */
function alertDedupeKey(payload) {
  const arm = String(payload.arm || payload.event || "unknown");
  const wcEventId = String(payload.wcEventId || "").trim();
  const error = String(payload.error || "").trim();
  return `${arm}|${wcEventId}|${error}`;
}

/**
 * Log structured alert + optionally email on-call (non-blocking).
 * @param {Record<string, unknown>} payload
 */
export function emitWcPropsMonitoringAlert(payload) {
  const body = {
    event: "wc_props_monitoring_alert",
    phase: "wc_phase4",
    ...payload,
    ts: Date.now(),
  };
  console.error(JSON.stringify(body));

  void sendWcPropsMonitoringEmail(body).catch((err) => {
    console.warn(
      "[wcPropsMonitoringAlert] email failed:",
      err instanceof Error ? err.message : String(err),
    );
  });
}

/**
 * @param {Record<string, unknown>} body
 */
async function sendWcPropsMonitoringEmail(body) {
  const to =
    String(getEnv("WC_PROPS_ALERT_EMAIL") || "").trim() || DEFAULT_ALERT_EMAIL;
  const resendKey = getEnv("RESEND_API_KEY");
  const from = getEnv("AUTH_EMAIL_FROM") || getEnv("WC_PROPS_ALERT_FROM");
  if (!resendKey || !from) {
    console.warn(
      "[wcPropsMonitoringAlert] RESEND_API_KEY or AUTH_EMAIL_FROM missing — alert logged only",
    );
    return { skipped: true, reason: "send_config_missing" };
  }

  const key = alertDedupeKey(body);
  const now = Date.now();
  const last = lastSentByKey.get(key) || 0;
  if (now - last < ALERT_COOLDOWN_MS) {
    return { skipped: true, reason: "cooldown", key };
  }
  lastSentByKey.set(key, now);

  const arm = String(body.arm || "unknown");
  const wcEventId = body.wcEventId != null ? String(body.wcEventId) : "—";
  const subject = `[UR WC] ${arm}${wcEventId !== "—" ? ` · ${wcEventId}` : ""}`;
  const lines = [
    "Under Review — World Cup props monitoring alert",
    "",
    `Arm: ${arm}`,
    `Event ID: ${wcEventId}`,
    body.error != null ? `Error: ${String(body.error)}` : null,
    body.loadMs != null ? `Load ms: ${String(body.loadMs)}` : null,
    body.legCount != null ? `Leg count: ${String(body.legCount)}` : null,
    body.shotRowCount != null ? `Shot rows: ${String(body.shotRowCount)}` : null,
    body.legNames != null ? `Legs: ${JSON.stringify(body.legNames)}` : null,
    "",
    `Timestamp: ${new Date(body.ts || Date.now()).toISOString()}`,
    "",
    "Full payload:",
    JSON.stringify(body, null, 2),
  ].filter(Boolean);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: lines.join("\n"),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  return { sent: true, to };
}
