/**
 * Structured WC props routing logs — enable with WC_PROPS_ROUTE_LOG=1 or WC_PROPS_ROUTE_V2.
 * Field names stable for Vercel log drain (Phase 2 shadow).
 */

import { isWcGoatPrimaryEnabled } from "./wcBdlPolicy.js";

/**
 * @param {string} event
 * @param {Record<string, unknown>} [data]
 */
export function logWcPropsRoute(event, data = {}) {
  if (
    process.env.WC_PROPS_ROUTE_LOG !== "1" &&
    process.env.WC_PROPS_ROUTE_V2 !== "1" &&
    !isWcGoatPrimaryEnabled()
  ) {
    return;
  }
  console.info(
    JSON.stringify({
      tag: "wcPropsRouteLog",
      event,
      ...data,
      ts: Date.now(),
    }),
  );
}
