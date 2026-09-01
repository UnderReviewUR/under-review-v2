/**
 * BallDontLie GOAT trial pacing — 5 req/min during 48h trial vs 600 req/min paid.
 * Auto-expires Sept 3, 2026 11:00 AM America/Chicago (paid GOAT start).
 * Override: BALLDONTLIE_TRIAL_PACE=1|0
 */
import { getEnv } from "../api/_env.js";

/** Sept 3, 2026 11:00 AM CDT (UTC-5) */
export const BDL_GOAT_TRIAL_END_MS = Date.parse("2026-09-03T16:00:00.000Z");

export function bdlGoatTrialEndsAtIso() {
  return new Date(BDL_GOAT_TRIAL_END_MS).toISOString();
}

/**
 * When true: conservative caching + board-first context (5 req/min trial).
 * When false: paid GOAT pacing — fresher boards, full briefcase hydration.
 */
export function isBdlGoatTrialPaceActive() {
  const flag = String(getEnv("BALLDONTLIE_TRIAL_PACE") || "").trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return Date.now() < BDL_GOAT_TRIAL_END_MS;
}

/** Board cache TTL — long during trial, shorter once paid GOAT is live. */
export function getBdlBoardCacheTtlMs() {
  return isBdlGoatTrialPaceActive() ? 120_000 : 45_000;
}
