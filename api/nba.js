// api/nba.js
// Proxies NBA Stats API endpoints — no API key needed
// Fetches today's scoreboard, player season averages, recent game logs
// 5-minute cache to respect NBA Stats rate limits

import { applyCors } from "./_cors.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expires) return null;
  return entry.payload;
}

function setCached(key, payload) {
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, payload });
}

// NBA Stats requires these headers or it returns 403
const NBA_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://www.nba.com/",
  "Origin": "https://www.nba.com",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "x-nba-stats-origin": "stats",
  "x-nba-stats-token": "true",
};

async function fetchNba(url) {
  const res = await fetch(url, { headers: NBA_HEADERS });
  if (!res.ok) throw new Error(`NBA Stats ${res.status}: ${url}`);
  return res.json();
}

async function getTodaysGames() {
  const cached = getCached("scoreboard");
  if (cached) return cached;
  try {
    const data = await fetchNba(
      "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json"
    );
    const games = (data?.scoreboard?.games || []).map(g => ({
      gameId: g.gameId,
      status: g.gameStatusText,
      statusCode: g.gameStatus, // 1=scheduled, 2=live, 3=final
      period: g.period,
      gameClock: g.gameClock,
      homeTeam: {
        name: g.homeTeam?.teamName,
        tricode: g.homeTeam?.teamTricode,
        score: g.homeTeam?.score,
        wins: g.homeTeam?.wins,
        losses: g.homeTeam?.losses,
      },
      awayTeam: {
        name: g.awayTeam?.teamName,
        tricode: g.awayTeam?.teamTricode,
        score: g.awayTeam?.score,
        wins: g.awayTeam?.wins,
        losses: g.awayTeam?.losses,
      },
      arena: g.gameLeaders ? undefined : g.arena?.arenaName,
    }));
    setCached("scoreboard", games);
    return games;
  } catch (err) {
    console.error("Scoreboard fetch error:", err.message);
    return [];
  }
}

async function getPlayerStats() {
  const cached = getCached("playerstats");
  if (cached) return cached;
  try {
    const url = "https://stats.nba.com/stats/leaguedashplayerstats?" + new URLSearchParams({
      LastNGames: "0",
      LeagueID: "00",
      MeasureType: "Base",
      Month: "0",
      OpponentTeamID: "0",
      PaceAdjust: "N",
      PerMode: "PerGame",
      Period: "0",
      PlusMinus: "N",
      Rank: "N",
      Season: "2024-25",
      SeasonSegment: "",
      SeasonType: "Regular Season",
      TeamID: "0",
    });
    const data = await fetchNba(url);
    const headers = data?.resultSets?.[0]?.headers || [];
    const rows = data?.resultSets?.[0]?.rowSet || [];
    const idx = h => headers.indexOf(h);
    const stats = rows.map(r => ({
      playerId: r[idx("PLAYER_ID")],
      name: r[idx("PLAYER_NAME")],
      team: r[idx("TEAM_ABBREVIATION")],
      gp: r[idx("GP")],
      pts: r[idx("PTS")],
      reb: r[idx("REB")],
      ast: r[idx("AST")],
      stl: r[idx("STL")],
      blk: r[idx("BLK")],
      tov: r[idx("TOV")],
      fgPct: r[idx("FG_PCT")],
      fg3Pct: r[idx("FG3_PCT")],
      ftPct: r[idx("FT_PCT")],
      min: r[idx("MIN")],
      usg: r[idx("USG_PCT")] ?? null,
    }));
    // Sort by points desc, return top 100
    stats.sort((a, b) => (b.pts || 0) - (a.pts || 0));
    const top = stats.slice(0, 100);
    setCached("playerstats", top);
    return top;
  } catch (err) {
    console.error("Player stats fetch error:", err.message);
    return [];
  }
}

async function getRecentGameLogs() {
  const cached = getCached("gamelogs");
  if (cached) return cached;
  try {
    const url = "https://stats.nba.com/stats/leaguegamelog?" + new URLSearchParams({
      Counter: "0",
      DateFrom: "",
      DateTo: "",
      Direction: "DESC",
      LeagueID: "00",
      PlayerOrTeam: "P",
      Season: "2024-25",
      SeasonType: "Regular Season",
      Sorter: "DATE",
    });
    const data = await fetchNba(url);
    const headers = data?.resultSets?.[0]?.headers || [];
    const rows = data?.resultSets?.[0]?.rowSet || [];
    const idx = h => headers.indexOf(h);
    // Last 3 games per player, top scorers only
    const byPlayer = {};
    for (const r of rows) {
      const name = r[idx("PLAYER_NAME")];
      if (!byPlayer[name]) byPlayer[name] = [];
      if (byPlayer[name].length < 3) {
        byPlayer[name].push({
          date: r[idx("GAME_DATE")],
          matchup: r[idx("MATCHUP")],
          pts: r[idx("PTS")],
          reb: r[idx("REB")],
          ast: r[idx("AST")],
          min: r[idx("MIN")],
          fgm: r[idx("FGM")],
          fga: r[idx("FGA")],
        });
      }
    }
    setCached("gamelogs", byPlayer);
    return byPlayer;
  } catch (err) {
    console.error("Game logs fetch error:", err.message);
    return {};
  }
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const view = String(req.query.view || "board").toLowerCase();

  try {
    if (view === "scoreboard") {
      return res.status(200).json(await getTodaysGames());
    }
    if (view === "playerstats") {
      return res.status(200).json(await getPlayerStats());
    }
    if (view === "board") {
      const cached = getCached("board");
      if (cached) return res.status(200).json(cached);
      const [games, playerStats, gameLogs] = await Promise.all([
        getTodaysGames(),
        getPlayerStats(),
        getRecentGameLogs(),
      ]);
      const board = { games, playerStats, gameLogs };
      setCached("board", board);
      return res.status(200).json(board);
    }
    return res.status(400).json({ error: "Invalid view", allowed: ["board", "scoreboard", "playerstats"] });
  } catch (err) {
    console.error("NBA API error:", err);
    return res.status(500).json({ error: "Failed to fetch NBA data", details: err.message });
  }
}
