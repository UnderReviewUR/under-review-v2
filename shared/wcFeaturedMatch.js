/**
 * World Cup hero featured match — chronological next on the slate (live, then tonight, then future).
 */

import {
  parseWcKickoffEtMs,
  resolveWcMatchEtDate,
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
    .filter((m) => isWcLiveMatchStatus(m.status))
    .sort(sortByKickoff);
  if (!live.length) {
    for (const m of all) {
      if (isWcLiveMatchStatus(m.status)) live.push(m);
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
    .filter((m) => isWcScheduledMatchStatus(m.status) && !isWcFinishedMatchStatus(m.status))
    .sort(sortByKickoff)[0];

  if (!nextScheduled) return null;

  const nextEt = resolveWcMatchEtDate(nextScheduled);
  const isToday = nextEt === todayEt;

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
    .filter((m) => resolveWcMatchEtDate(m) === todayEt)
    .sort(sortByKickoff);
}
