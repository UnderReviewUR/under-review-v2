// api/nba.js
// NBA Stats API (no key) + Odds API (prop lines)
// NBA Stats gives us: live scoreboard, current season averages (correct teams),
// recent game logs (last 3 games per player — streak detection)
// Odds API gives us: prop lines with real numbers, game totals (pace proxy)

import { applyCors } from "./_cors.js";

const CACHE_TTL_MS   = 5  * 60 * 1000;  // 5 min — live data
const CACHE_TTL_LONG = 30 * 60 * 1000;  // 30 min — season averages

const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expires) return null;
  return entry.payload;
}
function setCached(key, payload, ttl) {
  cache.set(key, { expires: Date.now() + (ttl || CACHE_TTL_MS), payload });
}

// NBA Stats requires these headers or returns 403
const NBA_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer":    "https://www.nba.com/",
  "Origin":     "https://www.nba.com",
  "Accept":     "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "x-nba-stats-origin": "stats",
  "x-nba-stats-token":  "true",
};

async function fetchNba(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { headers: NBA_HEADERS, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn("NBA Stats", res.status, url.slice(0, 80));
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn("NBA Stats fetch failed:", err.message);
    return null;
  }
}

async function safeOddsFetch(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Odds fetch failed:", err.message);
    return null;
  }
}

// ── Season phase ──────────────────────────────────────────────────────────────
function getNbaSeasonContext() {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const day   = now.getDate();
  if (month >= 10)                               return { phase: "Regular Season — early",          season: 2025 };
  if (month <= 1)                                return { phase: "Regular Season — early",          season: 2025 };
  if (month === 2 || (month === 3 && day < 10))  return { phase: "Regular Season — mid",            season: 2025 };
  if ((month === 3 && day >= 10) || (month === 4 && day < 20)) return { phase: "Regular Season — final stretch", season: 2025 };
  if (month === 4 && day >= 20)                  return { phase: "NBA Playoffs — First Round",      season: 2025 };
  if (month === 5)                               return { phase: "NBA Playoffs — Conference Semis", season: 2025 };
  if (month === 6)                               return { phase: "NBA Finals",                      season: 2025 };
  return { phase: "NBA Offseason", season: 2025 };
}

// ── Today's scoreboard (NBA CDN — free, no key) ───────────────────────────────
async function getTodaysGames() {
  const cached = getCached("scoreboard");
  if (cached) return cached;

  const data = await fetchNba(
    "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json"
  );

  if (!data || !data.scoreboard) return [];

  const games = (data.scoreboard.games || []).map(function(g) {
    return {
      gameId:     g.gameId,
      status:     g.gameStatusText,
      statusCode: g.gameStatus,  // 1=scheduled 2=live 3=final
      period:     g.period,
      gameClock:  g.gameClock,
      homeTeam: {
        name:     g.homeTeam && g.homeTeam.teamName,
        tricode:  g.homeTeam && g.homeTeam.teamTricode,
        score:    g.homeTeam && g.homeTeam.score,
        wins:     g.homeTeam && g.homeTeam.wins,
        losses:   g.homeTeam && g.homeTeam.losses,
      },
      awayTeam: {
        name:     g.awayTeam && g.awayTeam.teamName,
        tricode:  g.awayTeam && g.awayTeam.teamTricode,
        score:    g.awayTeam && g.awayTeam.score,
        wins:     g.awayTeam && g.awayTeam.wins,
        losses:   g.awayTeam && g.awayTeam.losses,
      },
    };
  });

  if (games.length > 0) setCached("scoreboard", games);
  return games;
}

// ── Season averages (NBA Stats — free, no key, CURRENT teams) ─────────────────
// This is the key: NBA Stats has Trae Young as WAS, Lillard as POR, KAT as NYK
// All trade-deadline moves reflected automatically
async function getPlayerStats() {
  const cached = getCached("playerstats");
  if (cached) return cached;

  const url = "https://stats.nba.com/stats/leaguedashplayerstats?" + new URLSearchParams({
    LastNGames:   "0",
    LeagueID:     "00",
    MeasureType:  "Base",
    Month:        "0",
    OpponentTeamID: "0",
    PaceAdjust:   "N",
    PerMode:      "PerGame",
    Period:       "0",
    PlusMinus:    "N",
    Rank:         "N",
    Season:       "2024-25",
    SeasonSegment: "",
    SeasonType:   "Regular Season",
    TeamID:       "0",
  });

  const data = await fetchNba(url);
  if (!data) return [];

  const headers = (data.resultSets && data.resultSets[0] && data.resultSets[0].headers) || [];
  const rows    = (data.resultSets && data.resultSets[0] && data.resultSets[0].rowSet) || [];

  function idx(h) { return headers.indexOf(h); }

  const stats = rows.map(function(r) {
    return {
      playerId: r[idx("PLAYER_ID")],
      name:     r[idx("PLAYER_NAME")],
      team:     r[idx("TEAM_ABBREVIATION")],  // always current — reflects trades
      gp:       r[idx("GP")],
      pts:      r[idx("PTS")],
      reb:      r[idx("REB")],
      ast:      r[idx("AST")],
      stl:      r[idx("STL")],
      blk:      r[idx("BLK")],
      tov:      r[idx("TOV")],
      min:      r[idx("MIN")],
      usg:      r[idx("USG_PCT")] || null,
      fgPct:    r[idx("FG_PCT")],
      fg3Pct:   r[idx("FG3_PCT")],
    };
  });

  // Sort by pts desc, keep top 100 contributors
  stats.sort(function(a, b) { return (b.pts || 0) - (a.pts || 0); });
  const top = stats.slice(0, 100);

  setCached("playerstats", top, CACHE_TTL_LONG);
  return top;
}

