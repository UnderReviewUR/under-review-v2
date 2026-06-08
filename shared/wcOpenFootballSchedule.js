/**
 * openfootball/worldcup.json — schedule validation + ESPN outage fallback.
 * @see https://github.com/openfootball/worldcup.json
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";

export const OPENFOOTBALL_WC2026_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

/** @type {Set<string>} */
const KNOWN_ABBRS = new Set(WC_2026_TEAMS.map((t) => String(t.abbreviation).toUpperCase()));

/** openfootball label → internal FIFA abbreviation */
export const OPENFOOTBALL_NAME_ALIASES = {
  czechrepublic: "CZE",
  czechia: "CZE",
  bosniaherzegovina: "BIH",
  turkey: "TUR",
  turkiye: "TUR",
};

function normalizeTeamNameKey(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

/** @type {Map<string, string>} */
const NAME_TO_ABBR = new Map(
  WC_2026_TEAMS.flatMap((t) => [
    [normalizeTeamNameKey(t.name), t.abbreviation],
    [normalizeTeamNameKey(t.shortName), t.abbreviation],
  ]),
);

/**
 * @param {string} name
 */
export function abbrForOpenFootballTeam(name) {
  const raw = String(name || "").trim();
  if (!raw) return null;

  const key = normalizeTeamNameKey(raw);
  if (NAME_TO_ABBR.has(key)) return NAME_TO_ABBR.get(key);
  if (OPENFOOTBALL_NAME_ALIASES[key]) return OPENFOOTBALL_NAME_ALIASES[key];

  for (const [n, abbr] of NAME_TO_ABBR) {
    if (key.includes(n) || n.includes(key)) return abbr;
  }

  // Knockout placeholder slot (e.g. 2A, 3A/B/C/D/F, W74)
  const compact = raw.replace(/\s/g, "");
  if (/^[123][a-z](\/[a-z0-9]+)*$/i.test(compact)) {
    return raw.toUpperCase();
  }
  if (/^W\d+$/i.test(compact)) {
    return compact.toUpperCase();
  }

  return null;
}

/**
 * Parse openfootball kickoff strings like `13:00 UTC-6`.
 * @param {string} dateYmd
 * @param {string} timeStr
 */
export function parseOpenFootballKickoffUtc(dateYmd, timeStr) {
  const date = String(dateYmd || "").trim();
  const raw = String(timeStr || "").trim();
  const m = raw.match(/^(\d{1,2}):(\d{2})\s*UTC([+-]?\d+(?:\.\d+)?)/i);
  if (!date || !m) return null;

  const hour = Number(m[1]);
  const min = Number(m[2]);
  const offsetHours = Number(m[3]);
  if (!Number.isFinite(hour) || !Number.isFinite(min) || !Number.isFinite(offsetHours)) {
    return null;
  }

  const utcMs = Date.parse(`${date}T00:00:00Z`) + (hour - offsetHours) * 3600000 + min * 60000;
  return Number.isFinite(utcMs) ? utcMs : null;
}

/**
 * @param {Record<string, unknown>} row
 * @param {number} [nowMs]
 */
export function normalizeOpenFootballMatch(row, nowMs = Date.now()) {
  if (!row || typeof row !== "object") return null;

  const homeTeam = abbrForOpenFootballTeam(row.team1);
  const awayTeam = abbrForOpenFootballTeam(row.team2);
  if (!homeTeam || !awayTeam) return null;

  const date = String(row.date || "").slice(0, 10);
  const commenceTs = parseOpenFootballKickoffUtc(date, row.time);
  const time =
    commenceTs != null
      ? new Date(commenceTs).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "America/New_York",
        }) + " ET"
      : String(row.time || "").trim();

  const groupRaw = String(row.group || "").trim();
  const group = groupRaw.replace(/^Group\s*/i, "").toUpperCase();
  const num = row.num != null ? Number(row.num) : null;
  const id =
    num != null && Number.isFinite(num)
      ? `of-${num}`
      : `of-${homeTeam}-${awayTeam}-${date}`;

  return {
    id,
    homeTeam,
    awayTeam,
    homeScore: null,
    awayScore: null,
    status: "NS",
    date,
    time,
    stadium: String(row.ground || "").trim(),
    city: "",
    group,
    round: String(row.round || "").trim(),
    commenceTs,
    openFootballNum: Number.isFinite(num) ? num : null,
    source: "openfootball",
    ...(commenceTs != null ? { scheduleCheckedAt: nowMs } : {}),
  };
}

