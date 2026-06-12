/**
 * WC take card display modes in dock / focus threads.
 */

import { isUrLatestCompleteAiRow } from "./urFocusSession.js";

/** @typedef {"full" | "compact" | "collapsed"} WcTakeCardDisplayMode */

/**
 * @param {string} callType
 */
export function wcCallTypeUsesCompactCard(callType) {
  const ct = String(callType || "").toLowerCase();
  if (!ct || ct === "rules" || ct === "predictions_roundup") return false;
  return true;
}

/** @param {string} sportHint @param {object | null | undefined} structured */
export function isWcDockCompactEligible(structured, sportHint = "") {
  const rawSport = String(structured?.sport || "").toLowerCase();
  const sport =
    rawSport && rawSport !== "generic"
      ? rawSport
      : String(sportHint || "").toLowerCase();
  if (sport !== "worldcup") return false;
  const ct = String(structured?.callType || "").toLowerCase();
  if (ct === "rules" || ct === "predictions_roundup") return false;
  return true;
}

/**
 * @param {object | null | undefined} structured
 * @param {{ docked?: boolean, focusSession?: boolean, msgs?: object[], msgIndex?: number, message?: object | null, sportHint?: string }} opts
 * @returns {WcTakeCardDisplayMode}
 */
export function resolveWcTakeCardDisplayMode(structured, opts = {}) {
  const sportHint = String(opts.sportHint || opts.message?.sport || "").toLowerCase();
  const rawSport = String(structured?.sport || "").toLowerCase();
  const sport =
    rawSport && rawSport !== "generic"
      ? rawSport
      : sportHint || rawSport;
  const docked = Boolean(opts.docked);
  const focusSession = Boolean(opts.focusSession);

  if (docked || focusSession) {
    if (isWcDockCompactEligible({ ...structured, sport }, sportHint)) {
      const msgs = Array.isArray(opts.msgs) ? opts.msgs : [];
      const msgIndex = Number(opts.msgIndex);
      const message = opts.message;
      if (
        message &&
        msgs.length > 0 &&
        Number.isFinite(msgIndex) &&
        !isUrLatestCompleteAiRow(msgs, msgIndex, message)
      ) {
        return "collapsed";
      }
      return "compact";
    }
  }

  if (!structured || typeof structured !== "object") return "full";
  if (sport !== "worldcup") return "full";
  if (!wcCallTypeUsesCompactCard(structured.callType)) return "full";

  const msgs = Array.isArray(opts.msgs) ? opts.msgs : [];
  const msgIndex = Number(opts.msgIndex);
  const message = opts.message;

  if (
    message &&
    msgs.length > 0 &&
    Number.isFinite(msgIndex) &&
    !isUrLatestCompleteAiRow(msgs, msgIndex, message)
  ) {
    return "collapsed";
  }

  if (docked || focusSession) return "compact";
  return "full";
}

/** @param {WcTakeCardDisplayMode} mode */
export function wcTakeCardUsesFocusLayout(mode) {
  return mode === "compact";
}

/** @param {WcTakeCardDisplayMode} mode */
export function wcTakeCardIsCollapsed(mode) {
  return mode === "collapsed";
}
