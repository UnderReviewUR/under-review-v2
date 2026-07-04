/**
 * World Cup hero featured match — chronological next on the slate (live, then tonight, then future).
 */

import {
  parseWcKickoffEtMs,
  resolveWcMatchEtDate,
  wcMatchOnEtBroadcastSlateDay,
  wcTodayEtYmd,
} from "./wcKickoffDisplay.js";

export function isWcLiveMatchStatus(status) {
  return ["live", "in_progress", "1h", "2h", "ht"].includes(String(status || "").toLowerCase());
}

export function isWcFinishedMatchStatus(status) {
  return String(status || "").toLowerCase() === "ft";
}

export function isWcScheduledMatchStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "ns" || s === "scheduled" || s === "not started" || s === "upcoming";
}

/** @param {{ commenceTs?: number | string | null, date?: string, time?: string } | null | undefined} match */
export function getWcMatchCommenceMs(match) {
  if (!match || typeof match !== "object") return Number.MAX_SAFE_INTEGER;
  let ms = Number(match.commenceTs);
  if (Number.isFinite(ms) && ms > 0) return ms;
  const parsed = parseWcKickoffEtMs(match.date, match.time);
  return parsed ?? Number.MAX_SAFE_INTEGER;
}

function sortByKickoff(a, b) {
  return getWcMatchCommenceMs(a) - getWcMatchCommenceMs(b);
}

/** Typical match length + stoppage before a scheduled row is treated as stale for slate picks. */
export const WC_MATCH_PLAYABLE_GRACE_MS = 3 * 60 * 60 * 1000;

/** After kickoff, keep trying to reconcile stuck NS/live rows from the feed. */
export const WC_STALE_SCORE_RECONCILE_MS = 36 * 60 * 60 * 1000;

const WC_UPCOMING_KICKOFF_SLACK_MS = 15 * 60 * 1000;

/**
 * KV row still NS/live long after kickoff — needs a scoreboard/BDL refresh, not a hero slot.
 * @param {Record<string, unknown> | null | undefined} match
 * @param {number} [nowMs]
 */
export function isWcStaleUnfinishedMatch(match, nowMs = Date.now()) {
  if (!match || isWcFinishedMatchStatus(match?.status)) return false;
  if (!isWcScheduledMatchStatus(match?.status) && !isWcLiveMatchStatus(match?.status)) {
    return false;
  }
  const kickoff = getWcMatchCommenceMs(match);
  if (!Number.isFinite(kickoff) || kickoff >= Number.MAX_SAFE_INTEGER) return false;
  const ageMs = nowMs - kickoff;
  if (ageMs < WC_MATCH_PLAYABLE_GRACE_MS) return false;
  return ageMs <= WC_STALE_SCORE_RECONCILE_MS;
}

/**
 * True when a fixture should appear in featured/upcoming UI (not a past kickoff stuck at NS).
 * @param {Record<string, unknown> | null | undefined} match
 * @param {number} [nowMs]
 */
export function isWcUpcomingFeaturedCandidate(match, nowMs = Date.now()) {
  if (!match?.homeTeam || !match?.awayTeam) return false;
  if (isWcFinishedMatchStatus(match?.status) || isWcStaleUnfinishedMatch(match, nowMs)) {
    return false;
  }
  if (isWcLiveMatchStatus(match?.status)) return true;
  if (!isWcScheduledMatchStatus(match?.status)) return false;
  const kickoff = getWcMatchCommenceMs(match);
  return kickoff >= nowMs - WC_UPCOMING_KICKOFF_SLACK_MS;
}

/**
 * @param {Array<Record<string, unknown>> | null | undefined} matches
 * @param {number} [nowMs]
 */
export function wcStaleUnfinishedPairKeys(matches, nowMs = Date.now()) {
  const keys = new Set();
  for (const m of matches || []) {
    if (!isWcStaleUnfinishedMatch(m, nowMs)) continue;
    const home = String(m.homeTeam || "").trim().toUpperCase();
    const away = String(m.awayTeam || "").trim().toUpperCase();
    if (home && away) keys.add(`${home}-${away}`);
  }
  return keys;
}

/**
 * @param {object} [opts]
 * @param {number} [opts.nowMs]
 * @param {Array} [opts.matches]
 * @param {Array} [opts.liveMatches]
 * @returns {{ match: object, kind: "live"|"today"|"next", kicker: string, extraLiveCount: number } | null}
 */
export function pickWcFeaturedMatch(opts = {}) {
  const nowMs = opts.nowMs ?? Date.now();
  const todayEt = wcTodayEtYmd(nowMs);
  const all = Array.isArray(opts.matches) ? opts.matches : [];
  const liveSrc = Array.isArray(opts.liveMatches) ? opts.liveMatches : [];
  const live = [...liveSrc]
    .filter((m) => isWcLiveMatchStatus(m.status) && !isWcStaleUnfinishedMatch(m, nowMs))
    .sort(sortByKickoff);
  if (!live.length) {
    for (const m of all) {
      if (isWcLiveMatchStatus(m.status) && !isWcStaleUnfinishedMatch(m, nowMs)) live.push(m);
    }
    live.sort(sortByKickoff);
  }

  if (live.length > 0) {
    return {
      match: live[0],
      kind: "live",
      kicker: "Live now",
      extraLiveCount: live.length - 1,
    };
  }

  const nextScheduled = all
    .filter((m) => isWcScheduledMatchStatus(m.status) && isWcUpcomingFeaturedCandidate(m, nowMs))
    .sort(sortByKickoff)[0];

  if (!nextScheduled) return null;

  const isToday = wcMatchOnEtBroadcastSlateDay(nextScheduled, todayEt);

  return {
    match: nextScheduled,
    kind: isToday ? "today" : "next",
    kicker: isToday ? "Tonight" : "Next match",
    extraLiveCount: 0,
  };
}

/**
 * Sort today's slate rows by kickoff ET.
 * @param {Array} matches
 * @param {string} todayEt YYYY-MM-DD
 */
export function sortWcTodayMatches(matches, todayEt) {
  return (matches || [])
    .filter((m) => wcMatchOnEtBroadcastSlateDay(m, todayEt))
    .sort(sortByKickoff);
}
