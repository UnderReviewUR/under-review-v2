// api/nba.js
import { applyCors } from "./_cors.js";

const CACHE_TTL      = 5 * 60 * 1000;  // 5 min for live data
const CACHE_TTL_LONG = 60 * 60 * 1000; // 1 hr for season averages / game logs
const BDL_BASE       = "https://api.balldontlie.io/v1";

const cache = new Map();

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
  if (month >= 10)                              return { phase: "Regular Season (early)", season: 2025 };
  if (month <= 1)                               return { phase: "Regular Season (early)", season: 2025 };
  if (month === 2 || (month === 3 && day < 10)) return { phase: "Regular Season (mid)", season: 2025 };
  if ((month === 3 && day >= 10) || (month === 4 && day < 20)) return { phase: "Regular Season — final stretch", season: 2025 };
  if (month === 4 && day >= 20)                 return { phase: "NBA Playoffs — First Round", season: 2025 };
  if (month === 5)                              return { phase: "NBA Playoffs — Conference Semifinals", season: 2025 };
  if (month === 6)                              return { phase: "NBA Finals", season: 2025 };
  return { phase: "NBA Offseason", season: 2025 };
}

// ── Safe fetch wrapper ────────────────────────────────────────────────────────
async function safeFetch(url, headers) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { headers: headers || {}, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn("safeFetch non-OK:", res.status, url.slice(0, 80));
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn("safeFetch failed:", url.slice(0, 80), "-", err.message);
    return null;
  }
}

// ── BallDontLie helpers ───────────────────────────────────────────────────────
function bdlHeaders(key) {
  return key ? { "Authorization": key } : {};
}

// Today's date in YYYY-MM-DD
function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// Yesterday's date in YYYY-MM-DD
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

// N days ago
function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ── Today's games (Odds API) ──────────────────────────────────────────────────
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

    const now    = new Date();
    const etDate = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const todayET = etDate.toISOString().split("T")[0];

    const games = data
      .filter(g => {
        const gDate = new Date(new Date(g.commence_time).toLocaleString("en-US", { timeZone: "America/New_York" }));
        return gDate.toISOString().split("T")[0] === todayET || (!g.completed && g.scores && g.scores.length > 0);
      })
      .map(g => {
        const scores  = g.scores || [];
        const homePts = scores.find(s => s.name === g.home_team);
        const awayPts = scores.find(s => s.name === g.away_team);
        const isLive  = !g.completed && scores.length > 0;
        const isFinal = g.completed;
        const gameTime = new Date(g.commence_time).toLocaleTimeString("en-US", {
          hour: "numeric", minute: "2-digit", timeZone: "America/New_York"
        }) + " ET";
        return {
          id:       g.id,
          status:   isFinal ? "Final" : isLive ? "Live" : gameTime,
          state:    isFinal ? "post" : isLive ? "in" : "pre",
          homeTeam: { name: g.home_team, abbr: g.home_team.split(" ").pop().slice(0, 3).toUpperCase(), score: homePts ? parseInt(homePts.score) : null },
          awayTeam: { name: g.away_team, abbr: g.away_team.split(" ").pop().slice(0, 3).toUpperCase(), score: awayPts ? parseInt(awayPts.score) : null },
        };
      });

    if (games.length > 0) setCached(cacheKey, games);
    return games;
  } catch (err) {
    console.error("getTodaysGames error:", err.message);
    return [];
  }
}

// ── Prop lines (Odds API) ─────────────────────────────────────────────────────
async function getNbaPropLines(oddsKey) {
  if (!oddsKey) return [];
  const cached = getCached("nba_props");
  if (cached) return cached;

  try {
    const eventsRes = await fetch(
      `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${oddsKey}&regions=us&markets=h2h&oddsFormat=american`
    );
    if (!eventsRes.ok) return [];
    const events = await eventsRes.json();
    if (!Array.isArray(events) || !events.length) return [];

    const propMarkets = "player_points,player_rebounds,player_assists,player_points_rebounds_assists";
    const propLines   = [];

    for (const event of events.slice(0, 4)) {
      try {
        const propRes = await fetch(
          `https://api.the-odds-api.com/v4/sports/basketball_nba/events/${event.id}/odds?apiKey=${oddsKey}&regions=us&markets=${propMarkets}&oddsFormat=american`
        );
        if (!propRes.ok) continue;
        const propData   = await propRes.json();
        const bookmakers = propData.bookmakers || [];
        const preferred  = bookmakers.find(b => ["draftkings","fanduel","betmgm"].includes(b.key)) || bookmakers[0];
        if (!preferred) continue;
        for (const market of preferred.markets || []) {
          for (const outcome of market.outcomes || []) {
            propLines.push({
              game:   `${event.away_team} @ ${event.home_team}`,
              player: outcome.description || outcome.name,
              prop:   market.key.replace("player_","").replace(/_/g," "),
              line:   outcome.point,
              side:   outcome.name,
              odds:   outcome.price,
              book:   preferred.key,
            });
          }
        }
      } catch { continue; }
    }

    setCached("nba_props", propLines);
    return propLines;
  } catch (err) {
    console.error("NBA props error:", err.message);
    return [];
  }
}

