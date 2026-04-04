// api/nba.js
// BallDontLie API — real game data, live scores, season averages, recent logs
// Odds API — actual NBA prop lines from DraftKings/FanDuel
// 5-minute cache on all endpoints

import { applyCors } from "./_cors.js";

const BDL_BASE    = "https://api.balldontlie.io/nba/v1";
const ODDS_BASE   = "https://api.the-odds-api.com/v4";
const CACHE_TTL   = 5 * 60 * 1000;
const cache       = new Map();

function getCached(key) {
  const e = cache.get(key);
  if (!e || Date.now() > e.expires) return null;
  return e.payload;
}
function setCached(key, payload) {
  cache.set(key, { expires: Date.now() + CACHE_TTL, payload });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getNbaSeasonContext() {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const day   = now.getDate();

  if (month === 10 || month === 11 || month === 12 || month === 1) {
    return { phase: "Regular Season (early)", season: 2024, playoffs: false };
  }
  if (month === 2 || (month === 3 && day < 10)) {
    return { phase: "Regular Season (mid) — All-Star break in mid-February", season: 2024, playoffs: false };
  }
  if ((month === 3 && day >= 10) || month === 4 && day < 20) {
    return { phase: "Regular Season (final stretch) — Play-In Tournament approaching", season: 2024, playoffs: false };
  }
  if (month === 4 && day >= 20) {
    return { phase: "NBA Playoffs — First Round", season: 2024, playoffs: true };
  }
  if (month === 5) {
    return { phase: "NBA Playoffs — Conference Semifinals", season: 2024, playoffs: true };
  }
  if (month === 6) {
    return { phase: "NBA Playoffs — Conference Finals or NBA Finals", season: 2024, playoffs: true };
  }
  return { phase: "NBA Offseason — No games scheduled", season: 2024, playoffs: false };
}

async function bdlFetch(path, apiKey) {
  const res = await fetch(`${BDL_BASE}${path}`, {
    headers: { "Authorization": apiKey },
  });
  if (!res.ok) throw new Error(`BDL ${res.status}: ${path}`);
  return res.json();
}

// ── Today's games with scores ─────────────────────────────────────────────────
async function getTodaysGames(apiKey) {
  const key = "games_today";
  if (getCached(key)) return getCached(key);

  // ESPN hidden API — free, no auth, always current
  try {
    const res = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
      { headers: { "Accept": "application/json" } }
    );
    if (!res.ok) throw new Error("ESPN " + res.status);
    const data = await res.json();

    const games = (data.events || []).map(e => {
      const comp    = e.competitions?.[0];
      const home    = comp?.competitors?.find(c => c.homeAway === "home");
      const away    = comp?.competitors?.find(c => c.homeAway === "away");
      const status  = e.status?.type;
      return {
        id:       e.id,
        status:   status?.shortDetail || status?.description || "Scheduled",
        period:   e.status?.period || 0,
        homeTeam: {
          name:  home?.team?.displayName || home?.team?.name || "",
          abbr:  home?.team?.abbreviation || "",
          score: parseInt(home?.score || "0"),
        },
        awayTeam: {
          name:  away?.team?.displayName || away?.team?.name || "",
          abbr:  away?.team?.abbreviation || "",
          score: parseInt(away?.score || "0"),
        },
      };
    });

    setCached(key, games);
    return games;
  } catch (err) {
    console.error("ESPN scoreboard error:", err.message);
  }

  // Fallback: BallDontLie
  try {
    const today = new Date().toISOString().split("T")[0];
    const data  = await bdlFetch(`/games?dates[]=${today}&per_page=15`, apiKey);
    const games = (data.data || []).map(g => ({
      id:       g.id,
      status:   g.status,
      period:   g.period,
      homeTeam: { name: g.home_team.full_name, abbr: g.home_team.abbreviation, score: g.home_team_score },
      awayTeam: { name: g.visitor_team.full_name, abbr: g.visitor_team.abbreviation, score: g.visitor_team_score },
    }));
    setCached(key, games);
    return games;
  } catch (err) {
    console.error("BDL fallback error:", err.message);
    return [];
  }
}

