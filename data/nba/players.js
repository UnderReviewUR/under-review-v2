// api/nba.js
// Data sources (all free, no extra keys):
//   1. NBA CDN — live scoreboard, always works
//   2. ESPN unofficial — season averages + team roster (reflects trades)
//   3. NBA Stats — recent game logs (best effort, may be blocked)
//   4. Odds API — prop lines + game totals (already paid, already working)

import { applyCors } from "./_cors.js";

const CACHE_TTL      = 5  * 60 * 1000;
const CACHE_TTL_LONG = 30 * 60 * 1000;
const cache          = new Map();

function getCached(key) {
  const e = cache.get(key);
  if (!e || Date.now() > e.expires) return null;
  return e.payload;
}
function setCached(key, payload, ttl) {
  cache.set(key, { expires: Date.now() + (ttl || CACHE_TTL), payload });
}

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

// Safe fetch — never throws, returns null on failure
async function safeFetch(url, options) {
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const res   = await fetch(url, Object.assign({ signal: ctrl.signal }, options || {}));
    clearTimeout(timer);
    if (!res.ok) { console.warn("safeFetch", res.status, url.slice(0, 80)); return null; }
    return await res.json();
  } catch (e) {
    console.warn("safeFetch failed:", url.slice(0, 60), e.message);
    return null;
  }
}

// ── 1. NBA CDN scoreboard — live scores, always works ────────────────────────
async function getTodaysGames() {
  const cached = getCached("scoreboard");
  if (cached) return cached;

  const data = await safeFetch(
    "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json"
  );
  if (!data || !data.scoreboard) return [];

  const games = (data.scoreboard.games || []).map(function(g) {
    return {
      gameId:    g.gameId,
      status:    g.gameStatusText,
      statusCode: g.gameStatus,   // 1=scheduled 2=live 3=final
      period:    g.period,
      gameClock: g.gameClock,
      homeTeam: {
        name:    g.homeTeam && g.homeTeam.teamName,
        tricode: g.homeTeam && g.homeTeam.teamTricode,
        score:   g.homeTeam && g.homeTeam.score,
        wins:    g.homeTeam && g.homeTeam.wins,
        losses:  g.homeTeam && g.homeTeam.losses,
      },
      awayTeam: {
        name:    g.awayTeam && g.awayTeam.teamName,
        tricode: g.awayTeam && g.awayTeam.teamTricode,
        score:   g.awayTeam && g.awayTeam.score,
        wins:    g.awayTeam && g.awayTeam.wins,
        losses:  g.awayTeam && g.awayTeam.losses,
      },
    };
  });

  if (games.length > 0) setCached("scoreboard", games);
  return games;
}

// ── 2. ESPN unofficial — season averages with current teams ──────────────────
// ESPN reflects trades immediately. Trae=WAS, Lillard=POR, KAT=NYK automatically.
// No API key needed. Returns top 100 scorers with correct team assignments.
async function getPlayerStatsESPN() {
  const cached = getCached("espn_stats");
  if (cached) return cached;

  // ESPN athletes endpoint — sorted by points per game
  const data = await safeFetch(
    "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/statistics/athletes" +
    "?limit=100&sort=points:desc&season=2025&seasontype=2"
  );

  if (!data || !Array.isArray(data.athletes)) return [];

  const stats = data.athletes.map(function(a) {
    const athlete = a.athlete || {};
    const cats    = (a.statistics && a.statistics.categories) || [];

    function getStat(catName, statName) {
      const cat = cats.find(function(c) { return c.name === catName; });
      if (!cat) return 0;
      const s = (cat.athletes && cat.athletes[0] && cat.athletes[0].statistics) || [];
      const i = (cat.names || []).indexOf(statName);
      return i >= 0 && s[i] != null ? parseFloat(s[i]) : 0;
    }

    // Get team from athlete object
    const team = (athlete.team && athlete.team.abbreviation) ||
                 (athlete.team && athlete.team.shortDisplayName) || "?";

    return {
      playerId: athlete.id,
      name:     athlete.displayName || athlete.fullName || "Unknown",
      team:     team,
      pts:      getStat("points",   "avgPoints"),
      reb:      getStat("rebounds", "avgRebounds"),
      ast:      getStat("assists",  "avgAssists"),
      stl:      getStat("general",  "avgSteals"),
      blk:      getStat("general",  "avgBlocks"),
      gp:       getStat("general",  "gamesPlayed") || 0,
      min:      getStat("general",  "avgMinutes"),
    };
  }).filter(function(p) { return p.pts >= 8; });

  if (stats.length > 0) setCached("espn_stats", stats, CACHE_TTL_LONG);
  return stats;
}

