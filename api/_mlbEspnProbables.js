/**
 * ESPN MLB scoreboard — probable pitchers + season ERA / K/9 for model context (no Odds API).
 * https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard
 */
import { etDateStringToEspnYmd } from "./_espnEtDates.js";
import { firstNonEmpty } from "../shared/textUtils.js";

const ESPN_PROBABLE_CACHE_MS = 120000;
const cacheByYmd = new Map();

/** Normalize ESPN-style abbreviations for matchup keys. */
export function normalizeMlbAbbr(abbr) {
  const a = String(abbr || "")
    .trim()
    .toUpperCase();
  if (!a) return "";
  const aliases = {
    WSX: "CHW",
    AZ: "ARI",
    SFN: "SF",
  };
  return aliases[a] || a;
}

export function extractPitchingEraK9FromEspnStatistics(statsArr) {
  let era = null;
  let k9 = null;
  if (!Array.isArray(statsArr)) return { era, k9 };
  for (const s of statsArr) {
    const disp =
      s.displayValue != null && String(s.displayValue).trim() !== ""
        ? String(s.displayValue).trim()
        : s.value != null && String(s.value).trim() !== ""
          ? String(s.value).trim()
          : "";
    if (!disp) continue;
    const name = String(s.name || "").toUpperCase();
    const abbr = String(s.abbreviation || "").toUpperCase();
    const dispName = String(s.displayName || "").toUpperCase();
    if (abbr === "ERA" || name === "ERA" || dispName.includes("RUN AVERAGE")) era = disp;
    if (
      abbr.includes("K/9") ||
      name.includes("K/9") ||
      /K\s*\/\s*9|STRIKEOUTS\s+PER\s+NINE|SO\/9/i.test(dispName + name)
    ) {
      k9 = disp;
    }
  }
  return { era, k9 };
}

function pitcherThrowsAbbrev(athlete) {
  if (!athlete || typeof athlete !== "object") return null;
  const t =
    athlete.throwsHand?.abbreviation ||
    athlete.throwHand?.abbreviation ||
    athlete.hand?.abbreviation ||
    athlete.batSide?.abbreviation ||
    null;
  return t ? String(t).trim().toUpperCase() : null;
}

export function buildProbablePitcherDetailFromAthlete(athlete, statistics = []) {
  if (!athlete || typeof athlete !== "object") return null;
  const name = firstNonEmpty(
    athlete.shortName,
    athlete.displayName,
    athlete.fullName,
    athlete.name,
  );
  if (!name) return null;
  const statsSource = Array.isArray(statistics) && statistics.length ? statistics : athlete.statistics || [];
  const { era, k9 } = extractPitchingEraK9FromEspnStatistics(statsSource);
  return {
    name,
    era,
    k9,
    handedness: pitcherThrowsAbbrev(athlete),
  };
}

function detailFromProbableRow(row) {
  if (!row || typeof row !== "object") return null;
  const athlete = row.athlete || row;
  const stats = row.statistics || athlete.statistics || [];
  return buildProbablePitcherDetailFromAthlete(athlete, stats);
}

function detailFromProbablePitcherWrapper(pp) {
  if (!pp || typeof pp !== "object") return null;
  const athlete = pp.athlete || pp;
  const stats = pp.statistics || athlete.statistics || [];
  return buildProbablePitcherDetailFromAthlete(athlete, stats);
}

/**
 * @returns {{ home: object|null, away: object|null }}
 */
export function extractProbableStartersFromEspnCompetition(comp) {
  const out = { home: null, away: null };

  /** Site scoreboard (2024+): probables[] lives on each competitor, not on the competition. */
  for (const c of comp?.competitors || []) {
    const side = c.homeAway === "home" ? "home" : c.homeAway === "away" ? "away" : null;
    if (!side) continue;
    const rows = c.probables;
    if (Array.isArray(rows) && rows.length > 0) {
      const d = detailFromProbableRow(rows[0]);
      if (d) out[side] = d;
    }
  }

  const probables = comp?.probables;
  if (Array.isArray(probables) && probables.length > 0) {
    for (const row of probables) {
      const side = row.homeAway === "home" ? "home" : row.homeAway === "away" ? "away" : null;
      if (!side || out[side]) continue;
      const d = detailFromProbableRow(row);
      if (d) out[side] = d;
    }
  }

  for (const c of comp?.competitors || []) {
    const side = c.homeAway === "home" ? "home" : c.homeAway === "away" ? "away" : null;
    if (!side || out[side]) continue;
    const d = detailFromProbablePitcherWrapper(c.probablePitcher);
    if (d) out[side] = d;
  }
  return out;
}

