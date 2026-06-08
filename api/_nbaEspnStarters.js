/**
 * NBA expected/confirmed starters — ESPN summary rosters (live/post) or recent-minute projection.
 */

import { canonicalizeTeamAbbr } from "../shared/gameLineSpread.js";
import { bdlStatRowHasPlayingTime } from "../shared/nbaUrTakeSlim.js";

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

function parseMinutes(min) {
  if (min == null) return 0;
  const s = String(min).trim();
  if (!s) return 0;
  const colon = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (colon) return Number(colon[1]) + Number(colon[2]) / 60;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {string | number} espnEventId
 */
export async function fetchEspnConfirmedStartersForEvent(espnEventId) {
  const id = String(espnEventId || "").trim();
  if (!id) return null;
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const rosters = Array.isArray(data?.rosters) ? data.rosters : [];
    if (!rosters.length) return null;

    /** @type {Record<string, Array<{ name: string, position?: string }>>} */
    const byTeam = {};
    for (const teamBlock of rosters) {
      const abbr = canonTeam(teamBlock?.team?.abbreviation);
      if (!abbr) continue;
      const starters = (teamBlock?.roster || [])
        .filter((row) => row?.starter)
        .map((row) => ({
          name: String(row?.athlete?.displayName || row?.athlete?.shortName || "").trim(),
          position: String(row?.athlete?.position?.abbreviation || row?.position || "").trim(),
        }))
        .filter((r) => r.name);
      if (starters.length) byTeam[abbr] = starters;
    }
    if (!Object.keys(byTeam).length) return null;
    return {
      byTeam,
      source: "espn_confirmed",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Project starters from the most recent played game in BDL recent logs.
 * @param {Array<Record<string, unknown>>} playerStats
 * @param {string} teamAbbr
 * @param {number} [limit]
 */
export function projectStartersFromRecentMinutes(playerStats, teamAbbr, limit = 5) {
  const team = canonTeam(teamAbbr);
  if (!team) return [];

  /** @type {Array<{ name: string, minutes: number, position?: string }>} */
  const candidates = [];
  for (const row of playerStats || []) {
    if (canonTeam(row?.team) !== team) continue;
    const name = String(row?.name || "").trim();
    if (!name) continue;
    const recent = Array.isArray(row?.recentGames) ? row.recentGames : [];
    const lastPlayed = recent.find((g) => !g?.did_not_play && parseMinutes(g?.min) > 0);
    if (!lastPlayed) continue;
    candidates.push({
      name,
      minutes: parseMinutes(lastPlayed.min),
      position: String(row?.position || "").trim(),
    });
  }

  return candidates
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, limit)
    .map((r) => ({ name: r.name, position: r.position || undefined }));
}

/**
 * @param {Record<string, unknown>} game
 * @param {Array<Record<string, unknown>>} playerStats
 */
export async function resolveStartersForSlateGame(game, playerStats) {
  const awayAbbr = canonTeam(game?.awayTeam?.abbr);
  const homeAbbr = canonTeam(game?.homeTeam?.abbr);
  if (!awayAbbr || !homeAbbr) return null;

  const espnId = game?.id || game?.espnEventId || game?.espnId;
  const state = String(game?.state || "").toLowerCase();
  if (espnId && (state === "in" || state === "post")) {
    const confirmed = await fetchEspnConfirmedStartersForEvent(espnId);
    if (confirmed?.byTeam) {
      return {
        away: confirmed.byTeam[awayAbbr] || [],
        home: confirmed.byTeam[homeAbbr] || [],
        source: confirmed.source,
        confirmed: true,
        fetchedAt: confirmed.fetchedAt,
      };
    }
  }

  const away = projectStartersFromRecentMinutes(playerStats, awayAbbr);
  const home = projectStartersFromRecentMinutes(playerStats, homeAbbr);
  if (!away.length && !home.length) return null;

  return {
    away,
    home,
    source: "recent_minutes_projected",
    confirmed: false,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * @param {Array<Record<string, unknown>>} todaysGames
 * @param {Array<Record<string, unknown>>} playerStats
 */
export async function buildNbaStartersByGameForSlate(todaysGames, playerStats) {
  const games = Array.isArray(todaysGames) ? todaysGames : [];
  /** @type {Record<string, Record<string, unknown>>} */
  const startersByGame = {};

  await Promise.all(
    games.map(async (game) => {
      const awayAbbr = canonTeam(game?.awayTeam?.abbr);
      const homeAbbr = canonTeam(game?.homeTeam?.abbr);
      if (!awayAbbr || !homeAbbr) return;
      const key = `${awayAbbr} @ ${homeAbbr}`;
      const row = await resolveStartersForSlateGame(game, playerStats);
      if (row) startersByGame[key] = row;
    }),
  );

  return startersByGame;
}
