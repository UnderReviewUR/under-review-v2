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

/**
 * @param {object | null | undefined} structured
 * @param {{ docked?: boolean, focusSession?: boolean, msgs?: object[], msgIndex?: number, message?: object | null }} opts
 * @returns {WcTakeCardDisplayMode}
 */
export function resolveWcTakeCardDisplayMode(structured, opts = {}) {
  if (!structured || typeof structured !== "object") return "full";
  if (String(structured.sport || "").toLowerCase() !== "worldcup") return "full";
  if (!wcCallTypeUsesCompactCard(structured.callType)) return "full";

  const msgs = Array.isArray(opts.msgs) ? opts.msgs : [];
  const msgIndex = Number(opts.msgIndex);
  const message = opts.message;
  const docked = Boolean(opts.docked);
  const focusSession = Boolean(opts.focusSession);

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