// ── Recent game logs (NBA Stats — free, no key) ───────────────────────────────
// Last 3 games per player — enables "Flagg scored 44, 48, 51 in his last 3"
async function getRecentGameLogs() {
  const cached = getCached("gamelogs");
  if (cached) return cached;

  const url = "https://stats.nba.com/stats/leaguegamelog?" + new URLSearchParams({
    Counter:      "0",
    DateFrom:     "",
    DateTo:       "",
    Direction:    "DESC",
    LeagueID:     "00",
    PlayerOrTeam: "P",
    Season:       "2024-25",
    SeasonType:   "Regular Season",
    Sorter:       "DATE",
  });

  const data = await fetchNba(url);
  if (!data) return {};

  const headers = (data.resultSets && data.resultSets[0] && data.resultSets[0].headers) || [];
  const rows    = (data.resultSets && data.resultSets[0] && data.resultSets[0].rowSet) || [];

  function idx(h) { return headers.indexOf(h); }

  const byPlayer = {};
  for (var i = 0; i < rows.length; i++) {
    var r    = rows[i];
    var name = r[idx("PLAYER_NAME")];
    var pts  = r[idx("PTS")] || 0;
    var reb  = r[idx("REB")] || 0;
    var ast  = r[idx("AST")] || 0;
    // Only track players averaging meaningful minutes
    if (!byPlayer[name]) byPlayer[name] = [];
    if (byPlayer[name].length < 3) {
      byPlayer[name].push({
        date:    r[idx("GAME_DATE")],
        matchup: r[idx("MATCHUP")],
        pts:     pts,
        reb:     reb,
        ast:     ast,
        pra:     pts + reb + ast,
        min:     r[idx("MIN")],
      });
    }
  }

  setCached("gamelogs", byPlayer, CACHE_TTL_LONG);
  return byPlayer;
}

// ── Prop lines (Odds API — already paid) ─────────────────────────────────────
async function getNbaPropLines(oddsKey) {
  const cached = getCached("nba_props");
  if (cached) return cached;
  if (!oddsKey) return [];

  try {
    const eventsUrl = "https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=" +
                      oddsKey + "&regions=us&markets=h2h&oddsFormat=american";
    const events = await safeOddsFetch(eventsUrl);
    if (!Array.isArray(events) || !events.length) return [];

    const propMarkets = "player_points,player_rebounds,player_assists,player_points_rebounds_assists,player_threes";
    const propLines   = [];

    const targets = events.slice(0, 5);
    const results = await Promise.all(
      targets.map(function(event) {
        return safeOddsFetch(
          "https://api.the-odds-api.com/v4/sports/basketball_nba/events/" + event.id +
          "/odds?apiKey=" + oddsKey + "&regions=us&markets=" + propMarkets + "&oddsFormat=american"
        ).then(function(data) { return { event: event, data: data }; });
      })
    );

    for (var i = 0; i < results.length; i++) {
      var event = results[i].event;
      var data  = results[i].data;
      if (!data) continue;
      var bookmakers = data.bookmakers || [];
      var preferred  = bookmakers.find(function(b) {
        return ["draftkings","fanduel","betmgm"].includes(b.key);
      }) || bookmakers[0];
      if (!preferred) continue;

      for (var m = 0; m < (preferred.markets || []).length; m++) {
        var market = preferred.markets[m];
        for (var o = 0; o < (market.outcomes || []).length; o++) {
          var outcome = market.outcomes[o];
          if (outcome.point == null) continue;
          propLines.push({
            game:   event.away_team + " @ " + event.home_team,
            player: outcome.description || outcome.name,
            prop:   market.key.replace("player_", "").replace(/_/g, " "),
            line:   outcome.point,
            side:   outcome.name,
            odds:   outcome.price,
            book:   preferred.key,
          });
        }
      }
    }

    if (propLines.length > 0) setCached("nba_props", propLines);
    return propLines;
  } catch (err) {
    console.error("NBA props error:", err.message);
    return [];
  }
}