// ── 3. NBA Stats game logs — recent form (best effort) ───────────────────────
// stats.nba.com sometimes blocks server-side requests. We try but don't depend on it.
async function getRecentGameLogs() {
  const cached = getCached("gamelogs");
  if (cached) return cached;

  const data = await safeFetch(
    "https://stats.nba.com/stats/leaguegamelog?" + new URLSearchParams({
      Counter:      "0",
      DateFrom:     "",
      DateTo:       "",
      Direction:    "DESC",
      LeagueID:     "00",
      PlayerOrTeam: "P",
      Season:       "2024-25",
      SeasonType:   "Regular Season",
      Sorter:       "DATE",
    }),
    {
      headers: {
        "User-Agent":  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Referer":     "https://www.nba.com/",
        "Origin":      "https://www.nba.com",
        "x-nba-stats-origin": "stats",
        "x-nba-stats-token":  "true",
        "Accept":      "application/json",
      }
    }
  );

  if (!data) return {};

  const headers = (data.resultSets && data.resultSets[0] && data.resultSets[0].headers) || [];
  const rows    = (data.resultSets && data.resultSets[0] && data.resultSets[0].rowSet)    || [];
  function idx(h) { return headers.indexOf(h); }

  const byPlayer = {};
  for (var i = 0; i < rows.length; i++) {
    var r    = rows[i];
    var name = r[idx("PLAYER_NAME")];
    if (!byPlayer[name]) byPlayer[name] = [];
    if (byPlayer[name].length < 3) {
      var pts = r[idx("PTS")] || 0;
      var reb = r[idx("REB")] || 0;
      var ast = r[idx("AST")] || 0;
      byPlayer[name].push({
        date:    r[idx("GAME_DATE")],
        matchup: r[idx("MATCHUP")],
        pts: pts, reb: reb, ast: ast,
        pra: pts + reb + ast,
        min: r[idx("MIN")],
      });
    }
  }

  if (Object.keys(byPlayer).length > 0) setCached("gamelogs", byPlayer, CACHE_TTL_LONG);
  return byPlayer;
}

