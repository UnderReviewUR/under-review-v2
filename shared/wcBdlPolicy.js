/**
 * BallDontLie GOAT — when Under Review prefers BDL over ESPN/scrapes for WC data.
 *
 * Default: ON when BALLDONTLIE_API_KEY is set.
 * Disable: WC_BDL_GOAT_PRIMARY=0
 * Force ON:  WC_BDL_GOAT_PRIMARY=1
 */

import { getEnv } from "../api/_env.js";

export function hasWcBdlApiKey() {
  return Boolean(String(getEnv("BALLDONTLIE_API_KEY") || "").trim());
}

export function isWcGoatPrimaryEnabled() {
  const flag = String(getEnv("WC_BDL_GOAT_PRIMARY") || "").trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no") return false;
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  return hasWcBdlApiKey();
}

/** Explicit ESPN override on API requests (?source=espn). */
export function wantsEspnSource(req) {
  const q = req?.query || {};
  const source = String(q.source || q.dataSource || "").trim().toLowerCase();
  return source === "espn" || source === "scrape";
}

/** Explicit GOAT override (?source=goat) or global primary mode. */
export function wantsGoatSource(req) {
  if (wantsEspnSource(req)) return false;
  if (isWcGoatPrimaryEnabled()) return true;
  const q = req?.query || {};
  const source = String(q.source || q.dataSource || "").trim().toLowerCase();
  if (source === "goat" || source === "bdl" || source === "balldontlie") return true;
  return String(q.goat || "") === "1" || String(q.bdl || "") === "1";
}
