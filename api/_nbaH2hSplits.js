/**
 * NBA head-to-head + ATS splits from ESPN scoreboard + pickcenter (no Odds API).
 */

import { canonicalizeTeamAbbr, buildGameSpreadKey } from "../shared/gameLineSpread.js";
import { addCalendarDaysEt, etDateStringToEspnYmd } from "./_espnEtDates.js";
import { getEtDateString } from "../shared/nbaPlayoffSlateFromActionNetwork.js";

const ESPN_ABBR_TO_CANON = {
  SA: "SAS",
  NY: "NYK",
  GS: "GSW",
  NO: "NOP",
  UT: "UTA",
  WSH: "WAS",
  PHO: "PHX",
};

function canonTeam(abbr) {
  const raw = String(abbr || "")
    .trim()
    .toUpperCase();
  return canonicalizeTeamAbbr(ESPN_ABBR_TO_CANON[raw] || raw);
}

function parseScore(v) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Record<string, unknown>} pick
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 */
function spreadOutcomesFromPickcenter(pick, homeAbbr, awayAbbr) {
  if (!pick || typeof pick !== "object") return null;
  const magnitude = Math.abs(Number(pick.spread));
  if (!Number.isFinite(magnitude)) return null;
  const homeFav = Boolean(pick.homeTeamOdds?.favorite);
  const awayFav = Boolean(pick.awayTeamOdds?.favorite);
  if (homeFav && !awayFav) {
    return { favoriteAbbr: homeAbbr, favoritePoint: -magnitude, underdogAbbr: awayAbbr };
  }
  if (awayFav && !homeFav) {
    return { favoriteAbbr: awayAbbr, favoritePoint: -magnitude, underdogAbbr: homeAbbr };
  }
  const details = String(pick.details || "");
  if (details.toUpperCase().includes(homeAbbr)) {
    const neg = details.includes("-");
    return neg
      ? { favoriteAbbr: homeAbbr, favoritePoint: -magnitude, underdogAbbr: awayAbbr }
      : { favoriteAbbr: awayAbbr, favoritePoint: -magnitude, underdogAbbr: homeAbbr };
  }
  return null;
}

/**
 * @param {object} p
 */
function whoCoveredAts(p) {
  const { favoriteAbbr, favoritePoint, underdogAbbr, homeAbbr, awayAbbr, homeScore, awayScore } = p;
  if (
    favoritePoint == null ||
    homeScore == null ||
    awayScore == null ||
    !favoriteAbbr ||
    !underdogAbbr
  ) {
    return { coveredBy: null, push: false };
  }
  const favScore = favoriteAbbr === homeAbbr ? homeScore : awayScore;
  const dogScore = underdogAbbr === homeAbbr ? homeScore : awayScore;
  const margin = favScore - dogScore;
  const line = Math.abs(favoritePoint);
  if (margin === line) return { coveredBy: null, push: true };
  return { coveredBy: margin > line ? favoriteAbbr : underdogAbbr, push: false };
}

const pickCache = new Map();
const SCOREBOARD_LOOKBACK_DAYS = 21;

/**
 * @param {string | number} eventId
 */
async function fetchPickcenterForEvent(eventId) {
  const key = String(eventId);
  if (pickCache.has(key)) return pickCache.get(key);
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${encodeURIComponent(key)}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      pickCache.set(key, null);
      return null;
    }
    const data = await res.json();
    const pick = data?.pickcenter?.[0] || data?.pickcenter || null;
    pickCache.set(key, pick);
    return pick;
  } catch {
    pickCache.set(key, null);
    return null;
  }
}

/**
 * @param {Record<string, unknown>} event
 */
function meetingFromEspnEvent(event) {
  const comp = event?.competitions?.[0];
  const home = comp?.competitors?.find((c) => c.homeAway === "home");
  const away = comp?.competitors?.find((c) => c.homeAway === "away");
  const homeAbbr = canonTeam(home?.team?.abbreviation);
  const awayAbbr = canonTeam(away?.team?.abbreviation);
  const homeScore = parseScore(home?.score);
  const awayScore = parseScore(away?.score);
  if (!homeAbbr || !awayAbbr || homeScore == null || awayScore == null) return null;
  if (homeScore === 0 && awayScore === 0) return null;
  return {
    eventId: event?.id,
    date: event?.date || null,
    homeAbbr,
    awayAbbr,
    homeScore,
    awayScore,
    state: String(event?.status?.type?.state || "").toLowerCase(),
    seasonType: event?.season?.type,
  };
}

/**
 * @param {string} startEt YYYY-MM-DD
 * @param {string} endEt YYYY-MM-DD
 */