// ── Season averages (BallDontLie) ─────────────────────────────────────────────
async function getSeasonAverages(bdlKey) {
  const cached = getCached("season_avgs");
  if (cached) return cached;

  const data = await safeFetch(
    `${BDL_BASE}/season_averages?season=2024&per_page=100`,
    bdlHeaders(bdlKey)
  );

  if (!data || !Array.isArray(data.data)) return [];

  const stats = data.data.map(p => ({
    name:  (p.player && (p.player.first_name + " " + p.player.last_name)) || "Unknown",
    team:  (p.player && p.player.team && p.player.team.abbreviation) || "?",
    pts:   parseFloat(p.pts  || 0).toFixed(1),
    reb:   parseFloat(p.reb  || 0).toFixed(1),
    ast:   parseFloat(p.ast  || 0).toFixed(1),
    stl:   parseFloat(p.stl  || 0).toFixed(1),
    blk:   parseFloat(p.blk  || 0).toFixed(1),
    fg_pct: parseFloat(p.fg_pct || 0).toFixed(3),
    fg3_pct: parseFloat(p.fg3_pct || 0).toFixed(3),
    min:   p.min || "0",
    gp:    p.games_played || 0,
    player_id: p.player && p.player.id,
  }));

  setCached("season_avgs", stats, CACHE_TTL_LONG);
  return stats;
}

// ── Injuries (BallDontLie) ────────────────────────────────────────────────────
async function getInjuries(bdlKey) {
  const cached = getCached("injuries");
  if (cached) return cached;

  const data = await safeFetch(
    `${BDL_BASE}/player_injuries?per_page=100`,
    bdlHeaders(bdlKey)
  );

  if (!data || !Array.isArray(data.data)) return [];

  const injuries = data.data.map(i => ({
    player:      (i.player && (i.player.first_name + " " + i.player.last_name)) || "Unknown",
    team:        (i.player && i.player.team && i.player.team.abbreviation) || "?",
    status:      i.status || "Out",
    description: i.description || "",
    returnDate:  i.return_date || null,
  }));

  setCached("injuries", injuries);
  return injuries;
}

// ── Last night's results (BallDontLie) ───────────────────────────────────────
async function getLastNightGames(bdlKey) {
  const cached = getCached("last_night");
  if (cached) return cached;

  const data = await safeFetch(
    `${BDL_BASE}/games?dates[]=${yesterdayStr()}&per_page=15`,
    bdlHeaders(bdlKey)
  );

  if (!data || !Array.isArray(data.data)) return [];

  const games = data.data
    .filter(g => g.status === "Final")
    .map(g => ({
      homeTeam: { name: g.home_team && g.home_team.full_name, abbr: g.home_team && g.home_team.abbreviation, score: g.home_team_score },
      awayTeam: { name: g.visitor_team && g.visitor_team.full_name, abbr: g.visitor_team && g.visitor_team.abbreviation, score: g.visitor_team_score },
      status: "Final",
    }));

  setCached("last_night", games);
  return games;
}

// ── Last night's top performers (BallDontLie) ─────────────────────────────────
async function getLastNightStats(bdlKey) {
  const cached = getCached("last_night_stats");
  if (cached) return cached;

  const data = await safeFetch(
    `${BDL_BASE}/stats?dates[]=${yesterdayStr()}&per_page=100`,
    bdlHeaders(bdlKey)
  );

  if (!data || !Array.isArray(data.data)) return [];

  const stats = data.data
    .filter(s => s.min && s.min !== "0" && s.min !== "00")
    .map(s => ({
      player: s.player && (s.player.first_name + " " + s.player.last_name),
      team:   s.team && s.team.abbreviation,
      pts:    s.pts || 0,
      reb:    s.reb || 0,
      ast:    s.ast || 0,
      stl:    s.stl || 0,
      blk:    s.blk || 0,
      min:    s.min,
    }))
    .sort((a, b) => (b.pts + b.reb + b.ast) - (a.pts + a.reb + a.ast))
    .slice(0, 15);

  setCached("last_night_stats", stats);
  return stats;
}

