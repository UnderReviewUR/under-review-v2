import { applyCors } from "./_cors.js";

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map();

function getCached(key) {
  const e = cache.get(key);
  if (!e || Date.now() > e.expires) return null;
  return e.payload;
}
function setCached(key, payload) {
  cache.set(key, { expires: Date.now() + CACHE_TTL, payload });
}

function getNbaSeasonContext() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  if (month >= 10 || month === 1) return { phase: "Regular Season (early)", season: 2024 };
  if (month === 2 || (month === 3 && day < 10)) return { phase: "Regular Season (mid)", season: 2024 };
  if ((month === 3 && day >= 10) || (month === 4 && day < 20)) return { phase: "Regular Season — final stretch", season: 2024 };
  if (month === 4 && day >= 20) return { phase: "NBA Playoffs — First Round", season: 2024 };
  if (month === 5) return { phase: "NBA Playoffs — Conference Semifinals", season: 2024 };
  if (month === 6) return { phase: "NBA Finals", season: 2024 };
  return { phase: "NBA Offseason", season: 2024 };
}

function getTodayEtDateString() {
  const etNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  return etNow.toISOString().split("T")[0];
}
function getTomorrowEtDateString() {
  const etNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  etNow.setDate(etNow.getDate() + 1);
  return etNow.toISOString().split("T")[0];
}
function toEtDateString(isoString) {
  const local = new Date(new Date(isoString).toLocaleString("en-US", { timeZone: "America/New_York" }));
  return local.toISOString().split("T")[0];
}

function normalizeTeamAbbr(name) {
  const map = {
    "Atlanta Hawks":"ATL","Boston Celtics":"BOS","Brooklyn Nets":"BKN","Charlotte Hornets":"CHA",
    "Chicago Bulls":"CHI","Cleveland Cavaliers":"CLE","Dallas Mavericks":"DAL","Denver Nuggets":"DEN",
    "Detroit Pistons":"DET","Golden State Warriors":"GSW","Houston Rockets":"HOU","Indiana Pacers":"IND",
    "LA Clippers":"LAC","Los Angeles Clippers":"LAC","Los Angeles Lakers":"LAL","Memphis Grizzlies":"MEM",
    "Miami Heat":"MIA","Milwaukee Bucks":"MIL","Minnesota Timberwolves":"MIN","New Orleans Pelicans":"NOP",
    "New York Knicks":"NYK","Oklahoma City Thunder":"OKC","Orlando Magic":"ORL","Philadelphia 76ers":"PHI",
    "Phoenix Suns":"PHX","Portland Trail Blazers":"POR","Sacramento Kings":"SAC","San Antonio Spurs":"SAS",
    "Toronto Raptors":"TOR","Utah Jazz":"UTA","Washington Wizards":"WAS",
  };
  if (!name) return "UNK";
  return map[name] || name.split(" ").pop().slice(0, 3).toUpperCase();
}

async function getTodaysGames(oddsKey) {
  const cacheKey = "games_today";
  const cached = getCached(cacheKey);
  if (cached) return cached;
  if (!oddsKey) return [];

  try {
    const url = `https://api.the-odds-api.com/v4/sports/basketball_nba/scores/?apiKey=${oddsKey}&daysFrom=2`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const todayET = getTodayEtDateString();
    const games = data
      .filter(g => toEtDateString(g.commence_time) === todayET || (!g.completed && Array.isArray(g.scores) && g.scores.length > 0))
      .map(g => {
        const scores  = g.scores || [];
        const homePts = scores.find(s => s.name === g.home_team)?.score;
        const awayPts = scores.find(s => s.name === g.away_team)?.score;
        const isLive  = !g.completed && scores.length > 0;
        const isFinal = g.completed;
        const gameTime = new Date(g.commence_time).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", timeZone:"America/New_York" }) + " ET";
        return {
          id: g.id,
          status: isFinal ? "Final" : isLive ? "Live" : gameTime,
          state: isFinal ? "post" : isLive ? "in" : "pre",
          statusCode: isFinal ? 3 : isLive ? 2 : 1,
          homeTeam: { name:g.home_team, abbr:normalizeTeamAbbr(g.home_team), score:homePts != null ? parseInt(homePts,10) : null },
          awayTeam: { name:g.away_team, abbr:normalizeTeamAbbr(g.away_team), score:awayPts != null ? parseInt(awayPts,10) : null },
        };
      });

    if (games.length === 0) {
      // fallback to odds endpoint
      try {
        const oddsRes = await fetch(`https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${oddsKey}&regions=us&markets=h2h&oddsFormat=american`);
        if (oddsRes.ok) {
          const oddsData = await oddsRes.json();
          if (Array.isArray(oddsData)) {
            const oddsGames = oddsData
              .filter(g => toEtDateString(g.commence_time) === todayET)
              .map(g => ({
                id: g.id,
                status: new Date(g.commence_time).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/New_York"}) + " ET",
                state: "pre", statusCode: 1,
                homeTeam:{name:g.home_team,abbr:normalizeTeamAbbr(g.home_team),score:null},
                awayTeam:{name:g.away_team,abbr:normalizeTeamAbbr(g.away_team),score:null},
              }));
            if (oddsGames.length > 0) { setCached(cacheKey, oddsGames); return oddsGames; }
          }
        }
      } catch {}
    }

    if (games.length > 0) setCached(cacheKey, games);
    return games;
  } catch (err) {
    console.error("getTodaysGames error:", err.message);
    return [];
  }
}

