/**
 * NBA live board refresh — force server rebuild during in-progress Finals / playoff games.
 */

const NBA_QUERY_TEAM_ALIASES = {
  knicks: "NYK",
  spurs: "SAS",
  celtics: "BOS",
  lakers: "LAL",
  nuggets: "DEN",
  thunder: "OKC",
};

function extractNbaTeamAbbrevsFromQuestionLocal(question) {
  const q = String(question || "");
  const out = new Set();
  const re =
    /\b(ATL|BOS|BKN|CHA|CHI|CLE|DAL|DEN|DET|GSW|HOU|IND|LAC|LAL|MEM|MIA|MIL|MIN|NOP|NYK|OKC|ORL|PHI|PHX|POR|SAC|SAS|TOR|UTA|WAS)\b/gi;
  let m;
  while ((m = re.exec(q)) !== null) out.add(m[1].toUpperCase());
  const ql = q.toLowerCase();
  for (const [nick, abbr] of Object.entries(NBA_QUERY_TEAM_ALIASES)) {
    if (ql.includes(nick)) out.add(abbr);
  }
  return [...out];
}

/** Home `/api/nba?view=board` cache when any slate game is live or at halftime. */
export const NBA_BOARD_CACHE_TTL_LIVE_MS = 45 * 1000;

const LIVE_QUESTION_RE =
  /\b(live|in[- ]game|right now|q[1-4]\b|quarter|halftime|second half|score (just )?updated|we're in)\b/i;

/**
 * @param {object | null | undefined} game
 */
export function nbaGameIsLiveOrHalftimeForRefresh(game) {
  if (!game || typeof game !== "object") return false;
  const state = String(game.state || "").toLowerCase();
  if (state === "in") return true;
  const status = String(game.status || "");
  if (/\bhalftime\b/i.test(status) || /\bhalf\s*time\b/i.test(status)) return true;
  const hs = game.homeTeam?.score;
  const vs = game.awayTeam?.score;
  const period = Number(game.period);
  if (
    Number.isFinite(period) &&
    period >= 1 &&
    Number.isFinite(Number(hs)) &&
    Number.isFinite(Number(vs))
  ) {
    return true;
  }
  return false;
}

/**
 * @param {Array<object>} games
 */
export function nbaSlateHasLiveOrHalftimeGame(games) {
  return (Array.isArray(games) ? games : []).some(nbaGameIsLiveOrHalftimeForRefresh);
}

/**
 * @param {Array<object>} games
 * @param {number} [defaultTtlMs]
 */
export function nbaBoardCacheTtlMs(games, defaultTtlMs = 5 * 60 * 1000) {
  return nbaSlateHasLiveOrHalftimeGame(games) ? NBA_BOARD_CACHE_TTL_LIVE_MS : defaultTtlMs;
}

/**
 * @param {object | null | undefined} nbaContext
 * @param {{ awayAbbr?: string, homeAbbr?: string } | null} matchup
 */
export function findFocusedNbaGameOnSlate(nbaContext, matchup) {
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  if (!games.length) return null;
  if (matchup?.awayAbbr && matchup?.homeAbbr) {
    const aa = String(matchup.awayAbbr).toUpperCase();
    const ha = String(matchup.homeAbbr).toUpperCase();
    const hit = games.find((g) => {
      const away = String(g?.awayTeam?.abbr || "").toUpperCase();
      const home = String(g?.homeTeam?.abbr || "").toUpperCase();
      return (away === aa && home === ha) || (away === ha && home === aa);
    });
    if (hit) return hit;
  }
  if (games.length === 1) return games[0];
  return null;
}

/**
 * @param {object | null | undefined} nbaContext
 * @param {string} question
 */
export function resolveNbaMatchupProbeFromContext(nbaContext, question) {
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  const abbrs = extractNbaTeamAbbrevsFromQuestionLocal(question);
  if (abbrs.length >= 2) {
    const row = (nbaContext?.playoffSeries || []).find((s) => {
      const home = String(s?.home || "").toUpperCase();
      const away = String(s?.away || "").toUpperCase();
      return abbrs.includes(home) && abbrs.includes(away);
    });
    if (row) {
      return {
        awayAbbr: String(row.away || "").toUpperCase(),
        homeAbbr: String(row.home || "").toUpperCase(),
      };
    }
    const exact = games.find((g) => {
      const away = String(g?.awayTeam?.abbr || "").toUpperCase();
      const home = String(g?.homeTeam?.abbr || "").toUpperCase();
      return abbrs.includes(away) && abbrs.includes(home);
    });
    if (exact) {
      return {
        awayAbbr: String(exact.awayTeam?.abbr || "").toUpperCase(),
        homeAbbr: String(exact.homeTeam?.abbr || "").toUpperCase(),
      };
    }
  }
  if (abbrs.length === 1 && games.length) {
    const t = abbrs[0];
    const hit = games.find((g) => {
      const away = String(g?.awayTeam?.abbr || "").toUpperCase();
      const home = String(g?.homeTeam?.abbr || "").toUpperCase();
      return away === t || home === t;
    });
    if (hit) {
      return {
        awayAbbr: String(hit.awayTeam?.abbr || "").toUpperCase(),
        homeAbbr: String(hit.homeTeam?.abbr || "").toUpperCase(),
      };
    }
  }
  if (games.length === 1) {
    return {
      awayAbbr: String(games[0].awayTeam?.abbr || "").toUpperCase(),
      homeAbbr: String(games[0].homeTeam?.abbr || "").toUpperCase(),
    };
  }
  return null;
}

/**
 * True when UR Take must rebuild the NBA board on the server (ignore stale client bundle).
 * @param {object | null | undefined} nbaContext
 * @param {string} question
 */
export function nbaRequiresLiveUrTakeBoardRefresh(nbaContext, question) {
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  if (!games.length) return false;

  const matchup = resolveNbaMatchupProbeFromContext(nbaContext, question);
  const focused = findFocusedNbaGameOnSlate(nbaContext, matchup);
  if (focused && nbaGameIsLiveOrHalftimeForRefresh(focused)) return true;

  const liveGames = games.filter(nbaGameIsLiveOrHalftimeForRefresh);
  if (!liveGames.length) return false;

  if (LIVE_QUESTION_RE.test(String(question || ""))) return true;
  if (games.length === 1) return true;
  if (matchup?.awayAbbr && matchup?.homeAbbr) {
    return liveGames.some((g) => {
      const away = String(g?.awayTeam?.abbr || "").toUpperCase();
      const home = String(g?.homeTeam?.abbr || "").toUpperCase();
      const aa = String(matchup.awayAbbr).toUpperCase();
      const ha = String(matchup.homeAbbr).toUpperCase();
      return (away === aa && home === ha) || (away === ha && home === aa);
    });
  }

  return false;
}