// ── 4. Prop lines (Odds API — already paid) ───────────────────────────────────
async function getNbaPropLines(oddsKey) {
  const cached = getCached("nba_props");
  if (cached) return cached;
  if (!oddsKey) return [];

  try {
    const events = await safeFetch(
      "https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=" + oddsKey +
      "&regions=us&markets=h2h&oddsFormat=american"
    );
    if (!Array.isArray(events) || !events.length) return [];

    const propMarkets = "player_points,player_rebounds,player_assists,player_points_rebounds_assists,player_threes";
    const propLines   = [];

    const results = await Promise.all(
      events.slice(0, 5).map(function(event) {
        return safeFetch(
          "https://api.the-odds-api.com/v4/sports/basketball_nba/events/" + event.id +
          "/odds?apiKey=" + oddsKey + "&regions=us&markets=" + propMarkets + "&oddsFormat=american"
        ).then(function(d) { return { event: event, data: d }; });
      })
    );

    for (var i = 0; i < results.length; i++) {
      var event = results[i].event;
      var data  = results[i].data;
      if (!data) continue;
      var book = (data.bookmakers || []).find(function(b) {
        return ["draftkings","fanduel","betmgm"].includes(b.key);
      }) || (data.bookmakers || [])[0];
      if (!book) continue;
      for (var m = 0; m < (book.markets || []).length; m++) {
        var market = book.markets[m];
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
            book:   book.key,
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

// ── 4b. Game totals — pace proxy (Odds API) ───────────────────────────────────
async function getGameTotals(oddsKey) {
  const cached = getCached("game_totals");
  if (cached) return cached;
  if (!oddsKey) return {};

  const data = await safeFetch(
    "https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=" + oddsKey +
    "&regions=us&markets=totals&oddsFormat=american"
  );
  if (!Array.isArray(data)) return {};

  const totals = {};
  for (var i = 0; i < data.length; i++) {
    var event = data[i];
    var book  = (event.bookmakers || []).find(function(b) {
      return ["draftkings","fanduel","betmgm"].includes(b.key);
    }) || (event.bookmakers || [])[0];
    if (!book) continue;
    var tm = (book.markets || []).find(function(m) { return m.key === "totals"; });
    if (!tm) continue;
    var over = (tm.outcomes || []).find(function(o) { return o.name === "Over"; });
    if (over && over.point) {
      totals[event.away_team + " @ " + event.home_team] = {
        total: over.point,
        pace: over.point >= 228 ? "HIGH" : over.point <= 218 ? "LOW" : "NORMAL",
      };
    }
  }

  setCached("game_totals", totals, CACHE_TTL_LONG);
  return totals;
}

// ── Format recent logs for prompt ────────────────────────────────────────────
function formatRecentLogs(gameLogs, propLines) {
  if (!gameLogs || !Object.keys(gameLogs).length) return "";

  const propSet = new Set(
    (propLines || []).map(function(p) { return p.player && p.player.toLowerCase(); }).filter(Boolean)
  );
  if (!propSet.size) return "";

  var lines = [];
  for (var name in gameLogs) {
    var n  = name.toLowerCase();
    var ln = n.split(" ").pop();
    if (!propSet.has(n) && !Array.from(propSet).some(function(p) { return p && p.includes(ln); })) continue;

    var games  = gameLogs[name];
    if (!games || !games.length) continue;
    var pras   = games.map(function(g) { return g.pra; });
    var avg    = (pras.reduce(function(a,b){return a+b;},0) / pras.length).toFixed(1);
    var trend  = pras[0] > pras[pras.length-1] ? " trending UP" :
                 pras[0] < pras[pras.length-1] ? " trending DOWN" : "";
    var detail = games.map(function(g) { return g.pts+"/"+g.reb+"/"+g.ast; }).join(", ");
    lines.push(name + " last " + games.length + "G: " + detail + " | avg PRA " + avg + trend);
  }
  return lines.length ? lines.join("\n") : "";
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

    if (view === "board") {
      const boardCached = getCached("board");
      if (boardCached) return res.status(200).json(boardCached);

      // All parallel — CDN + ESPN + NBA Stats + Odds API
      const [todaysGames, playerStats, gameLogs, propLines, gameTotals] = await Promise.all([
        getTodaysGames(),
        getPlayerStatsESPN(),
        getRecentGameLogs(),
        getNbaPropLines(ODDS_KEY),
        getGameTotals(ODDS_KEY),
      ]);

      const recentForm = formatRecentLogs(gameLogs, propLines);

      const board = {
        seasonContext:  getNbaSeasonContext(),
        todaysGames,
        lastNight:      [],
        lastNightStats: [],
        liveStats:      [],
        playerStats,       // ESPN — current teams always correct
        propLines:      propLines.slice(0, 100),
        injuries:       [],
        gameTotals,
        recentForm,        // NBA Stats game logs — empty if blocked, no crash
        fetchedAt:      new Date().toISOString(),
      };

      setCached("board", board);
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      return res.status(200).json(board);
    }

    return res.status(400).json({ error: "Invalid view", allowed: ["board", "scoreboard"] });

  } catch (err) {
    console.error("NBA API error:", err);
    // Never 500 — return what we have
    return res.status(200).json({
      seasonContext:  getNbaSeasonContext(),
      todaysGames:    [],
      playerStats:    [],
      propLines:      [],
      injuries:       [],
      gameTotals:     {},
      recentForm:     "",
      error:          err.message,
    });
  }
}