export function matchupKeyAwayHome(awayAbbr, homeAbbr) {
  const a = normalizeMlbAbbr(awayAbbr);
  const h = normalizeMlbAbbr(homeAbbr);
  if (!a || !h) return "";
  return `${a}|${h}`;
}

/**
 * @param {Record<string, string>} teamFullNameToAbbr — e.g. api/mlb.js TEAM_PARK
 */
export async function fetchEspnProbableStartersLookupForEtDay(etDateStr, teamFullNameToAbbr = {}) {
  const ymd = etDateStringToEspnYmd(etDateStr);
  const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${encodeURIComponent(ymd)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return new Map();
  const data = await res.json();
  const map = new Map();
  for (const e of data.events || []) {
    const comp = e.competitions?.[0];
    if (!comp) continue;
    const home = comp.competitors?.find((c) => c.homeAway === "home");
    const away = comp.competitors?.find((c) => c.homeAway === "away");
    const homeFull = home?.team?.displayName || home?.team?.name || "";
    const awayFull = away?.team?.displayName || away?.team?.name || "";
    let awayAbbr = normalizeMlbAbbr(away?.team?.abbreviation);
    let homeAbbr = normalizeMlbAbbr(home?.team?.abbreviation);
    if (!awayAbbr && awayFull) awayAbbr = normalizeMlbAbbr(teamFullNameToAbbr[awayFull]);
    if (!homeAbbr && homeFull) homeAbbr = normalizeMlbAbbr(teamFullNameToAbbr[homeFull]);
    const key = matchupKeyAwayHome(awayAbbr, homeAbbr);
    if (!key) continue;
    const starters = extractProbableStartersFromEspnCompetition(comp);
    if (starters.home || starters.away) map.set(key, starters);
  }
  return map;
}

export async function getEspnProbableStartersLookupCached(etDateStr, teamFullNameToAbbr) {
  const ymd = etDateStringToEspnYmd(etDateStr);
  const now = Date.now();
  const hit = cacheByYmd.get(ymd);
  if (hit && now - hit.ts < ESPN_PROBABLE_CACHE_MS && hit.map) return hit.map;
  const map = await fetchEspnProbableStartersLookupForEtDay(etDateStr, teamFullNameToAbbr);
  cacheByYmd.set(ymd, { ts: now, map });
  return map;
}

/**
 * @param {Array<object>} games
 * @param {Record<string, string>} teamFullNameToAbbr — TEAM_PARK from mlb.js
 */
export async function mergeEspnProbableStartersIntoGames(games, etDateStr, teamFullNameToAbbr) {
  if (!Array.isArray(games) || games.length === 0) return games;
  try {
    const lookup = await getEspnProbableStartersLookupCached(etDateStr, teamFullNameToAbbr);
    if (!lookup || lookup.size === 0) return games;
    return games.map((g) => {
      const awayName = g?.awayTeam?.name || "";
      const homeName = g?.homeTeam?.name || "";
      const awayAbbr =
        normalizeMlbAbbr(teamFullNameToAbbr[awayName]) || normalizeMlbAbbr(g?.awayTeam?.abbr);
      const homeAbbr =
        normalizeMlbAbbr(teamFullNameToAbbr[homeName]) || normalizeMlbAbbr(g?.homeTeam?.abbr);
      const key = matchupKeyAwayHome(awayAbbr, homeAbbr);
      const ps = key ? lookup.get(key) : null;
      if (!ps) return g;
      return {
        ...g,
        probableStarters: ps,
        espnProbablesMerged: true,
      };
    });
  } catch (err) {
    console.warn("[mlb] ESPN probable starters merge:", err?.message || err);
    return games;
  }
}
