/**
 * Batch analysis for UR Take live follow-up telemetry (offline-friendly).
 * Expects event objects shaped like Vercel `track(name, props)` payloads:
 * `{ event: string, ...props }` or `{ name: string, ...props }`.
 */

import { UR_TAKE_TELEMETRY } from "./urTakeTelemetry.js";

/** @typedef {{ event?: string, name?: string, [k: string]: unknown }} UrTakeTelemetryBatchEvent */

const E = UR_TAKE_TELEMETRY;

/** Click-through rate floor before phrasing warning */
export const GUARDRAIL_MIN_CLICK_RATE = 0.05;

/** Median / avg time-to-click threshold (ms) */
export const GUARDRAIL_MAX_AVG_MS_TO_CLICK = 8000;

/** Minimum completion success ratio before friction warning */
export const GUARDRAIL_MIN_COMPLETION_SUCCESS = 0.8;

/**
 * Lowercase, trim, collapse internal whitespace for stable grouping.
 * @param {unknown} text
 * @returns {string}
 */
export function normalizeFollowUpText(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * @param {UrTakeTelemetryBatchEvent} e
 */
function eventName(e) {
  const n = e?.event ?? e?.name ?? "";
  return String(n);
}

/**
 * @param {UrTakeTelemetryBatchEvent[]} events
 */
export function computeUrTakeFollowUpMetrics(events) {
  const list = Array.isArray(events) ? events : [];

  let liveResponses = 0;
  let followUpsAttached = 0;
  let followUpClicks = 0;
  let completionsTotal = 0;
  let completionsSuccess = 0;

  /** @type {number[]} */
  const msToClickSamples = [];
  /** @type {number[]} */
  const roundTripSamples = [];
  /** @type {number[]} */
  const sessionTurnSamples = [];

  for (const raw of list) {
    const ev = eventName(raw);
    if (ev === E.LIVE_RESPONSE_GENERATED) liveResponses += 1;
    if (ev === E.FOLLOWUPS_ATTACHED) followUpsAttached += 1;
    if (ev === E.FOLLOWUP_CLICK) {
      followUpClicks += 1;
      const ms = Number(raw.msSinceResponseShown);
      if (Number.isFinite(ms) && ms >= 0) msToClickSamples.push(ms);
    }
    if (ev === E.FOLLOWUP_RESPONSE_COMPLETED) {
      completionsTotal += 1;
      if (raw.success === true) completionsSuccess += 1;
      const rt = Number(raw.roundTripMs);
      if (Number.isFinite(rt) && rt >= 0) roundTripSamples.push(rt);
      const st = Number(raw.sessionUserTurns);
      if (Number.isFinite(st) && st >= 0) sessionTurnSamples.push(st);
    }
    if (ev === E.FOLLOWUP_SUBMIT) {
      const st = Number(raw.sessionUserTurns);
      if (Number.isFinite(st) && st >= 0) sessionTurnSamples.push(st);
    }
  }

  const avg = (arr) =>
    arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;

  const followUpClickRate =
    followUpsAttached > 0 ? followUpClicks / followUpsAttached : null;
  const continuationRate =
    liveResponses > 0 ? completionsSuccess / liveResponses : null;
  const completionSuccessRate =
    completionsTotal > 0 ? completionsSuccess / completionsTotal : null;

  return {
    counts: {
      liveResponses,
      followUpsAttached,
      followUpClicks,
      completionsTotal,
      completionsSuccess,
    },
    followUpClickRate,
    continuationRate,
    completionSuccessRate,
    avgTimeToClickMs: avg(msToClickSamples),
    avgRoundTripMs: avg(roundTripSamples),
    avgSessionDepth: avg(sessionTurnSamples),
  };
}

/**
 * Per–follow-up phrase stats for copy tuning.
 * Impressions: from optional `followUpTexts` on FOLLOWUPS_ATTACHED events; otherwise clicks bound visibility (see row.impressionsEstimated).
 *
 * @param {UrTakeTelemetryBatchEvent[]} events
 * @returns {{
 *   rows: Array<{
 *     followUpText: string,
 *     impressions: number,
 *     clicks: number,
 *     completions: number,
 *     successes: number,
 *     clickThroughRate: number | null,
 *     completionRate: number | null,
 *     impressionsEstimated: boolean,
 *   }>,
 *   aggregateChipSlotsWithoutTexts: number,
 * }}
 */
export function groupFollowUpPerformance(events) {
  const list = Array.isArray(events) ? events : [];

  /** @type {Map<string, { impressions: number, clicks: number, completions: number, successes: number, impressionsFromAttach: boolean }>} */
  const map = new Map();

  let aggregateChipSlotsWithoutTexts = 0;

  const bump = (key, fn) => {
    if (!map.has(key)) {
      map.set(key, {
        impressions: 0,
        clicks: 0,
        completions: 0,
        successes: 0,
        impressionsFromAttach: false,
      });
    }
    fn(map.get(key));
  };

  for (const raw of list) {
    const ev = eventName(raw);
    if (ev === E.FOLLOWUPS_ATTACHED) {
      const texts = raw.followUpTexts;
      const fc = Number(raw.followUpCount);
      if (Array.isArray(texts) && texts.length > 0) {
        for (const t of texts) {
          const key = normalizeFollowUpText(t);
          if (!key) continue;
          bump(key, (r) => {
            r.impressions += 1;
            r.impressionsFromAttach = true;
          });
        }
      } else if (Number.isFinite(fc) && fc > 0) {
        aggregateChipSlotsWithoutTexts += fc;
      }
    }

    if (ev === E.FOLLOWUP_CLICK) {
      const key = normalizeFollowUpText(raw.followUpText);
      if (!key) continue;
      bump(key, (r) => {
        r.clicks += 1;
      });
    }

    if (ev === E.FOLLOWUP_RESPONSE_COMPLETED) {
      const key = normalizeFollowUpText(raw.followUpText);
      if (!key) continue;
      bump(key, (r) => {
        r.completions += 1;
        if (raw.success === true) r.successes += 1;
      });
    }
  }

  /** Keys that had clicks but zero impressions from attach payloads — floor impressions at clicks */
  for (const [key, row] of map.entries()) {
    if (row.clicks > 0 && row.impressions === 0) {
      row.impressions = row.clicks;
    }
  }

  const rows = [];
  for (const [followUpText, r] of map.entries()) {
    const impressionsEstimated = Boolean(r.clicks > 0 && !r.impressionsFromAttach);
    const ctr =
      r.impressions > 0 ? r.clicks / r.impressions : r.clicks > 0 ? 1 : null;
    const completionRate = r.clicks > 0 ? r.successes / r.clicks : null;

    rows.push({
      followUpText,
      impressions: r.impressions,
      clicks: r.clicks,
      completions: r.completions,
      successes: r.successes,
      clickThroughRate: ctr,
      completionRate,
      impressionsEstimated,
    });
  }

  rows.sort((a, b) => b.clicks - a.clicks);

  return { rows, aggregateChipSlotsWithoutTexts };
}

/**
 * @typedef {{ code: string, message: string, metrics?: ReturnType<typeof computeUrTakeFollowUpMetrics> }} UrTakeGuardrailWarning
 */

/**
 * @typedef {{ minAttached?: number, minClicks?: number, minCompletions?: number }} GuardrailSampleThresholds
 */

/**
 * @param {ReturnType<typeof computeUrTakeFollowUpMetrics>} metrics
 * @param {GuardrailSampleThresholds} [sampleThresholds] — minimum counts before firing (defaults reduce noise)
 * @returns {UrTakeGuardrailWarning[]}
 */
export function evaluateUrTakeFollowUpGuardrails(metrics, sampleThresholds = {}) {
  const warnings = [];
  if (!metrics) return warnings;

  const minA = sampleThresholds.minAttached ?? 20;
  const minClk = sampleThresholds.minClicks ?? 10;
  const minComp = sampleThresholds.minCompletions ?? 15;

  const ctr = metrics.followUpClickRate;
  const avgMs = metrics.avgTimeToClickMs;
  const csr = metrics.completionSuccessRate;

  if (
    ctr != null &&
    ctr < GUARDRAIL_MIN_CLICK_RATE &&
    (metrics.counts?.followUpsAttached ?? 0) >= minA
  ) {
    warnings.push({
      code: "low_followup_ctr",
      message: "Follow-up engagement low — review phrasing",
      metrics,
    });
  }

  if (
    avgMs != null &&
    avgMs > GUARDRAIL_MAX_AVG_MS_TO_CLICK &&
    (metrics.counts?.followUpClicks ?? 0) >= minClk
  ) {
    warnings.push({
      code: "slow_time_to_click",
      message: "Follow-up engagement low — review phrasing",
      metrics,
    });
  }

  if (
    csr != null &&
    csr < GUARDRAIL_MIN_COMPLETION_SUCCESS &&
    (metrics.counts?.completionsTotal ?? 0) >= minComp
  ) {
    warnings.push({
      code: "followup_completion_friction",
      message: "Follow-up flow friction — check latency or errors",
      metrics,
    });
  }

  return warnings;
}

/**
 * Compute metrics + guardrails and `console.warn` when thresholds breach (browser or Node).
 * @param {UrTakeTelemetryBatchEvent[]} events
 * @param {GuardrailSampleThresholds} [sampleThresholds]
 * @returns {{ metrics: ReturnType<typeof computeUrTakeFollowUpMetrics>, warnings: UrTakeGuardrailWarning[] }}
 */
export function logUrTakeFollowUpGuardrails(events, sampleThresholds = {}) {
  const metrics = computeUrTakeFollowUpMetrics(events);
  const warnings = evaluateUrTakeFollowUpGuardrails(metrics, sampleThresholds);

  for (const w of warnings) {
    try {
      console.warn(`[ur-take-metrics] ${w.code}: ${w.message}`, {
        followUpClickRate: metrics.followUpClickRate,
        avgTimeToClickMs: metrics.avgTimeToClickMs,
        completionSuccessRate: metrics.completionSuccessRate,
        counts: metrics.counts,
      });
    } catch {
      /* ignore */
    }
  }

  return { metrics, warnings };
}

/**
 * Top phrases by CTR and by completion rate (min clicks to reduce noise).
 *
 * @param {UrTakeTelemetryBatchEvent[]} events
 * @param {{ limit?: number, minClicks?: number }} [opts]
 */
export function topPerformingFollowUps(events, opts = {}) {
  const limit = Math.max(1, Number(opts.limit) || 5);
  const minClicks = Math.max(1, Number(opts.minClicks) || 3);

  const { rows } = groupFollowUpPerformance(events);

  const eligible = rows.filter((r) => r.clicks >= minClicks);

  const byClickThroughRate = [...eligible]
    .filter((r) => r.clickThroughRate != null)
    .sort((a, b) => (b.clickThroughRate ?? 0) - (a.clickThroughRate ?? 0))
    .slice(0, limit);

  const byCompletionRate = [...eligible]
    .filter((r) => r.completionRate != null)
    .sort((a, b) => (b.completionRate ?? 0) - (a.completionRate ?? 0))
    .slice(0, limit);

  return { byClickThroughRate, byCompletionRate };
}

/**
 * Debug helper: prints top phrases to console (no API).
 * @param {UrTakeTelemetryBatchEvent[]} events
 * @param {{ limit?: number, minClicks?: number }} [opts]
 */
export function dumpTopPerformingFollowUpsToConsole(events, opts = {}) {
  const out = topPerformingFollowUps(events, opts);
  try {
    console.log("[ur-take-metrics] top by clickThroughRate", out.byClickThroughRate);
    console.log("[ur-take-metrics] top by completionRate", out.byCompletionRate);
  } catch {
    /* ignore */
  }
  return out;
}
