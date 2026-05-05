/**
 * Lightweight UR Take / Live Mode telemetry — wraps @vercel/analytics `track`.
 * Safe no-ops if analytics fails; values flattened for hosted analytics limits.
 *
 * Event names (see UR_TAKE_TELEMETRY):
 * - ur_take_live_response_generated — API returned liveMode; props: sport, intent, liveMode, followUpCount
 * - ur_take_followups_attached — followUps array non-empty; props: sport, intent, liveMode, followUpCount
 * - ur_take_followup_click — chip tap; props include followUpText, msSinceResponseShown, followUpIndex, followUpCount
 * - ur_take_followup_submit — /api/ur-take request starts from chip; props include sessionUserTurns (conversation depth)
 * - ur_take_followup_response_completed — chip round finished; props: success, roundTripMs, sessionUserTurns, optional error
 *
 * Server logs: api/ur-take stdout JSON `ur_take_complete` includes liveMode, followUpsAttached, followUpsCount.
 */

import { track } from "@vercel/analytics";

/** @see docs in repo — stable names for dashboards */
export const UR_TAKE_TELEMETRY = {
  LIVE_RESPONSE_GENERATED: "ur_take_live_response_generated",
  FOLLOWUPS_ATTACHED: "ur_take_followups_attached",
  FOLLOWUP_CLICK: "ur_take_followup_click",
  FOLLOWUP_SUBMIT: "ur_take_followup_submit",
  FOLLOWUP_RESPONSE_COMPLETED: "ur_take_followup_response_completed",
};

const TEXT_MAX = 160;

/**
 * Flatten props to primitives safe for analytics payloads.
 * @param {Record<string, unknown>} props
 * @returns {Record<string, string | number | boolean>}
 */
export function sanitizeUrTakeTelemetryProps(props) {
  /** @type {Record<string, string | number | boolean>} */
  const out = {};
  if (!props || typeof props !== "object") return out;
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "boolean" || typeof v === "number") {
      if (typeof v === "number" && !Number.isFinite(v)) continue;
      out[k] = v;
    } else if (typeof v === "string") {
      out[k] = v.length > TEXT_MAX ? `${v.slice(0, TEXT_MAX)}…` : v;
    } else {
      out[k] = String(v).slice(0, TEXT_MAX);
    }
  }
  return out;
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} [props]
 */
export function telemetryUrTake(event, props = {}) {
  try {
    track(event, sanitizeUrTakeTelemetryProps(props));
  } catch {
    /* analytics optional */
  }
}

/** Successful /api/ur-take JSON with live keyword (server sends liveMode). */
export function telemetryUrTakeLiveResponseGenerated(payload) {
  telemetryUrTake(UR_TAKE_TELEMETRY.LIVE_RESPONSE_GENERATED, payload);
}

/** Response included non-empty followUps array. */
export function telemetryUrTakeFollowUpsAttached(payload) {
  telemetryUrTake(UR_TAKE_TELEMETRY.FOLLOWUPS_ATTACHED, payload);
}

/** User tapped a follow-up chip (before submit). */
export function telemetryUrTakeFollowUpClick(payload) {
  telemetryUrTake(UR_TAKE_TELEMETRY.FOLLOWUP_CLICK, payload);
}

/** Follow-up question passed guards and a new /api/ur-take request is starting. */
export function telemetryUrTakeFollowUpSubmit(payload) {
  telemetryUrTake(UR_TAKE_TELEMETRY.FOLLOWUP_SUBMIT, payload);
}

/** Follow-up round finished (success or error overlay). */
export function telemetryUrTakeFollowUpResponseCompleted(payload) {
  telemetryUrTake(UR_TAKE_TELEMETRY.FOLLOWUP_RESPONSE_COMPLETED, payload);
}
