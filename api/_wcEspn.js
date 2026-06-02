/**
 * ESPN FIFA World Cup 2026 — free scoreboard + standings fetch/normalize.
 * Pattern: standings like api/_nbaPlayoffPath.js; scoreboard like api/mlb.js.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import {
  WC_SCOREBOARD_END_YMD,
  WC_SCOREBOARD_START_YMD,
} from "../shared/wc2026Constants.js";

export const ESPN_WC_STANDINGS_URL =
  "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings";
export const ESPN_WC_SCOREBOARD_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
export const ESPN_WC_FUTURES_URL =
  "https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026/futures";

/** @type {Map<string, string>} */
const ABBR_TO_GROUP = new Map(
  WC_2026_TEAMS.map((t) => [String(t.abbreviation).toUpperCase(), String(t.group).toUpperCase()]),
);

/** ESPN occasionally diverges — map to internal FIFA abbreviations. */
export const ESPN_ABBR_OVERRIDES = {
  KORS: "KOR",
};

/**
 * @param {string} abbr
 */
export function normalizeEspnAbbr(abbr) {
  const cleaned = String(abbr || "")
    .trim()
    .replace(/\./g, "")
    .toUpperCase();
  return ESPN_ABBR_OVERRIDES[cleaned] || cleaned;
}

/**
 * @param {string} abbr
 */
export function groupLetterForAbbr(abbr) {
  return ABBR_TO_GROUP.get(normalizeEspnAbbr(abbr)) || "";
}

/**
 * @param {Array<{ name?: string, value?: number }>} stats
 * @param {string} name
 */
function statValue(stats, name) {
  const row = (stats || []).find((s) => s?.name === name);
  if (!row) return 0;
  const n = Number(row.value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {unknown} json
 */
export function normalizeEspnStandings(json) {
  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const groups = {};
  const children = Array.isArray(json?.children) ? json.children : [];

  for (const child of children) {
    const letter = String(child?.name || "")
      .trim()
      .toUpperCase()
      .replace(/^GROUP\s*/i, "");
    const entries = child?.standings?.entries;
    if (!letter || !Array.isArray(entries) || !entries.length) continue;

    groups[letter] = entries
      .map((entry) => {
        const abbr = normalizeEspnAbbr(entry?.team?.abbreviation);
        const stats = entry?.stats || [];
        const gf = statValue(stats, "pointsFor");
        const ga = statValue(stats, "pointsAgainst");
        return {
          team: abbr,
          played: statValue(stats, "gamesPlayed"),
          won: statValue(stats, "wins"),
          drawn: statValue(stats, "ties"),
          lost: statValue(stats, "losses"),
          gf,
          ga,
          gd: statValue(stats, "pointDifferential"),
          points: statValue(stats, "points"),
        };
      })
      .sort((a, b) => Number(b.points) - Number(a.points) || Number(b.gd) - Number(a.gd));
  }

  return groups;
}

/**
 * @param {Record<string, unknown>} statusType
 */
export function normalizeEspnMatchStatus(statusType) {
  const state = String(statusType?.state || "").toLowerCase();
  const detail = String(statusType?.detail || statusType?.description || "").toLowerCase();

  if (state === "post" || statusType?.completed) return "FT";
  if (state === "in") {
    if (detail.includes("half") || detail.includes("ht")) return "HT";
    return "live";
  }
  if (state === "pre") return "NS";
  return "NS";
}

/**
 * @param {string | undefined} american
 */
function formatAmericanOdds(american) {
  if (american == null) return null;
  const raw = String(american).trim();
  if (!raw) return null;
  if (/^[+-]/.test(raw)) return raw;
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return n > 0 ? `+${n}` : String(n);
}

/**
 * @param {unknown} oddsBlock
 */
export function extractEspnMatchOdds(oddsBlock) {
  const ml = oddsBlock?.moneyline;
  if (!ml || typeof ml !== "object") return null;
  const home = formatAmericanOdds(ml.home?.close?.odds ?? ml.home?.open?.odds);
  const away = formatAmericanOdds(ml.away?.close?.odds ?? ml.away?.open?.odds);
  const draw = formatAmericanOdds(ml.draw?.close?.odds ?? ml.draw?.open?.odds);
  if (!home && !away && !draw) return null;
  return {
    home: home ? { moneyline: home } : undefined,
    away: away ? { moneyline: away } : undefined,
    draw: draw ? { moneyline: draw } : undefined,
    provider: oddsBlock?.provider?.name || "ESPN",
  };
}

/**
 * @param {Record<string, unknown>} event
 */
export function normalizeEspnScoreboardEvent(event) {
  if (!event || typeof event !== "object") return null;
  const comp = event.competitions?.[0];
  if (!comp) return null;

  const home = comp.competitors?.find((c) => c.homeAway === "home");
  const away = comp.competitors?.find((c) => c.homeAway === "away");
  const homeTeam = normalizeEspnAbbr(home?.team?.abbreviation);
  const awayTeam = normalizeEspnAbbr(away?.team?.abbreviation);
  if (!homeTeam || !awayTeam) return null;

  const statusType = comp.status?.type || event.status?.type || {};
  const state = String(statusType?.state || "").toLowerCase();
  const isFinal = state === "post" || statusType?.completed;
  const isLive = state === "in";

  const homeScoreRaw = home?.score;
  const awayScoreRaw = away?.score;
  const homeScore =
    isFinal || isLive ? (homeScoreRaw != null ? Number(homeScoreRaw) : 0) : null;
  const awayScore =
    isFinal || isLive ? (awayScoreRaw != null ? Number(awayScoreRaw) : 0) : null;

  const dateRaw = String(comp.date || event.date || "");
  const commenceTs = Date.parse(dateRaw) || null;
  const time =
    commenceTs != null
      ? new Date(commenceTs).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "America/New_York",
        }) + " ET"
      : "";

  const group = groupLetterForAbbr(homeTeam) || groupLetterForAbbr(awayTeam);
  const odds = extractEspnMatchOdds(comp.odds?.[0]);

  return {
    id: event.id ?? comp.id ?? `${homeTeam}-${awayTeam}-${dateRaw}`,
    homeTeam,
    awayTeam,
    homeScore: Number.isFinite(homeScore) ? homeScore : null,
    awayScore: Number.isFinite(awayScore) ? awayScore : null,
    status: normalizeEspnMatchStatus(statusType),
    date: dateRaw.slice(0, 10),
    time,
    stadium: String(comp.venue?.fullName || "").trim(),
    city: String(comp.venue?.address?.city || "").trim(),
    group,
    round: String(event.season?.type?.name || event.season?.slug || "").trim(),
    commenceTs,
    odds,
  };
}