// ── Last night's box scores ───────────────────────────────────────────────────
async function getLastNightResults(apiKey) {
  const key = "last_night";
  if (getCached(key)) return getCached(key);
  try {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const data = await bdlFetch(`/games?dates[]=${yesterday}&per_page=15`, apiKey);
    const games = (data.data || []).filter(g => g.status === "Final").map(g => ({
      id:       g.id,
      homeTeam: { name: g.home_team.full_name, abbr: g.home_team.abbreviation, score: g.home_team_score },
      awayTeam: { name: g.visitor_team.full_name, abbr: g.visitor_team.abbreviation, score: g.visitor_team_score },
      winner:   g.home_team_score > g.visitor_team_score ? g.home_team.full_name : g.visitor_team.full_name,
    }));
    setCached(key, games);
    return games;
  } catch (err) {
    console.error("BDL last night error:", err.message);
    return [];
  }
}

// ── Player stats for specific games (box scores) ──────────────────────────────
async function getGameStats(gameIds, apiKey) {
  if (!gameIds.length) return [];
  const key = "gamestats_" + gameIds.join("_");
  if (getCached(key)) return getCached(key);
  try {
    const params = gameIds.map(id => `game_ids[]=${id}`).join("&");
    const data   = await bdlFetch(`/stats?${params}&per_page=100`, apiKey);
    const stats  = (data.data || []).map(s => ({
      player:  s.player.first_name + " " + s.player.last_name,
      team:    s.team.abbreviation,
      pts:     s.pts,
      reb:     s.reb,
      ast:     s.ast,
      stl:     s.stl,
      blk:     s.blk,
      min:     s.min,
      fgm:     s.fgm,
      fga:     s.fga,
      fg3m:    s.fg3m,
    }));
    stats.sort((a, b) => (b.pts || 0) - (a.pts || 0));
    setCached(key, stats);
    return stats;
  } catch (err) {
    console.error("BDL game stats error:", err.message);
    return [];
  }
}

// ── Season averages for top players ──────────────────────────────────────────
// BDL player IDs for top 25 players (stable IDs)
const TOP_PLAYER_IDS = [
  246,  // Nikola Jokic
  434,  // Shai Gilgeous-Alexander
  140,  // Luka Doncic
  237,  // Jayson Tatum
  403,  // Giannis Antetokounmpo
  473,  // Anthony Edwards
  666,  // Victor Wembanyama
  777,  // Karl-Anthony Towns
  469,  // Tyrese Haliburton
  394,  // Donovan Mitchell
  115,  // Stephen Curry
  144,  // Kevin Durant
  101,  // Devin Booker
  445,  // Jalen Brunson
  488,  // Cade Cunningham
  467,  // Paolo Banchero
  462,  // Scottie Barnes
  471,  // Franz Wagner
  464,  // Alperen Sengun
  282,  // Trae Young
  233,  // Damian Lillard
  32,   // LeBron James
  9,    // Bam Adebayo
  15,   // Jaylen Brown
  91,   // Ja Morant
];

async function getSeasonAverages(apiKey) {
  const key = "season_avgs";
  if (getCached(key)) return getCached(key);
  try {
    const { season } = getNbaSeasonContext();
    const ids = TOP_PLAYER_IDS.map(id => `player_ids[]=${id}`).join("&");
    const data = await bdlFetch(`/season_averages?season=${season}&${ids}`, apiKey);
    const avgs = (data.data || []).map(s => ({
      playerId: s.player.id,
      name:     s.player.first_name + " " + s.player.last_name,
      team:     s.team ? s.team.abbreviation : "?",
      pts:      s.pts,
      reb:      s.reb,
      ast:      s.ast,
      stl:      s.stl,
      blk:      s.blk,
      min:      s.min,
      fgPct:    s.fg_pct,
      fg3Pct:   s.fg3_pct,
      gp:       s.games_played,
    }));
    avgs.sort((a, b) => (b.pts || 0) - (a.pts || 0));
    setCached(key, avgs);
    return avgs;
  } catch (err) {
    console.error("BDL season averages error:", err.message);
    return [];
  }
}

async function getInjuries(apiKey) {
  const key = "injuries";
  if (getCached(key)) return getCached(key);
  try {
    const data = await bdlFetch(`/player_injuries?per_page=100`, apiKey);
    const injuries = (data.data || []).map(i => ({
      player:   (i.player && (i.player.first_name + " " + i.player.last_name)) || "Unknown",
      team:     (i.team && i.team.abbreviation) || "?",
      status:   i.status || "Out",
      returnDate: i.return_date || null,
      description: i.description || "",
    }));
    setCached(key, injuries);
    return injuries;
  } catch (err) {
    console.error("BDL injuries error:", err.message);
    return [];
  }
}


