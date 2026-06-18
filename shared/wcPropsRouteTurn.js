/**
 * Phase 2 — unified WC props route decision (handler + shadow).
 * Behind WC_PROPS_ROUTE_V2=1.
 */

import { previewWcPropsRoute } from "./wcPropsRoutePreview.js";
import { logWcPropsRoute } from "./wcPropsRouteLog.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

/** @returns {boolean} */
export function isWcPropsRouteV2Enabled(opts = {}) {
  const header = String(opts.routeHeader ?? "").trim();
  if (header === "0") return false;
  if (header === "1") return true;
  return process.env.WC_PROPS_ROUTE_V2 === "1";
}

/**
 * @param {object} params
 * @param {string} [params.question]
 * @param {object[]} [params.history]
 * @param {object[]} [params.matches]
 * @param {string | null} [params.incomingWcEventId]
 * @param {boolean} [params.hasImage]
 * @param {string | null} [params.wcIntent]
 */
export function routeWcPropsTurn(params) {
  const {
    question = "",
    history = [],
    matches = [],
    incomingWcEventId = null,
    hasImage = false,
    wcIntent = null,
  } = params;

  const preview = previewWcPropsRoute({
    question,
    history,
    matches,
    incomingWcEventId,
    hasImage,
  });

  const v2Enabled = isWcPropsRouteV2Enabled({
    routeHeader: params.routeHeader,
  });
  const applyRoute =
    v2Enabled &&
    preview.needsRouting &&
    preview.fetchAttempted &&
    Boolean(preview.pinnedEventId) &&
    !preview.fetchBlockedAmbiguous;

  const result = {
    v2Enabled,
    applyRoute,
    wcIntent,
    preview,
    wcEventId: applyRoute ? preview.pinnedEventId : null,
    fixtureHome: applyRoute ? preview.pinnedHome : null,
    fixtureAway: applyRoute ? preview.pinnedAway : null,
    pinMethod: preview.pinMethod,
    askShape: preview.askShape,
    loadMatchProps: applyRoute,
    fetchBlockedAmbiguous: preview.fetchBlockedAmbiguous,
    ambiguous: preview.ambiguous,
    caveat: preview.caveat,
    effectiveWcIntentForKv: applyRoute ? WC_INTENT.PLAYER_PROP : wcIntent,
  };

  logWcPropsRoute("routeWcPropsTurn", {
    v2Enabled,
    applyRoute,
    wcIntent,
    wcEventId: result.wcEventId,
    loadMatchProps: result.loadMatchProps,
    pinMethod: result.pinMethod,
    ambiguous: result.ambiguous,
  });

  return result;
}

/**
 * @param {object | null | undefined} matchPlayerProps
 */
export function countWcMatchPlayerPropMarkets(matchPlayerProps) {
  if (!matchPlayerProps?.markets || typeof matchPlayerProps.markets !== "object") {
    return 0;
  }
  let n = 0;
  for (const rows of Object.values(matchPlayerProps.markets)) {
    if (Array.isArray(rows) && rows.length) n += 1;
  }
  return n;
}