/**
 * @param {string} ymdCompact — YYYYMMDD
 */
export async function fetchEspnScoreboardForDate(ymdCompact) {
  const url = `${ESPN_WC_SCOREBOARD_BASE}?dates=${encodeURIComponent(ymdCompact)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, status: res.status, events: [], error: `ESPN scoreboard ${res.status}` };
    }
    const json = await res.json();
    return { ok: true, status: res.status, events: Array.isArray(json?.events) ? json.events : [] };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      status: 0,
      events: [],
      error: err?.message || "ESPN scoreboard fetch failed",
    };
  }
}

/**
 * Iterate WC tournament dates and dedupe events by id.
 */
export async function fetchEspnAllMatches() {
  /** @type {Map<string, Record<string, unknown>>} */
  const byId = new Map();
  const errors = [];

  const start = new Date(`${WC_SCOREBOARD_START_YMD.slice(0, 4)}-${WC_SCOREBOARD_START_YMD.slice(4, 6)}-${WC_SCOREBOARD_START_YMD.slice(6, 8)}T12:00:00Z`);
  const end = new Date(`${WC_SCOREBOARD_END_YMD.slice(0, 4)}-${WC_SCOREBOARD_END_YMD.slice(4, 6)}-${WC_SCOREBOARD_END_YMD.slice(6, 8)}T12:00:00Z`);

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const ymd = `${y}${m}${day}`;

    const res = await fetchEspnScoreboardForDate(ymd);
    if (!res.ok) {
      errors.push(res.error);
      continue;
    }
    for (const ev of res.events) {
      const row = normalizeEspnScoreboardEvent(ev);
      if (!row?.id) continue;
      byId.set(String(row.id), row);
    }
  }

  const matches = [...byId.values()].sort(
    (a, b) => (Number(a.commenceTs) || 0) - (Number(b.commenceTs) || 0),
  );

  if (!matches.length) {
    return { ok: false, matches: [], error: errors[0] || "No ESPN matches parsed" };
  }

  return { ok: true, matches, error: null };
}

export async function fetchEspnStandings() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(ESPN_WC_STANDINGS_URL, { cache: "no-store", signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, groups: {}, error: `ESPN standings ${res.status}` };
    }
    const json = await res.json();
    const groups = normalizeEspnStandings(json);
    if (Object.keys(groups).length < 12) {
      return { ok: false, groups, error: "ESPN standings incomplete" };
    }
    return { ok: true, groups, error: null };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, groups: {}, error: err?.message || "ESPN standings fetch failed" };
  }
}

/**
 * @param {unknown} json
 */
export function normalizeEspnFutures(json) {
  /** @type {Record<string, string>} */
  const outrights = {};
  const items = Array.isArray(json?.items) ? json.items : [];

  for (const item of items) {
    const entries = item?.entries || item?.participants || item?.choices;
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const abbr = normalizeEspnAbbr(
        entry?.team?.abbreviation || entry?.abbreviation || entry?.teamAbbr,
      );
      const odds = formatAmericanOdds(
        entry?.odds?.american ??
          entry?.americanOdds ??
          entry?.price ??
          entry?.value ??
          entry?.odds,
      );
      if (abbr && odds) outrights[abbr] = odds;
    }
  }

  return outrights;
}

export async function fetchEspnOutrights() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${ESPN_WC_FUTURES_URL}?limit=200`, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, outrights: {}, error: `ESPN futures ${res.status}` };
    }
    const json = await res.json();
    const outrights = normalizeEspnFutures(json);
    if (!Object.keys(outrights).length) {
      return { ok: false, outrights: {}, error: "ESPN futures empty" };
    }
    return { ok: true, outrights, error: null };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, outrights: {}, error: err?.message || "ESPN futures fetch failed" };
  }
}

/**
 * Refresh odds for one event from its scoreboard date.
 * @param {string | number} eventId
 * @param {string} dateYmd — YYYY-MM-DD
 */
export async function fetchEspnMatchOddsForEvent(eventId, dateYmd) {
  const compact = String(dateYmd || "").replace(/-/g, "");
  if (!compact) return { ok: false, odds: null, error: "missing_date" };

  const res = await fetchEspnScoreboardForDate(compact);
  if (!res.ok) return { ok: false, odds: null, error: res.error };

  const id = String(eventId);
  for (const ev of res.events) {
    if (String(ev?.id) !== id) continue;
    const comp = ev.competitions?.[0];
    const odds = extractEspnMatchOdds(comp?.odds?.[0]);
    if (odds) return { ok: true, odds, error: null };
    return { ok: false, odds: null, error: "no_embedded_odds" };
  }

  return { ok: false, odds: null, error: "event_not_found" };
}