async function getNbaPropLines(oddsKey) {
  if (!oddsKey) return [];
  const cacheKey = "nba_props";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const eventsRes = await fetch(`https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${oddsKey}&regions=us&markets=h2h&oddsFormat=american`);
    if (!eventsRes.ok) return [];
    const events = await eventsRes.json();
    if (!Array.isArray(events) || !events.length) return [];

    const propMarkets = "player_points,player_rebounds,player_assists,player_points_rebounds_assists";
    const propLines = [];
    const todayET = getTodayEtDateString();
    const tomorrowET = getTomorrowEtDateString();

    for (const event of events.filter(e => { const d = toEtDateString(e.commence_time); return d === todayET || d === tomorrowET; }).slice(0, 6)) {
      try {
        const propRes = await fetch(`https://api.the-odds-api.com/v4/sports/basketball_nba/events/${event.id}/odds?apiKey=${oddsKey}&regions=us&markets=${propMarkets}&oddsFormat=american`);
        if (!propRes.ok) continue;
        const propData = await propRes.json();
        const bookmakers = propData.bookmakers || [];
        const preferred = bookmakers.find(b => ["draftkings","fanduel","betmgm"].includes(b.key)) || bookmakers[0];
        if (!preferred) continue;
        for (const market of preferred.markets || []) {
          for (const outcome of market.outcomes || []) {
            propLines.push({ game:`${event.away_team} @ ${event.home_team}`, player:outcome.description||outcome.name, prop:market.key.replace("player_","").replace(/_/g," "), line:outcome.point, side:outcome.name, odds:outcome.price, book:preferred.key, eventId:event.id });
          }
        }
      } catch { continue; }
    }

    setCached(cacheKey, propLines);
    return propLines;
  } catch (err) {
    console.error("NBA props error:", err.message);
    return [];
  }
}

