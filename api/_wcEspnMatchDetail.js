/**
 * ESPN FIFA World Cup — match summary fetch + WcMatchDetail normalization.
 */

import { normalizeEspnAbbr, normalizeEspnMatchStatus } from "./_wcEspn.js";

export const ESPN_WC_SUMMARY_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary";

/** @type {Record<string, keyof import("./_wcEspnMatchDetail.js").WcMatchDetailPlayer>} */
const PLAYER_STAT_MAP = {
  totalGoals: "goals",
  goalAssists: "assists",
  totalShots: "shots",
  shotsOnTarget: "shotsOnTarget",
  saves: "saves",
  chancesCreated: "keyPasses",
  yellowCards: "yellowCards",
  redCards: "redCards",
};

/** @type {Record<string, keyof import("./_wcEspnMatchDetail.js").WcMatchDetailTeamStats>} */
const TEAM_STAT_MAP = {
  totalShots: "shots",
  shotsOnTarget: "shotsOnTarget",
  saves: "saves",
  possessionPct: "possessionPct",
  totalPasses: "passes",
  accuratePasses: "passesCompleted",
  passPct: "passPct",
  foulsCommitted: "fouls",
  wonCorners: "corners",
};

/**
 * @param {Array<{ name?: string, value?: unknown, displayValue?: unknown }>} stats
 * @param {string} name
 */
