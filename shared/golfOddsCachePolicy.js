/** @typedef {{ startDate?: string | null, endDate?: string | null, state?: string | null, name?: string | null }} GolfEventLike */

import { getEtYmdAt, parseYmd } from "./etDateUtils.js";

export const GOLF_ODDS_STALE_MS = 2 * 60 * 60 * 1000;
export const GOLF_ODDS_ROUND_REFRESH_MS = 60 * 60 * 1000;
export const GOLF_ODDS_OPENING_HOUR_ET = 8;
export const GOLF_ROUND_HOURS_ET = { startHour: 6, endHour: 20 };

/**
 * @param {number} [nowMs]
 */
export function getEtHour24At(nowMs = Date.now()) {
  return parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }).format(new Date(nowMs)),
    10,
  );
}

// Re-export for existing consumers
export { getEtYmdAt } from "./etDateUtils.js";

/**
 * @param {GolfEventLike | null | undefined} ev
 * @param {string} etYmd
 */
export function isGolfTournamentEtDay(ev, etYmd) {
  if (!ev) return false;
  const day = parseYmd(etYmd);
  if (!day) return false;
  const start = parseYmd(ev.startDate);
  const end = parseYmd(ev.endDate || ev.startDate);
  if (!start) return false;
  const endUse = end || start;
  const t = day.y * 10000 + day.mo * 100 + day.da;
  const s = start.y * 10000 + start.mo * 100 + start.da;
  const e = endUse.y * 10000 + endUse.mo * 100 + endUse.da;
  return t >= s && t <= e;
}

/**
 * @param {GolfEventLike | null | undefined} ev
 * @param {number} [nowMs]
 */
export function isGolfRoundHoursEt(ev, nowMs = Date.now()) {
  const state = String(ev?.state || "").toLowerCase();
  if (state === "in" || state === "live") return true;
  const hour = getEtHour24At(nowMs);
  return hour >= GOLF_ROUND_HOURS_ET.startHour && hour < GOLF_ROUND_HOURS_ET.endHour;
}

/**
 * @param {GolfEventLike | null | undefined} ev
 * @param {number} [nowMs]
 */
export function isGolfActiveTournament(ev, nowMs = Date.now()) {
  if (!ev) return false;
  const state = String(ev.state || "").toLowerCase();
  if (state === "in" || state === "live") return true;
  if (state === "pre" && isGolfTournamentEtDay(ev, getEtYmdAt(nowMs))) return true;
  return isGolfTournamentEtDay(ev, getEtYmdAt(nowMs)) && isGolfRoundHoursEt(ev, nowMs);
}

/**
 * @param {{ fetchedAtMs: number, openingRefreshEtYmd?: string | null }} cached
 * @param {number} nowMs
 * @param {GolfEventLike | null | undefined} currentEvent
 */
export function needsGolfOddsOpeningRefresh(cached, nowMs, currentEvent) {
  const today = getEtYmdAt(nowMs);
  if (!isGolfTournamentEtDay(currentEvent, today)) return false;
  if (getEtHour24At(nowMs) < GOLF_ODDS_OPENING_HOUR_ET) return false;
  return cached.openingRefreshEtYmd !== today;
}

/**
 * @param {number} nowMs
 * @param {GolfEventLike | null | undefined} currentEvent
 */
export function golfOddsCacheTtlMs(nowMs, currentEvent) {
  if (isGolfActiveTournament(currentEvent, nowMs) && isGolfRoundHoursEt(currentEvent, nowMs)) {
    return GOLF_ODDS_ROUND_REFRESH_MS;
  }
  return GOLF_ODDS_STALE_MS;
}

/**
 * @param {{ fetchedAtMs: number, openingRefreshEtYmd?: string | null } | null | undefined} cached
 * @param {number} nowMs
 * @param {GolfEventLike | null | undefined} currentEvent
 */
export function shouldRefreshGolfOddsCache(cached, nowMs, currentEvent) {
  if (!cached?.fetchedAtMs) return true;
  if (needsGolfOddsOpeningRefresh(cached, nowMs, currentEvent)) return true;
  const age = nowMs - cached.fetchedAtMs;
  return age >= golfOddsCacheTtlMs(nowMs, currentEvent);
}

/**
 * @param {number} fetchedAtMs
 * @param {number} [nowMs]
 */
export function buildGolfOddsFreshness(fetchedAtMs, nowMs = Date.now()) {
  const ageMs = Math.max(0, nowMs - fetchedAtMs);
  const isStale = ageMs > GOLF_ODDS_STALE_MS;
  return {
    fetchedAt: new Date(fetchedAtMs).toISOString(),
    ageMinutes: Math.round(ageMs / 60000),
    isStale,
    staleWarning: isStale
      ? "Odds data is more than 2 hours old — do not cite specific American prices as current live lines; describe relative value in words or ask the user to confirm prices."
      : null,
  };
}