// ── Game totals — pace proxy (Odds API) ───────────────────────────────────────
async function getGameTotals(oddsKey) {
  const cached = getCached("game_totals");
  if (cached) return cached;
  if (!oddsKey) return {};

  const url = "https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=" +
              oddsKey + "&regions=us&markets=totals&oddsFormat=american";
  const data = await safeOddsFetch(url);
  if (!Array.isArray(data)) return {};

  const totals = {};
  for (var i = 0; i < data.length; i++) {
    var event = data[i];
    var book  = (event.bookmakers || []).find(function(b) {
      return ["draftkings","fanduel","betmgm"].includes(b.key);
    }) || (event.bookmakers || [])[0];
    if (!book) continue;
    var totalMarket = (book.markets || []).find(function(m) { return m.key === "totals"; });
    if (!totalMarket) continue;
    var over = (totalMarket.outcomes || []).find(function(o) { return o.name === "Over"; });
    if (over && over.point) {
      var key = event.away_team + " @ " + event.home_team;
      totals[key] = { total: over.point, game_id: event.id };
    }
  }

  setCached("game_totals", totals, CACHE_TTL_LONG);
  return totals;
}

// ── Format recent game logs for the prompt ────────────────────────────────────
// Converts raw game log data into readable streak strings
// "Jokic last 3: 38/14/9, 42/11/12, 35/13/8 — trending up"
function formatRecentLogs(gameLogs, propLines) {
  if (!gameLogs || !Object.keys(gameLogs).length) return "";

  // Only surface logs for players with prop lines tonight
  const propPlayers = new Set(
    (propLines || []).map(function(p) {
      return p.player && p.player.toLowerCase();
    }).filter(Boolean)
  );

  var lines = [];

  for (var name in gameLogs) {
    var nameLower = name.toLowerCase();
    var lastName  = nameLower.split(" ").pop();
    var hasProps  = propPlayers.has(nameLower) ||
                    Array.from(propPlayers).some(function(p) { return p.includes(lastName); });
    if (!hasProps) continue;

    var games = gameLogs[name];
    if (!games || !games.length) continue;

    var gameStr = games.map(function(g) {
      return g.pts + "/" + g.reb + "/" + g.ast;
    }).join(", ");

    var pras   = games.map(function(g) { return g.pra; });
    var trend  = pras.length >= 2
      ? (pras[0] > pras[pras.length - 1] ? " — trending up" : pras[0] < pras[pras.length - 1] ? " — trending down" : "")
      : "";

    lines.push(name + " last " + games.length + "G: " + gameStr + trend);
  }

  return lines.length ? "RECENT FORM:\n" + lines.join("\n") : "";
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ODDS_KEY = process.env.ODDS_API_KEY;
  const view     = String(req.query.view || "board").toLowerCase();

  try {
    if (view === "scoreboard") {
      return res.status(200).json(await getTodaysGames());
    }

    if (view === "playerstats") {
      return res.status(200).json(await getPlayerStats());
    }

    if (view === "board") {
      const boardCached = getCached("board");
      if (boardCached) return res.status(200).json(boardCached);

      // All run in parallel — NBA Stats (free) + Odds API (paid, already working)
      const [todaysGames, playerStats, gameLogs, propLines, gameTotals] = await Promise.all([
        getTodaysGames(),
        getPlayerStats(),
        getRecentGameLogs(),
        getNbaPropLines(ODDS_KEY),
        getGameTotals(ODDS_KEY),
      ]);

      // Format recent logs for prompt — only players with props tonight
      const recentForm = formatRecentLogs(gameLogs, propLines);

      // Map player stats by name for fast lookup
      const statsByName = {};
      for (var i = 0; i < playerStats.length; i++) {
        statsByName[playerStats[i].name] = playerStats[i];
      }

      const board = {
        seasonContext:  getNbaSeasonContext(),
        todaysGames,
        lastNight:      [],
        lastNightStats: [],
        liveStats:      [],
        playerStats,        // current season averages with correct teams
        propLines:      propLines.slice(0, 100),
        injuries:       [],
        gameTotals,
        recentForm,         // streak data for tonight's players
        statsByName,        // fast lookup for ur-take prompt building
        fetchedAt:      new Date().toISOString(),
      };

      setCached("board", board);
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      return res.status(200).json(board);
    }

    return res.status(400).json({ error: "Invalid view", allowed: ["board", "scoreboard", "playerstats"] });

  } catch (err) {
    console.error("NBA API error:", err);
    return res.status(500).json({ error: "Failed to fetch NBA data", details: err.message });
  }
}