function statNum(stats, name) {
  const row = (stats || []).find((s) => s?.name === name);
  if (!row) return 0;
  const raw = row.value ?? row.displayValue;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {string | undefined} clockDisplay
 */
function parseMinuteFromClock(clockDisplay) {
  const m = String(clockDisplay || "").match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} phase
 */
function deriveMinutesPlayed(row, phase) {
  const stats = row.stats || [];
  const fromStat = stats.find((s) => s?.name === "minutesPlayed" || s?.name === "minutes");
  if (fromStat) {
    const n = Number(fromStat.value ?? fromStat.displayValue);
    if (Number.isFinite(n)) return n;
  }

  const plays = Array.isArray(row.plays) ? row.plays : [];
  const subOut = plays.find((p) => p?.substitution && row.subbedOut);
  const subIn = plays.find((p) => p?.substitution && row.subbedIn);
  const outMin = subOut ? parseMinuteFromClock(subOut.clock?.displayValue) : null;
  const inMin = subIn ? parseMinuteFromClock(subIn.clock?.displayValue) : null;

  if (row.starter && !row.subbedOut && phase === "post") return 90;
  if (row.starter && outMin != null) return outMin;
  if (row.subbedIn && inMin != null && phase === "post") return Math.max(0, 90 - inMin);
  if (row.starter && !row.subbedOut && phase === "live") return null;
  return null;
}

/**
 * @param {Record<string, unknown>} row
 */
function lineupPlayerFromRosterRow(row) {
  const athlete = row.athlete || {};
  return {
    espnAthleteId: athlete.id != null ? String(athlete.id) : null,
    name: String(athlete.displayName || athlete.fullName || "").trim(),
    jersey: row.jersey != null ? String(row.jersey) : null,
    position: row.position?.abbreviation
      ? String(row.position.abbreviation)
      : row.position?.name
        ? String(row.position.name)
        : null,
    starter: Boolean(row.starter),
  };
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} phase
 */
function playerFromRosterRow(row, phase) {
  const base = lineupPlayerFromRosterRow(row);
  const stats = Array.isArray(row.stats) ? row.stats : [];
  /** @type {Record<string, number | null>} */
  const nums = {
    goals: 0,
    assists: 0,
    shots: 0,
    shotsOnTarget: 0,
    saves: 0,
    keyPasses: null,
    yellowCards: 0,
    redCards: 0,
  };

  for (const s of stats) {
    const key = PLAYER_STAT_MAP[String(s?.name || "")];
    if (!key) continue;
    if (key === "keyPasses") {
      const n = Number(s.value ?? s.displayValue);
      nums.keyPasses = Number.isFinite(n) ? n : null;
    } else {
      nums[key] = statNum(stats, s.name);
    }
  }

  return {
    ...base,
    goals: nums.goals,
    assists: nums.assists,
    minutesPlayed: deriveMinutesPlayed(row, phase),
    shots: nums.shots,
    shotsOnTarget: nums.shotsOnTarget,
    saves: nums.saves,
    keyPasses: nums.keyPasses,
    yellowCards: nums.yellowCards,
    redCards: nums.redCards,
    subbedIn: Boolean(row.subbedIn),
    subbedOut: Boolean(row.subbedOut),
  };
}

/**
 * @param {Array<{ name?: string, value?: unknown, displayValue?: unknown }>} statistics
 */
function teamStatsFromEspn(statistics) {
  /** @type {Record<string, number | null>} */
  const out = {
    possessionPct: null,
    shots: null,
    shotsOnTarget: null,
    saves: null,
    passes: null,
    passesCompleted: null,
    passPct: null,
    fouls: null,
    corners: null,
  };

  for (const [espnName, field] of Object.entries(TEAM_STAT_MAP)) {
    const row = (statistics || []).find((s) => s?.name === espnName);
    if (!row) continue;
    const n = Number(row.value ?? row.displayValue);
    if (Number.isFinite(n)) out[field] = n;
  }

  return out;
}

/**
 * @param {unknown} json
 * @param {Array<{ team?: { id?: string, abbreviation?: string } }>} competitors
 */
function teamAbbrFromEspnTeamId(json, competitors) {
  /** @type {Map<string, string>} */
  const byId = new Map();
  for (const c of competitors || []) {
    const id = String(c?.team?.id || "");
    const abbr = normalizeEspnAbbr(c?.team?.abbreviation);
    if (id && abbr) byId.set(id, abbr);
  }
  for (const side of json?.rosters || []) {
    const id = String(side?.team?.id || "");
    const abbr = normalizeEspnAbbr(side?.team?.abbreviation);
    if (id && abbr) byId.set(id, abbr);
  }
  return byId;
}

/**
 * @param {unknown} injuryRow
 * @param {string | null} teamAbbr
 * @param {string} sourcePath
 */
function normalizeInjuryRow(injuryRow, teamAbbr, sourcePath) {
  if (!injuryRow || typeof injuryRow !== "object") return null;
  const athlete = injuryRow.athlete || injuryRow.player || {};
  const name = String(
    athlete.displayName || athlete.fullName || injuryRow.displayName || injuryRow.name || "",
  ).trim();
  if (!name) return null;
  return {
    espnAthleteId: athlete.id != null ? String(athlete.id) : null,
    name,
    teamAbbr,
    status: injuryRow.status || injuryRow.type || injuryRow.designation
      ? String(injuryRow.status || injuryRow.type || injuryRow.designation)
      : null,
    detail: injuryRow.detail || injuryRow.description || injuryRow.comment
      ? String(injuryRow.detail || injuryRow.description || injuryRow.comment)
      : null,
    sourcePath,
  };
}

/**
 * @param {unknown} json
 * @param {Map<string, string>} teamIdToAbbr
 */
function extractStructuredInjuries(json, teamIdToAbbr) {
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  const seen = new Set();

  const push = (row, teamAbbr, path) => {
    const norm = normalizeInjuryRow(row, teamAbbr, path);
    if (!norm) return;
    const key = `${norm.name}|${norm.teamAbbr}|${norm.status}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(norm);
  };

  if (Array.isArray(json?.injuries)) {
    for (let i = 0; i < json.injuries.length; i++) {
      push(json.injuries[i], null, `injuries[${i}]`);
    }
  }

  if (json?.gameInfo?.injuries) {
    const gi = json.gameInfo.injuries;
    if (Array.isArray(gi)) {
      for (let i = 0; i < gi.length; i++) push(gi[i], null, `gameInfo.injuries[${i}]`);
    }
  }

  const comp = json?.header?.competitions?.[0];
  for (const c of comp?.competitors || []) {
    const teamAbbr =
      teamIdToAbbr.get(String(c?.team?.id || "")) ||
      normalizeEspnAbbr(c?.team?.abbreviation) ||
      null;
    const list = c?.injuries;
    if (!Array.isArray(list)) continue;
    for (let i = 0; i < list.length; i++) {
      push(list[i], teamAbbr, `header.competitions[0].competitors[].injuries[${i}]`);
    }
  }

  for (const side of json?.rosters || []) {
    const teamAbbr =
      teamIdToAbbr.get(String(side?.team?.id || "")) ||
      normalizeEspnAbbr(side?.team?.abbreviation) ||
      null;
    for (const row of side?.roster || []) {
      if (row?.injury) push(row.injury, teamAbbr, "rosters[].roster[].injury");
      if (Array.isArray(row?.injuries)) {
        for (let i = 0; i < row.injuries.length; i++) {
          push(row.injuries[i], teamAbbr, `rosters[].roster[].injuries[${i}]`);
        }
      }
    }
  }

  return out;
}

/**
 * @param {unknown} json
 * @param {Map<string, string>} teamIdToAbbr
 */
function extractGoals(json, teamIdToAbbr) {
  const events = Array.isArray(json?.keyEvents) ? json.keyEvents : [];
  /** @type {Array<Record<string, unknown>>} */
  const goals = [];

  for (const ev of events) {
    if (!ev?.scoringPlay) continue;
    const typeText = String(ev?.type?.text || "").toLowerCase();
    if (!typeText.includes("goal")) continue;

    const participants = Array.isArray(ev.participants) ? ev.participants : [];
    const scorer = String(
      participants[0]?.athlete?.displayName || participants[0]?.athlete?.fullName || "",
    ).trim();
    const assist =
      participants[1]?.athlete?.displayName || participants[1]?.athlete?.fullName
        ? String(participants[1].athlete.displayName || participants[1].athlete.fullName).trim()
        : null;

    let assistParsed = assist;
    if (!assistParsed && ev.text) {
      const m = String(ev.text).match(/assisted by\s+([^.,]+)/i);
      if (m) assistParsed = m[1].trim();
    }

    const teamId = String(ev?.team?.id || "");
    goals.push({
      minute: ev?.clock?.displayValue ? String(ev.clock.displayValue) : null,
      scorer: scorer || String(ev?.shortText || "").trim(),
      assist: assistParsed,
      teamAbbr: teamIdToAbbr.get(teamId) || null,
    });
  }

  return goals;
}

/**
 * @param {string | number} eventId
 */
export async function fetchEspnMatchSummary(eventId) {
  const id = String(eventId || "").trim();
  if (!id) return { ok: false, json: null, error: "missing_event_id" };

  const url = `${ESPN_WC_SUMMARY_URL}?event=${encodeURIComponent(id)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, json: null, error: `ESPN summary ${res.status}` };
    }
    const json = await res.json();
    return { ok: true, json, error: null };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, json: null, error: err?.message || "ESPN summary fetch failed" };
  }
}