async function getNbaPropLines(oddsApiKey) {
  if (!oddsApiKey) return [];
  const key = "nba_props";
  if (getCached(key)) return getCached(key);
  try {
    // Get active NBA games first
    const eventsRes = await fetch(
      `${ODDS_BASE}/sports/basketball_nba/odds/?apiKey=${oddsApiKey}&regions=us&markets=h2h&oddsFormat=american`
    );
    if (!eventsRes.ok) return [];
    const events = await eventsRes.json();
    if (!Array.isArray(events) || !events.length) return [];

    // Get player props for first 3 games (rate limit friendly)
    const propMarkets = "player_points,player_rebounds,player_assists,player_points_rebounds_assists";
    const propLines = [];

    for (const event of events.slice(0, 3)) {
      try {
        const propRes = await fetch(
          `${ODDS_BASE}/sports/basketball_nba/events/${event.id}/odds?apiKey=${oddsApiKey}&regions=us&markets=${propMarkets}&oddsFormat=american`
        );
        if (!propRes.ok) continue;
        const propData = await propRes.json();
        const bookmakers = propData.bookmakers || [];
        const preferred = bookmakers.find(b => ["draftkings","fanduel","betmgm"].includes(b.key)) || bookmakers[0];
        if (!preferred) continue;

        for (const market of preferred.markets || []) {
          for (const outcome of market.outcomes || []) {
            propLines.push({
              game:     `${event.away_team} @ ${event.home_team}`,
              player:   outcome.description || outcome.name,
              prop:     market.key.replace("player_","").replace(/_/g," "),
              line:     outcome.point,
              side:     outcome.name,
              odds:     outcome.price,
              book:     preferred.key,
            });
          }
        }
      } catch { continue; }
    }

    setCached(key, propLines);
    return propLines;
  } catch (err) {
    console.error("NBA props error:", err.message);
    return [];
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const BDL_KEY  = process.env.BALLDONTLIE_API_KEY;
  const ODDS_KEY = process.env.ODDS_API_KEY;

  if (!BDL_KEY) return res.status(500).json({ error: "Missing BALLDONTLIE_API_KEY" });

  const view = String(req.query.view || "board").toLowerCase();

  try {
    if (view === "games") {
      return res.status(200).json(await getTodaysGames(BDL_KEY));
    }

    if (view === "board") {
      const boardCached = getCached("board");
      if (boardCached) return res.status(200).json(boardCached);

      const seasonCtx = getNbaSeasonContext();

      // FREE TIER: games always work
      const [todaysGames, lastNight] = await Promise.all([
        getTodaysGames(BDL_KEY),
        getLastNightResults(BDL_KEY),
      ]);

      // ALL-STAR TIER ($9.99/mo): injuries, game stats — fail gracefully
      let injuries = [];
      let liveStats = [];
      let lastNightStats = [];

      try { injuries = await getInjuries(BDL_KEY); } catch { }

      const liveIds = todaysGames
        .filter(g => g.status && !g.status.includes("ET") && g.status !== "Final" && (g.awayTeam?.score > 0 || g.homeTeam?.score > 0))
        .map(g => g.id);
      if (liveIds.length) {
        try { liveStats = await getGameStats(liveIds, BDL_KEY); } catch { }
      }

      const lastNightIds = lastNight.map(g => g.id).filter(Boolean);
      if (lastNightIds.length) {
        try { lastNightStats = await getGameStats(lastNightIds, BDL_KEY); } catch { }
      }

      // GOAT TIER ($39.99/mo): season averages — fail gracefully, curated DB handles this
      let playerStats = [];
      try { playerStats = await getSeasonAverages(BDL_KEY); } catch { }

      // ODDS API: separate key
      let propLines = [];
      try { propLines = await getNbaPropLines(ODDS_KEY); } catch { }

      const board = {
        seasonContext:  seasonCtx,
        todaysGames,
        lastNight,
        lastNightStats: lastNightStats.slice(0, 30),
        liveStats:      liveStats.slice(0, 30),
        playerStats,
        propLines:      propLines.slice(0, 60),
        injuries,
        fetchedAt:      new Date().toISOString(),
      };

      setCached("board", board);
      return res.status(200).json(board);
    }

    return res.status(400).json({ error: "Invalid view", allowed: ["board", "games"] });

  } catch (err) {
    console.error("NBA API error:", err);
    return res.status(500).json({ error: "Failed to fetch NBA data", details: err.message });
  }
}