async function getCurrentPlayerStats(bdlKey) {
  const cacheKey = "nba_player_stats";
  const cached = getCached(cacheKey);
  if (cached) return cached;
  if (!bdlKey) return [];

  try {
    const season = 2024;
    const res = await fetch(`https://api.balldontlie.io/v1/season_averages?season=${season}`, {
      headers: { Accept:"application/json", Authorization: bdlKey },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rows = Array.isArray(data?.data) ? data.data : [];

    const playerIds = rows.map(r => r.player_id).filter(Boolean).slice(0, 250);
    const players = [];
    for (let i = 0; i < playerIds.length; i += 25) {
      const chunk = playerIds.slice(i, i + 25);
      const qs = chunk.map(id => `player_ids[]=${encodeURIComponent(id)}`).join("&");
      const pRes = await fetch(`https://api.balldontlie.io/v1/players?${qs}`, { headers:{ Accept:"application/json", Authorization:bdlKey } });
      if (!pRes.ok) continue;
      const pData = await pRes.json();
      if (Array.isArray(pData?.data)) players.push(...pData.data);
    }

    const playerMap = new Map(players.map(p => [p.id, p]));
    const normalized = rows.map(r => {
      const p = playerMap.get(r.player_id);
      if (!p) return null;
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      const team = p.team?.abbreviation || p.team?.full_name || "UNK";
      return { playerId:r.player_id, name, team, pts:r.pts, reb:r.reb, ast:r.ast, stl:r.stl, blk:r.blk, min:r.min, fg_pct:r.fg_pct, fg3_pct:r.fg3_pct, ft_pct:r.ft_pct, games_played:r.games_played };
    }).filter(Boolean).sort((a, b) => (b.pts||0) - (a.pts||0));

    setCached(cacheKey, normalized);
    return normalized;
  } catch (err) {
    console.warn("getCurrentPlayerStats error:", err.message);
    return [];
  }
}

async function getNbaInjuries(propLines, todaysGames) {
  const cacheKey = "nba_injuries";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const propPlayers = new Set((propLines||[]).map(p=>p.player).filter(Boolean).map(p=>String(p).toLowerCase()));
  const gameTeams = new Set();
  for (const g of todaysGames||[]) {
    if (g.homeTeam?.abbr) gameTeams.add(g.homeTeam.abbr);
    if (g.awayTeam?.abbr) gameTeams.add(g.awayTeam.abbr);
  }

  try {
    const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries", { cache:"no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data?.injuries) ? data.injuries : [];

    const injuries = items.map(item => {
      const athlete = item.athlete || {};
      const team    = item.team || athlete.team || {};
      const status  = item.status || item.type || {};
      const name    = athlete.displayName || athlete.fullName || athlete.shortName || "";
      const teamAbbr= team.abbreviation || normalizeTeamAbbr(team.displayName || team.name || "");
      const detail  = item.details?.type?.description || item.details?.detail || status.description || status.name || "";
      const availability = item.details?.availability || status.type || status.abbreviation || status.name || "";
      return { player:name, team:teamAbbr, status:availability, detail };
    }).filter(i => i.player).filter(i => {
      const lower = i.player.toLowerCase();
      return propPlayers.has(lower) || gameTeams.has(i.team);
    });

    setCached(cacheKey, injuries);
    return injuries;
  } catch (err) {
    console.warn("getNbaInjuries error:", err.message);
    return [];
  }
}

function buildGameTotalsFromProps(propLines) {
  const totals = {};
  for (const line of propLines||[]) {
    if (!line.game) continue;
    if (!totals[line.game]) totals[line.game] = { total:null, pace:"NEUTRAL" };
  }
  return totals;
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error:"Method not allowed" });

  const ODDS_KEY = process.env.ODDS_API_KEY;
  const BDL_KEY  = process.env.BALLDONTLIE_API_KEY;
  const view = String(req.query.view || "board").toLowerCase();

  try {
    if (view === "games") {
      return res.status(200).json(await getTodaysGames(ODDS_KEY));
    }

    if (view === "board") {
      const boardCached = getCached("board");
      if (boardCached) return res.status(200).json(boardCached);

      const [todaysGames, propLines, playerStats] = await Promise.all([
        getTodaysGames(ODDS_KEY),
        getNbaPropLines(ODDS_KEY),
        getCurrentPlayerStats(BDL_KEY),
      ]);

      const injuries = await getNbaInjuries(propLines, todaysGames);

      const board = {
        seasonContext: getNbaSeasonContext(),
        todaysGames,
        lastNight: [], lastNightStats: [], liveStats: [],
        playerStats: playerStats.slice(0, 120),
        propLines:   propLines.slice(0, 120),
        injuries,
        recentForm: "", h2hSplits: [],
        gameTotals: buildGameTotalsFromProps(propLines),
        fetchedAt: new Date().toISOString(),
      };

      if (todaysGames.length > 0 || propLines.length > 0 || injuries.length > 0 || playerStats.length > 0) {
        setCached("board", board);
      }
      return res.status(200).json(board);
    }

    return res.status(400).json({ error:"Invalid view", allowed:["board","games"] });
  } catch (err) {
    console.error("NBA API error:", err);
    return res.status(500).json({ error:"Failed to fetch NBA data", details:err.message });
  }
}