// ── Recent game logs — last 5 games per player on tonight's slate ─────────────
// This is the engine for "Flagg has scored 48, 51, 44 in his last 3"
async function getRecentGameLogs(bdlKey, playerIds) {
  if (!bdlKey || !playerIds || !playerIds.length) return {};
  const cacheKey = "game_logs_" + playerIds.slice(0, 10).join("_");
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const logs = {};
  const since = daysAgoStr(21); // last 3 weeks of games

  // Fetch in parallel, max 8 players to avoid rate limits
  const targets = playerIds.slice(0, 8);
  const results = await Promise.all(
    targets.map(id =>
      safeFetch(
        `${BDL_BASE}/stats?player_ids[]=${id}&start_date=${since}&per_page=10`,
        bdlHeaders(bdlKey)
      )
    )
  );

  for (let i = 0; i < targets.length; i++) {
    const data = results[i];
    if (!data || !Array.isArray(data.data) || !data.data.length) continue;
    const playerId = targets[i];

    const games = data.data
      .filter(s => s.min && s.min !== "0" && s.min !== "00")
      .sort((a, b) => new Date(b.game && b.game.date) - new Date(a.game && a.game.date))
      .slice(0, 5)
      .map(s => ({
        date:    s.game && s.game.date ? s.game.date.split("T")[0] : "?",
        opp:     s.team && s.game ? (s.game.home_team_id === s.team.id ? s.game.visitor_team_id : s.game.home_team_id) : "?",
        pts:     s.pts  || 0,
        reb:     s.reb  || 0,
        ast:     s.ast  || 0,
        pra:     (s.pts || 0) + (s.reb || 0) + (s.ast || 0),
        min:     s.min,
      }));

    if (games.length) logs[playerId] = games;
  }

  setCached(cacheKey, logs, CACHE_TTL_LONG);
  return logs;
}

// ── H2H splits — how a player performs vs tonight's opponent ──────────────────
// This powers "KAT averages 14.2 rebounds vs ATL frontcourt"
async function getH2HSplits(bdlKey, playerIds, seasonAverages) {
  if (!bdlKey || !playerIds || !playerIds.length) return {};
  const cacheKey = "h2h_" + playerIds.slice(0, 6).join("_");
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // We look back 2 full seasons for H2H matchup data
  const splits = {};
  const targets = playerIds.slice(0, 6);
  const since = daysAgoStr(365);

  const results = await Promise.all(
    targets.map(id =>
      safeFetch(
        `${BDL_BASE}/stats?player_ids[]=${id}&start_date=${since}&per_page=100`,
        bdlHeaders(bdlKey)
      )
    )
  );

  for (let i = 0; i < targets.length; i++) {
    const data = results[i];
    if (!data || !Array.isArray(data.data) || !data.data.length) continue;

    // Group by opponent team
    const byOpp = {};
    for (const s of data.data) {
      if (!s.min || s.min === "0" || s.min === "00") continue;
      const oppId = s.game && s.game.home_team_id && s.team ?
        (s.game.home_team_id === s.team.id ? String(s.game.visitor_team_id) : String(s.game.home_team_id))
        : null;
      if (!oppId) continue;
      if (!byOpp[oppId]) byOpp[oppId] = [];
      byOpp[oppId].push({ pts: s.pts||0, reb: s.reb||0, ast: s.ast||0, pra: (s.pts||0)+(s.reb||0)+(s.ast||0) });
    }

    // Compute averages per opponent
    const oppAvgs = {};
    for (const oppId in byOpp) {
      const games = byOpp[oppId];
      if (games.length < 2) continue; // need at least 2 games for meaningful split
      const avg = {
        gp:  games.length,
        pts: (games.reduce((a,g) => a+g.pts, 0) / games.length).toFixed(1),
        reb: (games.reduce((a,g) => a+g.reb, 0) / games.length).toFixed(1),
        ast: (games.reduce((a,g) => a+g.ast, 0) / games.length).toFixed(1),
        pra: (games.reduce((a,g) => a+g.pra, 0) / games.length).toFixed(1),
      };
      oppAvgs[oppId] = avg;
    }

    if (Object.keys(oppAvgs).length) splits[targets[i]] = oppAvgs;
  }

  setCached(cacheKey, splits, CACHE_TTL_LONG);
  return splits;
}

// ── Format game logs into a readable string for the prompt ────────────────────
function formatGameLogs(logs, seasonAverages) {
  if (!logs || !Object.keys(logs).length) return "";

  const lines = ["RECENT FORM (last 5 games):"];

  for (const playerId in logs) {
    const games = logs[playerId];
    if (!games || !games.length) continue;

    // Find player name from season averages
    const playerAvg = seasonAverages.find(p => String(p.player_id) === String(playerId));
    const name = playerAvg ? playerAvg.name : "Player #" + playerId;

    const pras   = games.map(g => g.pra);
    const avgPra = (pras.reduce((a,b) => a+b, 0) / pras.length).toFixed(1);
    const trend  = pras[0] > pras[pras.length-1] ? "↑ trending up" : pras[0] < pras[pras.length-1] ? "↓ trending down" : "→ steady";

    const gameStr = games.map(g => `${g.pts}pts/${g.reb}reb/${g.ast}ast`).join(", ");
    lines.push(`${name}: last ${games.length}G — ${gameStr} | avg PRA ${avgPra} ${trend}`);
  }

  return lines.join("\n");
}

