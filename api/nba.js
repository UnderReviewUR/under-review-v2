// api/nba.js
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
  const now   = new Date();
  const month = now.getMonth() + 1;
  const day   = now.getDate();
  if (month >= 10 || month === 1) return { phase: "Regular Season (early)", season: 2024 };
  if (month === 2 || (month === 3 && day < 10)) return { phase: "Regular Season (mid)", season: 2024 };
  if ((month === 3 && day >= 10) || (month === 4 && day < 20)) return { phase: "Regular Season — final stretch", season: 2024 };
  if (month === 4 && day >= 20) return { phase: "NBA Playoffs — First Round", season: 2024 };
  if (month === 5) return { phase: "NBA Playoffs — Conference Semifinals", season: 2024 };
  if (month === 6) return { phase: "NBA Finals", season: 2024 };
  return { phase: "NBA Offseason", season: 2024 };
}

// ── Games via Odds API scores endpoint ────────────────────────────────────────
async function getTodaysGames(oddsKey) {
  const cacheKey = "games_today";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (!oddsKey) {
    console.log("NBA games: no odds key available");
    return [];
  }

  try {
    const url = `https://api.the-odds-api.com/v4/sports/basketball_nba/scores/?apiKey=${oddsKey}&daysFrom=2`;
    const res = await fetch(url);
    const text = await res.text();
    console.log("Odds API scores status:", res.status, "body preview:", text.slice(0, 100));

    if (!res.ok) return [];

    const data = JSON.parse(text);
    if (!Array.isArray(data)) return [];

    // Get today's date in ET
    const now = new Date();
    const etDate = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const todayET = etDate.toISOString().split("T")[0];

    const games = data
      .filter(g => {
        const gDate = new Date(g.commence_time).toLocaleString("en-US", { timeZone: "America/New_York" });
        const gDateStr = new Date(gDate).toISOString().split("T")[0];
        // Include today's games, in-progress games, AND tomorrow's early listings
        const tomorrow = new Date(etDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowET = tomorrow.toISOString().split("T")[0];
        return gDateStr === todayET || (!g.completed && g.scores && g.scores.length > 0);
      })
      .map(g => {
        const scores  = g.scores || [];
        const homePts = scores.find(s => s.name === g.home_team)?.score;
        const awayPts = scores.find(s => s.name === g.away_team)?.score;
        const isLive  = !g.completed && scores.length > 0;
        const isFinal = g.completed;
        const gameTime = new Date(g.commence_time).toLocaleTimeString("en-US", {
          hour: "numeric", minute: "2-digit", timeZone: "America/New_York"
        }) + " ET";

        return {
          id:       g.id,
          status:   isFinal ? "Final" : isLive ? "Live" : gameTime,
          state:    isFinal ? "post" : isLive ? "in" : "pre",
          homeTeam: {
            name:  g.home_team,
            abbr:  g.home_team.split(" ").pop().slice(0, 3).toUpperCase(),
            score: homePts != null ? parseInt(homePts) : null,
          },
          awayTeam: {
            name:  g.away_team,
            abbr:  g.away_team.split(" ").pop().slice(0, 3).toUpperCase(),
            score: awayPts != null ? parseInt(awayPts) : null,
          },
        };
      });

    console.log("NBA games found from scores:", games.length);

    // If scores endpoint returned nothing for today, pull from odds endpoint
    // The odds endpoint lists games before scores are available
    if (games.length === 0) {
      try {
        const oddsUrl = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${oddsKey}&regions=us&markets=h2h&oddsFormat=american`;
        const oddsRes = await fetch(oddsUrl);
        if (oddsRes.ok) {
          const oddsData = await oddsRes.json();
          if (Array.isArray(oddsData)) {
            const oddsGames = oddsData.filter(g => {
              const gDate = new Date(g.commence_time).toLocaleString("en-US", { timeZone: "America/New_York" });
              const gDateStr = new Date(gDate).toISOString().split("T")[0];
              return gDateStr === todayET;
            }).map(g => {
              const gameTime = new Date(g.commence_time).toLocaleTimeString("en-US", {
                hour: "numeric", minute: "2-digit", timeZone: "America/New_York"
              }) + " ET";
              return {
                id: g.id,
                status: gameTime,
                state: "pre",
                homeTeam: {
                  name: g.home_team,
                  abbr: g.home_team.split(" ").pop().slice(0, 3).toUpperCase(),
                  score: null,
                },
                awayTeam: {
                  name: g.away_team,
                  abbr: g.away_team.split(" ").pop().slice(0, 3).toUpperCase(),
                  score: null,
                },
              };
            });
            console.log("NBA games found from odds:", oddsGames.length);
            if (oddsGames.length > 0) {
              setCached(cacheKey, oddsGames);
              return oddsGames;
            }
          }
        }
      } catch (oddsErr) {
        console.warn("Odds fallback failed:", oddsErr.message);
      }
    }

    if (games.length > 0) setCached(cacheKey, games);
    return games;
  } catch (err) {
    console.error("getTodaysGames error:", err.message);
    return [];
  }
}

// ── Prop lines via Odds API ───────────────────────────────────────────────────
async function getNbaPropLines(oddsKey) {
  if (!oddsKey) return [];
  const cacheKey = "nba_props";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const eventsRes = await fetch(
      `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${oddsKey}&regions=us&markets=h2h&oddsFormat=american`
    );
    if (!eventsRes.ok) return [];
    const events = await eventsRes.json();
    if (!Array.isArray(events) || !events.length) return [];

    const propMarkets = "player_points,player_rebounds,player_assists,player_points_rebounds_assists";
    const propLines = [];

    for (const event of events.slice(0, 3)) {
      try {
        const propRes = await fetch(
          `https://api.the-odds-api.com/v4/sports/basketball_nba/events/${event.id}/odds?apiKey=${oddsKey}&regions=us&markets=${propMarkets}&oddsFormat=american`
        );
        if (!propRes.ok) continue;
        const propData = await propRes.json();
        const bookmakers = propData.bookmakers || [];
        const preferred = bookmakers.find(b => ["draftkings","fanduel","betmgm"].includes(b.key)) || bookmakers[0];
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

    setCached(cacheKey, propLines);
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

  const ODDS_KEY = process.env.ODDS_API_KEY;
  const BDL_KEY  = process.env.BALLDONTLIE_API_KEY;

  console.log("NBA handler — ODDS_KEY:", !!ODDS_KEY, "BDL_KEY:", !!BDL_KEY);

  const view = String(req.query.view || "board").toLowerCase();

  try {
    if (view === "games") {
      const games = await getTodaysGames(ODDS_KEY);
      return res.status(200).json(games);
    }

    if (view === "board") {
      const boardCached = getCached("board");
      if (boardCached) return res.status(200).json(boardCached);

      const [todaysGames, propLines] = await Promise.all([
        getTodaysGames(ODDS_KEY),
        getNbaPropLines(ODDS_KEY),
      ]);

      const board = {
        seasonContext: getNbaSeasonContext(),
        todaysGames,
        lastNight:      [],
        lastNightStats: [],
        liveStats:      [],
        playerStats:    [],
        propLines:      propLines.slice(0, 60),
        injuries:       [],
        fetchedAt:      new Date().toISOString(),
      };

      // Only cache if we have games — empty slate means retry next call
      if (todaysGames.length > 0) setCached("board", board);
      return res.status(200).json(board);
    }

    return res.status(400).json({ error: "Invalid view", allowed: ["board", "games"] });

  } catch (err) {
    console.error("NBA API error:", err);
    return res.status(500).json({ error: "Failed to fetch NBA data", details: err.message });
  }
}
