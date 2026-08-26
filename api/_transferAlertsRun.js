/**
 * Poll → score → dedupe → bounce transfer alerts to phone.
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { getEnv } from "./_env.js";
import { fetchTransferFeedItems } from "./_transferAlertsFetch.js";
import { bounceTransferAlert } from "./_transferAlertsNotify.js";
import { rankTransferAlerts } from "../shared/transferAlerts/scoreAlert.js";

const SEEN_KEY = "transfer_alerts:seen_v1";
const SEEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_MAX_SEND = 5;

/**
 * @returns {Promise<Record<string, number>>}
 */
async function loadSeenMap() {
  const raw = await getDurableJson(SEEN_KEY);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  /** @type {Record<string, number>} */
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

/**
 * @param {Record<string, number>} seen
 */
async function saveSeenMap(seen) {
  const now = Date.now();
  const cutoff = now - SEEN_TTL_SECONDS * 1000;
  /** @type {Record<string, number>} */
  const pruned = {};
  for (const [k, v] of Object.entries(seen)) {
    if (v >= cutoff) pruned[k] = v;
  }
  await setDurableJson(SEEN_KEY, pruned, { ttlSeconds: SEEN_TTL_SECONDS });
}

/**
 * @param {{ dryRun?: boolean, maxSend?: number, fetchImpl?: Function }} [opts]
 */
export async function runTransferAlertsTick(opts = {}) {
  const dryRun =
    opts.dryRun === true ||
    String(getEnv("TRANSFER_ALERTS_DRY_RUN") || "").trim() === "1";
  const maxSend = Math.max(
    1,
    Number(opts.maxSend) ||
      Number(getEnv("TRANSFER_ALERTS_MAX_SEND") || DEFAULT_MAX_SEND) ||
      DEFAULT_MAX_SEND,
  );

  const { items, feedResults } = await fetchTransferFeedItems(
    opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {},
  );
  const ranked = rankTransferAlerts(items, { limit: maxSend * 3 });
  const seen = await loadSeenMap();
  const now = Date.now();

  /** @type {typeof ranked} */
  const fresh = [];
  for (const alert of ranked) {
    if (seen[alert.id]) continue;
    fresh.push(alert);
    if (fresh.length >= maxSend) break;
  }

  /** @type {object[]} */
  const sent = [];

  for (const alert of fresh) {
    if (dryRun) {
      sent.push({
        id: alert.id,
        title: alert.title,
        score: alert.score,
        barca: alert.barca,
        dryRun: true,
      });
      seen[alert.id] = now;
      continue;
    }

    const bounce = await bounceTransferAlert(alert);
    const delivered = bounce.results.some((r) => r.ok);
    // Mark seen if any channel delivered, or if both skipped for config — avoid spam loops when unconfigured.
    const onlyConfigSkip =
      bounce.results.length > 0 &&
      bounce.results.every((r) => r.skipped && !r.ok);
    if (delivered || onlyConfigSkip) {
      seen[alert.id] = now;
    }
    sent.push({
      id: alert.id,
      title: alert.title,
      score: alert.score,
      barca: alert.barca,
      reporters: alert.reporters,
      bounce,
    });
  }

  await saveSeenMap(seen);

  const summary = {
    ok: true,
    dryRun,
    feedsOk: feedResults.filter((f) => f.ok).length,
    feedsFail: feedResults.filter((f) => !f.ok).length,
    items: items.length,
    ranked: ranked.length,
    fresh: fresh.length,
    sent: sent.length,
    feedResults,
    alerts: sent,
  };

  console.log(
    JSON.stringify({
      event: "transfer_alerts_tick",
      dryRun,
      items: items.length,
      ranked: ranked.length,
      sent: sent.length,
      feedsOk: summary.feedsOk,
      feedsFail: summary.feedsFail,
    }),
  );

  return summary;
}