// ── Build the full board ──────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ODDS_KEY = process.env.ODDS_API_KEY;
  const BDL_KEY  = process.env.BALLDONTLIE_API_KEY;

  const view = String(req.query.view || "board").toLowerCase();

  try {
    if (view === "games") {
      const games = await getTodaysGames(ODDS_KEY);
      return res.status(200).json(games);
    }

    if (view === "board") {
      const boardCached = getCached("board");
      if (boardCached) return res.status(200).json(boardCached);

      // Fire all base fetches in parallel
      const [todaysGames, propLines, seasonAverages, injuries, lastNight, lastNightStats] = await Promise.all([
        getTodaysGames(ODDS_KEY),
        getNbaPropLines(ODDS_KEY),
        getSeasonAverages(BDL_KEY),
        getInjuries(BDL_KEY),
        getLastNightGames(BDL_KEY),
        getLastNightStats(BDL_KEY),
      ]);

      // ── Build injury set for fast lookup ────────────────────────────────────
      const injuredSet = new Set(injuries.map(i => i.player.toLowerCase()));

      // ── Find player IDs for tonight's key matchups ───────────────────────────
      // Pull IDs for players with prop lines on tonight's slate
      const propPlayerNames = [...new Set(propLines.map(p => p.player).filter(Boolean))];
      const playerIdMap = {};

      if (BDL_KEY && propPlayerNames.length) {
        // Match prop player names to season averages to get BDL player IDs
        for (const name of propPlayerNames.slice(0, 15)) {
          const match = seasonAverages.find(p =>
            p.name && p.name.toLowerCase() === name.toLowerCase()
          );
          if (match && match.player_id) playerIdMap[name] = match.player_id;
        }
      }

      const playerIds = Object.values(playerIdMap);

      // ── Fetch game logs + H2H in parallel (only if we have IDs) ─────────────
      const [recentLogs, h2hSplits] = await Promise.all([
        getRecentGameLogs(BDL_KEY, playerIds),
        getH2HSplits(BDL_KEY, playerIds, seasonAverages),
      ]);

      // ── Format recent form string ─────────────────────────────────────────
      const recentFormStr = formatGameLogs(recentLogs, seasonAverages);

      // ── Flag injured players in season averages ──────────────────────────
      const playerStatsWithInjury = seasonAverages
        .filter(p => parseFloat(p.pts) >= 8) // only meaningful contributors
        .map(p => ({
          ...p,
          injured: injuredSet.has(p.name.toLowerCase()),
        }))
        .sort((a, b) => parseFloat(b.pts) - parseFloat(a.pts))
        .slice(0, 50);

      // ── Build H2H summary strings ─────────────────────────────────────────
      const h2hSummary = [];
      for (const playerName in playerIdMap) {
        const pid    = playerIdMap[playerName];
        const splits = h2hSplits[pid];
        if (!splits) continue;
        const playerAvg = seasonAverages.find(p => p.name === playerName);
        if (!playerAvg) continue;

        for (const oppId in splits) {
          const split = splits[oppId];
          const praSeasonAvg = parseFloat(playerAvg.pts) + parseFloat(playerAvg.reb) + parseFloat(playerAvg.ast);
          const praSplit = parseFloat(split.pra);
          const diff = (praSplit - praSeasonAvg).toFixed(1);
          const direction = diff > 0 ? "+" : "";
          h2hSummary.push(
            `${playerName} vs opp#${oppId} (${split.gp}gp): ${split.pts}pts/${split.reb}reb/${split.ast}ast | PRA ${split.pra} (${direction}${diff} vs season avg)`
          );
        }
      }

      const board = {
        seasonContext:  getNbaSeasonContext(),
        todaysGames,
        lastNight,
        lastNightStats,
        liveStats:      [],
        playerStats:    playerStatsWithInjury,
        propLines:      propLines.slice(0, 80),
        injuries,
        recentForm:     recentFormStr,
        h2hSplits:      h2hSummary.slice(0, 20),
        fetchedAt:      new Date().toISOString(),
      };

      setCached("board", board);
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      return res.status(200).json(board);
    }

    return res.status(400).json({ error: "Invalid view", allowed: ["board", "games"] });

  } catch (err) {
    console.error("NBA API error:", err);
    return res.status(500).json({ error: "Failed to fetch NBA data", details: err.message });
  }
}
