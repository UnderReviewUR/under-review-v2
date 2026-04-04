// api/nba.js
// Uses only the NBA CDN scoreboard endpoint (never blocked)
// Player stats come from the curated database in src/data/nba/players.js
// stats.nba.com blocks Vercel datacenter IPs — avoided entirely

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

async function getTodaysGames() {
  const cached = getCached("scoreboard");
  if (cached) return cached;
  try {
    const res = await fetch(
      "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json"
    );
    if (!res.ok) throw new Error(`CDN ${res.status}`);
    const data = await res.json();
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
    }));
    setCached("scoreboard", games);
    return games;
  } catch (err) {
    console.error("Scoreboard fetch error:", err.message);
    return [];
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

    if (view === "board") {
      const cached = getCached("board");
      if (cached) return res.status(200).json(cached);

      const games = await getTodaysGames();

      // playerStats is empty — player data comes from curated database in App.jsx
      // This avoids stats.nba.com which blocks Vercel datacenter IPs
      const board = { games, playerStats: [], gameLogs: {} };
      setCached("board", board);
      return res.status(200).json(board);
    }

    return res.status(400).json({ error: "Invalid view", allowed: ["board", "scoreboard"] });
  } catch (err) {
    console.error("NBA API error:", err);
    return res.status(500).json({ error: "Failed to fetch NBA data", details: err.message });
  }
}
