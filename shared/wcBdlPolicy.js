/**
 * BallDontLie GOAT — when Under Review prefers BDL over ESPN/scrapes for WC data.
 *
 * Default: ON when BALLDONTLIE_API_KEY is set.
 * Disable: WC_BDL_GOAT_PRIMARY=0
 * Force ON:  WC_BDL_GOAT_PRIMARY=1
 *
 * Request pacing (BDL tier):
 * - GOAT paid: 600 req/min (default delay 50ms between paginated calls)
 * - Free: 5 req/min — set WC_BDL_FREE_TIER=1 (13s spacing)
 * - Override: WC_BDL_REQUEST_DELAY_MS
 */

import { getEnv } from "../api/_env.js";

/** Free-tier BDL FIFA pacing — 5 requests/min. */
export const BDL_FREE_TIER_REQUEST_DELAY_MS = 13_000;

/** Default spacing for GOAT (600 req/min). */
export const BDL_GOAT_TIER_REQUEST_DELAY_MS = 50;

/**
 * Delay between paginated BDL FIFA requests.
 * @returns {number}
 */
export function getBdlRequestDelayMs() {
  const explicit = String(getEnv("WC_BDL_REQUEST_DELAY_MS") || "").trim();
  if (explicit !== "") {
    const n = Number(explicit);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  const freeTier = String(getEnv("WC_BDL_FREE_TIER") || "").trim().toLowerCase();
  if (freeTier === "1" || freeTier === "true" || freeTier === "yes") {
    return BDL_FREE_TIER_REQUEST_DELAY_MS;
  }
  return BDL_GOAT_TIER_REQUEST_DELAY_MS;
}

export function hasWcBdlApiKey() {
  return Boolean(String(getEnv("BALLDONTLIE_API_KEY") || "").trim());
}

export function isWcGoatPrimaryEnabled() {
  const flag = String(getEnv("WC_BDL_GOAT_PRIMARY") || "").trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no") return false;
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  return hasWcBdlApiKey();
}

/** True when KV/API payload came from BallDontLie (not ESPN scrape or book HTML). */
export function isWcBdlSource(source) {
  const s = String(source || "").trim().toLowerCase();
  return (
    s === "balldontlie" ||
    s === "balldontlie_live" ||
    s.startsWith("balldontlie_") ||
    s === "bdl"
  );
}

/**
 * When GOAT primary is on, refresh KV if cached payload is ESPN/scrape/static — not BDL.
 * @param {{ source?: string, sourceTier?: string } | null | undefined} kvPayload
 */
export function shouldPreferBdlRefreshOverKv(kvPayload) {
  if (!isWcGoatPrimaryEnabled()) return false;
  if (!kvPayload) return true;
  const source = String(kvPayload.source || kvPayload.sourceTier || "").trim();
  return !isWcBdlSource(source);
}

/** Book HTML scrapes are disabled for player markets when GOAT primary is on. */
export function shouldUseWcBookScrapeForPlayerMarkets() {
  return !isWcGoatPrimaryEnabled();
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