async function fetchEspnEventsInRange(startEt, endEt) {
  const token = `${etDateStringToEspnYmd(startEt)}-${etDateStringToEspnYmd(endEt)}`;
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${encodeURIComponent(token)}`,
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
 * @param {string | number} espnEventId
 * @param {string} awayAbbr
 * @param {string} homeAbbr
 */
async function meetingsFromSeasonSeries(espnEventId, awayAbbr, homeAbbr) {
  const id = String(espnEventId || "").trim();
  if (!id) return [];
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const blocks = Array.isArray(data?.seasonseries) ? data.seasonseries : [];
    /** @type {Array<Record<string, unknown>>} */
    const meetings = [];

    for (const block of blocks) {
      const scope =
        String(block?.seriesLabel || block?.title || "")
          .toLowerCase()
          .includes("regular")
          ? "regular_season"
          : "playoffs";
      for (const ev of block?.events || []) {
        const state = String(ev?.status?.type?.state || ev?.statusType?.state || "").toLowerCase();
        if (state && state !== "post") continue;
        const comp = ev?.competitions?.[0] || ev;
        const home = comp?.competitors?.find((c) => c.homeAway === "home");
        const away = comp?.competitors?.find((c) => c.homeAway === "away");
        const homeAbbrRow = canonTeam(home?.team?.abbreviation);
        const awayAbbrRow = canonTeam(away?.team?.abbreviation);
        const pair = new Set([awayAbbr, homeAbbr]);
        if (!pair.has(homeAbbrRow) || !pair.has(awayAbbrRow)) continue;
        const homeScore = parseScore(home?.score);
        const awayScore = parseScore(away?.score);
        if (homeScore == null || awayScore == null) continue;
        if (homeScore === 0 && awayScore === 0) continue;
        const pick = await fetchPickcenterForEvent(ev?.id);
        const spread = spreadOutcomesFromPickcenter(pick, homeAbbrRow, awayAbbrRow);
        const cover = spread
          ? whoCoveredAts({
              ...spread,
              homeAbbr: homeAbbrRow,
              awayAbbr: awayAbbrRow,
              homeScore,
              awayScore,
            })
          : { coveredBy: null, push: false };
        meetings.push({
          eventId: ev?.id || null,
          date: ev?.date || null,
          awayAbbr: awayAbbrRow,
          homeAbbr: homeAbbrRow,
          awayScore,
          homeScore,
          closingSpread: spread
            ? `${spread.favoriteAbbr} ${spread.favoritePoint}`
            : pick?.details || null,
          total: pick?.overUnder != null ? Number(pick.overUnder) : null,
          coveredBy: cover.coveredBy,
          push: cover.push,
          scope,
        });
      }
    }
    return meetings;
  } catch {
    return [];
  }
}

/**
 * @param {string} awayAbbr
 * @param {string} homeAbbr
 * @param {Array<Record<string, unknown>>} events
 * @param {string | number | null | undefined} [espnEventId]
 */
async function meetingsForMatchup(awayAbbr, homeAbbr, events, espnEventId = null) {
  const aa = canonTeam(awayAbbr);
  const ha = canonTeam(homeAbbr);
  const pair = new Set([aa, ha]);
  const raw = (events || [])
    .map(meetingFromEspnEvent)
    .filter((m) => m && m.state === "post" && pair.has(m.homeAbbr) && pair.has(m.awayAbbr));

  const meetings = [];
  for (const m of raw) {
    const pick = await fetchPickcenterForEvent(m.eventId);
    const spread = spreadOutcomesFromPickcenter(pick, m.homeAbbr, m.awayAbbr);
    const cover = spread
      ? whoCoveredAts({
          ...spread,
          homeAbbr: m.homeAbbr,
          awayAbbr: m.awayAbbr,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
        })
      : { coveredBy: null, push: false };

    meetings.push({
      eventId: m.eventId,
      date: m.date,
      awayAbbr: m.awayAbbr,
      homeAbbr: m.homeAbbr,
      awayScore: m.awayScore,
      homeScore: m.homeScore,
      closingSpread: spread
        ? `${spread.favoriteAbbr} ${spread.favoritePoint}`
        : pick?.details || null,
      total: pick?.overUnder != null ? Number(pick.overUnder) : null,
      coveredBy: cover.coveredBy,
      push: cover.push,
      scope: m.seasonType === 2 || m.seasonType === "2" ? "regular_season" : "playoffs",
    });
  }

  const fromSeries = await meetingsFromSeasonSeries(espnEventId, aa, ha);
  const merged = [...meetings];
  const seen = new Set(
    meetings.map((m) => String(m.eventId || `${m.date}|${m.awayAbbr}|${m.homeAbbr}|${m.awayScore}|${m.homeScore}`)),
  );
  for (const row of fromSeries) {
    const key = String(row.eventId || `${row.date}|${row.awayAbbr}|${row.homeAbbr}|${row.awayScore}|${row.homeScore}`);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }

  return merged.sort((a, b) => Date.parse(a.date || 0) - Date.parse(b.date || 0));
}

function aggregateAts(meetings, teamA, teamB) {
  const stats = {
    [teamA]: { covers: 0, losses: 0, pushes: 0 },
    [teamB]: { covers: 0, losses: 0, pushes: 0 },
  };
  let ml = { [teamA]: 0, [teamB]: 0 };
  let ou = { overs: 0, unders: 0, pushes: 0 };

  for (const m of meetings) {
    const winner =
      m.homeScore > m.awayScore ? m.homeAbbr : m.awayScore > m.homeScore ? m.awayAbbr : null;
    if (winner && ml[winner] != null) ml[winner] += 1;

    if (m.push) {
      if (stats[teamA]) stats[teamA].pushes += 1;
      if (stats[teamB]) stats[teamB].pushes += 1;
    } else if (m.coveredBy && stats[m.coveredBy]) {
      stats[m.coveredBy].covers += 1;
      const loser = m.coveredBy === teamA ? teamB : teamA;
      if (stats[loser]) stats[loser].losses += 1;
    }

    if (m.total != null && Number.isFinite(m.total)) {
      const combined = m.awayScore + m.homeScore;
      if (combined === m.total) ou.pushes += 1;
      else if (combined > m.total) ou.overs += 1;
      else ou.unders += 1;
    }
  }

  return { ats: stats, ml, ou };
}

/**
 * @param {Array<Record<string, unknown>>} todaysGames
 * @param {Array<Record<string, unknown>>} [playoffSeries]
 */
export async function buildNbaH2hSplitsForSlate(todaysGames, playoffSeries = []) {
  const games = Array.isArray(todaysGames) ? todaysGames : [];
  const seen = new Set();
  /** @type {Array<Record<string, unknown>>} */
  const splits = [];

  const endEt = getEtDateString();
  const startEt = addCalendarDaysEt(endEt, -SCOREBOARD_LOOKBACK_DAYS);
  const events = await fetchEspnEventsInRange(startEt, endEt);

  for (const game of games) {
    const awayAbbr = canonTeam(game?.awayTeam?.abbr);
    const homeAbbr = canonTeam(game?.homeTeam?.abbr);
    if (!awayAbbr || !homeAbbr) continue;
    const matchupKey = buildGameSpreadKey(awayAbbr, homeAbbr);
    if (!matchupKey || seen.has(matchupKey)) continue;
    seen.add(matchupKey);

    const allMeetings = await meetingsForMatchup(
      awayAbbr,
      homeAbbr,
      events,
      game?.id || game?.espnEventId || game?.espnId,
    );
    const playoffs = allMeetings.filter((m) => m.scope === "playoffs");
    const regular = allMeetings.filter((m) => m.scope === "regular_season");
    const seasonMeetings = [...regular, ...playoffs];
    const agg = aggregateAts(seasonMeetings, awayAbbr, homeAbbr);
    const playoffsAgg = aggregateAts(playoffs, awayAbbr, homeAbbr);

    splits.push({
      matchupKey,
      awayAbbr,
      homeAbbr,
      scope: "season_and_playoffs",
      gamesPlayed: seasonMeetings.length,
      ats: agg.ats,
      ml: agg.ml,
      ou: agg.ou,
      playoffsAts: playoffsAgg.ats,
      playoffsGamesPlayed: playoffs.length,
      meetings: seasonMeetings.slice(-8),
      source: "espn_pickcenter",
      summary: `${awayAbbr} ATS ${agg.ats[awayAbbr]?.covers || 0}-${agg.ats[awayAbbr]?.losses || 0} vs ${homeAbbr} (${seasonMeetings.length} meetings with lines)`,
    });
  }

  if (!splits.length && Array.isArray(playoffSeries)) {
    for (const row of playoffSeries) {
      const awayAbbr = canonTeam(row?.away);
      const homeAbbr = canonTeam(row?.home);
      if (!awayAbbr || !homeAbbr) continue;
      const matchupKey = buildGameSpreadKey(awayAbbr, homeAbbr);
      if (seen.has(matchupKey)) continue;
      seen.add(matchupKey);
      const meetings = await meetingsForMatchup(awayAbbr, homeAbbr, events, null);
      const agg = aggregateAts(meetings, awayAbbr, homeAbbr);
      splits.push({
        matchupKey,
        awayAbbr,
        homeAbbr,
        scope: "playoffs",
        gamesPlayed: meetings.length,
        ats: agg.ats,
        ml: agg.ml,
        ou: agg.ou,
        meetings: meetings.slice(-6),
        source: "espn_pickcenter",
        summary: `${awayAbbr} ATS ${agg.ats[awayAbbr]?.covers || 0}-${agg.ats[awayAbbr]?.losses || 0} vs ${homeAbbr}`,
      });
    }
  }

  return splits;
}

/**
 * @param {Array<Record<string, unknown>>} h2hSplits
 */
export function buildNbaRecentFormFromH2h(h2hSplits) {
  const row = (h2hSplits || [])[0];
  if (!row?.summary) return "";
  const last = Array.isArray(row.meetings) ? row.meetings[row.meetings.length - 1] : null;
  if (!last) return row.summary;
  return `${row.summary}. Last meeting: ${last.awayAbbr} ${last.awayScore} @ ${last.homeAbbr} ${last.homeScore}${last.closingSpread ? ` (closed ${last.closingSpread})` : ""}.`;
}