/**
 * @param {unknown} json
 * @param {{ eventId?: string, homeTeam?: string, awayTeam?: string, date?: string, commenceTs?: number }} [meta]
 */
export function normalizeEspnMatchSummary(json, meta = {}) {
  const comp = json?.header?.competitions?.[0] || {};
  const competitors = Array.isArray(comp?.competitors) ? comp.competitors : [];
  const homeComp = competitors.find((c) => c.homeAway === "home");
  const awayComp = competitors.find((c) => c.homeAway === "away");

  const homeTeam =
    normalizeEspnAbbr(meta.homeTeam) ||
    normalizeEspnAbbr(homeComp?.team?.abbreviation) ||
    "";
  const awayTeam =
    normalizeEspnAbbr(meta.awayTeam) ||
    normalizeEspnAbbr(awayComp?.team?.abbreviation) ||
    "";

  const statusType = comp?.status?.type || json?.header?.status?.type || {};
  const status = normalizeEspnMatchStatus(statusType);
  const phase = status === "FT" ? "post" : status === "NS" ? "pre" : "live";

  const homeScoreRaw = homeComp?.score;
  const awayScoreRaw = awayComp?.score;
  // A live/HT/finished match always has a definite score — treat a null feed value as 0.
  const scored = status === "FT" || status === "live" || status === "HT";
  const homeScore = scored ? (Number.isFinite(Number(homeScoreRaw)) ? Number(homeScoreRaw) : 0) : null;
  const awayScore = scored ? (Number.isFinite(Number(awayScoreRaw)) ? Number(awayScoreRaw) : 0) : null;

  const dateRaw = String(comp.date || json?.header?.date || meta.date || "");
  const commenceTs =
    Number.isFinite(Number(meta.commenceTs)) && meta.commenceTs > 0
      ? Number(meta.commenceTs)
      : Date.parse(dateRaw) || null;

  const teamIdToAbbr = teamAbbrFromEspnTeamId(json, competitors);

  /** @type {Record<string, { formation: string | null, starters: unknown[], bench: unknown[] }>} */
  const lineups = {
    home: { formation: null, starters: [], bench: [] },
    away: { formation: null, starters: [], bench: [] },
  };
  /** @type {Record<string, unknown[]>} */
  const players = { home: [], away: [] };

  for (const side of json?.rosters || []) {
    const ha = side.homeAway === "home" ? "home" : side.homeAway === "away" ? "away" : null;
    if (!ha) continue;
    lineups[ha].formation = side.formation ? String(side.formation) : null;
    for (const row of side.roster || []) {
      const lp = lineupPlayerFromRosterRow(row);
      if (lp.starter) lineups[ha].starters.push(lp);
      else lineups[ha].bench.push(lp);
      players[ha].push(playerFromRosterRow(row, phase));
    }
  }

  const lineupConfirmed =
    lineups.home.starters.length >= 11 && lineups.away.starters.length >= 11;

  /** @type {Record<string, Record<string, number | null>>} */
  const teamStats = {
    home: teamStatsFromEspn([]),
    away: teamStatsFromEspn([]),
  };
  for (const t of json?.boxscore?.teams || []) {
    const ha = t.homeAway === "home" ? "home" : t.homeAway === "away" ? "away" : null;
    if (!ha) continue;
    teamStats[ha] = teamStatsFromEspn(t.statistics);
  }

  const injuries = extractStructuredInjuries(json, teamIdToAbbr);
  const goals = extractGoals(json, teamIdToAbbr);
  const finalized = status === "FT";

  return {
    eventId: String(meta.eventId || comp?.id || json?.header?.id || ""),
    source: "espn",
    lastUpdated: Date.now(),
    fetchedAt: Date.now(),
    homeTeam,
    awayTeam,
    homeScore: Number.isFinite(homeScore) ? homeScore : null,
    awayScore: Number.isFinite(awayScore) ? awayScore : null,
    status,
    phase,
    date: dateRaw.slice(0, 10) || String(meta.date || "").slice(0, 10),
    commenceTs,
    venue: String(json?.gameInfo?.venue?.fullName || comp?.venue?.fullName || "").trim() || null,
    lineupConfirmed,
    lineups,
    players,
    teamStats,
    goals,
    injuries,
    finalized,
  };
}