/**
 * @param {unknown} json
 * @param {number} [nowMs]
 */
export function normalizeOpenFootballSchedule(json, nowMs = Date.now()) {
  const rows = Array.isArray(json?.matches) ? json.matches : [];
  const matches = rows
    .map((row) => normalizeOpenFootballMatch(row, nowMs))
    .filter(Boolean)
    .sort((a, b) => (Number(a.commenceTs) || 0) - (Number(b.commenceTs) || 0));

  return matches;
}

/**
 * @param {Record<string, unknown>} match
 */
export function isWcGroupStageMatch(match) {
  if (!match?.group || !match.homeTeam || !match.awayTeam) return false;
  return KNOWN_ABBRS.has(String(match.homeTeam)) && KNOWN_ABBRS.has(String(match.awayTeam));
}

/**
 * Group-stage fixture identity — ignores date/home-away order (timezone swaps).
 * @param {Record<string, unknown>} match
 */
function groupFixtureKey(match) {
  const pair = [String(match.homeTeam), String(match.awayTeam)].sort().join("|");
  return `${String(match.group || "").toUpperCase()}|${pair}`;
}

/**
 * Cross-check ESPN group-stage fixtures against openfootball (72 matches).
 * @param {Array<Record<string, unknown>>} espnMatches
 * @param {Array<Record<string, unknown>>} openFootballMatches
 */
export function validateEspnScheduleAgainstOpenFootball(espnMatches, openFootballMatches) {
  const espnGroup = (espnMatches || []).filter(isWcGroupStageMatch);
  const ofGroup = (openFootballMatches || []).filter(isWcGroupStageMatch);

  /** @type {Map<string, Record<string, unknown>>} */
  const espnMap = new Map(espnGroup.map((m) => [groupFixtureKey(m), m]));
  /** @type {Map<string, Record<string, unknown>>} */
  const ofMap = new Map(ofGroup.map((m) => [groupFixtureKey(m), m]));

  /** @type {Array<Record<string, unknown>>} */
  const mismatches = [];
  let matched = 0;

  for (const m of ofGroup) {
    const key = groupFixtureKey(m);
    const espn = espnMap.get(key);
    if (!espn) {
      mismatches.push({
        kind: "missing_espn",
        date: m.date,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        group: m.group,
      });
      continue;
    }

    const dateDriftMs =
      Number(m.commenceTs) > 0 && Number(espn.commenceTs) > 0
        ? Math.abs(Number(m.commenceTs) - Number(espn.commenceTs))
        : null;
    if (dateDriftMs != null && dateDriftMs > 36 * 3600000) {
      mismatches.push({
        kind: "kickoff_drift",
        group: m.group,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        openFootballDate: m.date,
        espnDate: espn.date,
        driftHours: Math.round(dateDriftMs / 3600000),
      });
    }

    matched += 1;
  }

  for (const m of espnGroup) {
    const key = groupFixtureKey(m);
    if (!ofMap.has(key)) {
      mismatches.push({
        kind: "extra_espn",
        date: m.date,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        group: m.group,
        espnId: m.id,
      });
    }
  }

  const expectedGroupMatches = 72;
  const ok =
    mismatches.length === 0 &&
    espnGroup.length >= expectedGroupMatches &&
    ofGroup.length >= expectedGroupMatches;

  return {
    ok,
    espnGroupCount: espnGroup.length,
    openFootballGroupCount: ofGroup.length,
    matched,
    mismatchCount: mismatches.length,
    mismatches: mismatches.slice(0, 25),
  };
}

export async function fetchOpenFootballWc2026Schedule() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  const nowMs = Date.now();

  try {
    const res = await fetch(OPENFOOTBALL_WC2026_URL, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "UnderReview-WC/1.0" },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { ok: false, matches: [], error: `openfootball ${res.status}` };
    }

    const json = await res.json();
    const matches = normalizeOpenFootballSchedule(json, nowMs);
    if (!matches.length) {
      return { ok: false, matches: [], error: "openfootball_empty" };
    }

    return { ok: true, matches, error: null, fetchedAt: nowMs };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      matches: [],
      error: err?.message || "openfootball_fetch_failed",
    };
  }
}
