/**
 * ESPN NBA scoreboard range fetch — playoff series + next-slate recovery on off-nights.
 */

import { getEtDateString } from "./nbaPlayoffSlateFromActionNetwork.js";
import { isNbaFinalsGame } from "./nbaFinalsUtils.js";

/** Postseason: scan through next Finals leg (2–3 day gaps between games). */
export const NBA_POSTSEASON_ESPN_LOOKAHEAD_DAYS = 14;

function toEspnDateToken(etYyyyMmDd) {
  return String(etYyyyMmDd || "").replace(/-/g, "");
}

/**
 * Add whole calendar days in US Eastern (YYYY-MM-DD), DST-safe.
 * @param {string} etYyyyMmDd
 * @param {number} deltaDays
 */
export function addCalendarDaysEt(etYyyyMmDd, deltaDays) {
  const s = String(etYyyyMmDd || "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return getEtDateString();
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const da = parseInt(m[3], 10);
  const want = `${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
  let anchor = Date.UTC(y, mo - 1, da, 12, 0, 0);
  for (let k = -36; k <= 36; k++) {
    const t = Date.UTC(y, mo - 1, da, 12 + k, 0, 0);
    if (new Date(t).toLocaleDateString("en-CA", { timeZone: "America/New_York" }) === want) {
      anchor = t;
      break;
    }
  }
  const out = new Date(anchor + Number(deltaDays) * 86400000);
  return out.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

/**
 * @param {string} startEt YYYY-MM-DD
 * @param {string} endEt YYYY-MM-DD
 */
export async function fetchEspnNbaScoreboardEventsInEtRange(startEt, endEt) {
  const startToken = toEspnDateToken(startEt);
  const endToken = toEspnDateToken(endEt);
  if (!startToken || !endToken) return [];
  const rangeToken = `${startToken}-${endToken}`;
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${encodeURIComponent(rangeToken)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.events) ? data.events : [];
  } catch {
    return [];
  }
}

/**
 * Next scheduled/live/postgame Finals event from ESPN range (earliest tipoff ≥ now − buffer).
 * @param {Array<Record<string, unknown>>} events
 * @param {number} [nowMs]
 */
export function pickNextEspnNbaFinalsEvent(events, nowMs = Date.now()) {
  const bufferMs = 4 * 60 * 60 * 1000;
  let best = null;
  let bestMs = Infinity;
  for (const ev of events || []) {
    const comp = ev?.competitions?.[0];
    const competitors = Array.isArray(comp?.competitors) ? comp.competitors : [];
    const home = competitors.find((c) => c?.homeAway === "home");
    const away = competitors.find((c) => c?.homeAway === "away");
    const mapped = {
      awayTeam: { abbr: away?.team?.abbreviation },
      homeTeam: { abbr: home?.team?.abbreviation },
    };
    if (!isNbaFinalsGame(mapped)) continue;
    const state = String(ev?.status?.type?.state || "").toLowerCase();
    if (state === "post") continue;
    const tipMs = Date.parse(String(ev?.date || ""));
    if (!Number.isFinite(tipMs) || tipMs < nowMs - bufferMs) continue;
    if (tipMs < bestMs) {
      bestMs = tipMs;
      best = ev;
    }
  }
  return best;
}

/**
 * @param {string} [todayEt] YYYY-MM-DD
 * @param {number} [lookaheadDays]
 */
export async function fetchEspnNbaPostseasonLookaheadEvents(
  todayEt = getEtDateString(),
  lookaheadDays = NBA_POSTSEASON_ESPN_LOOKAHEAD_DAYS,
) {
  const endEt = addCalendarDaysEt(todayEt, Math.max(1, lookaheadDays));
  return fetchEspnNbaScoreboardEventsInEtRange(todayEt, endEt);
}
