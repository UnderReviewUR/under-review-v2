// api/nba-players.js
// Current top 80 NBA players by scoring average via ESPN public API
// 5-minute cache to balance freshness with rate limits

import { applyCors } from "./_cors.js";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expires) return null;
  return entry.payload;
}

function setCached(key, payload) {
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, payload });
}

// Auto-detect the current NBA season year (ESPN uses ending year: 2025-26 => 2026)
function getCurrentSeasonYear() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-based
  const year = now.getFullYear();
  // NBA season starts in October; use the ending calendar year
  return month >= 10 ? year + 1 : year;
}

// Auto-detect ESPN season type: 2=Regular Season, 3=Playoffs
// Playoffs typically run April–June
function getCurrentSeasonType() {
  const month = new Date().getMonth() + 1;
  if (month >= 4 && month <= 6) return 3; // Playoffs
  if (month >= 10 || month <= 3) return 2; // Regular Season
  return 2; // Off-season fallback
}

function determineTier(pts) {
  if (pts >= 28) return "ELITE";
  if (pts >= 22) return "STAR";
  if (pts >= 16) return "SOLID";
  return "ROLE";
}

async function fetchPlayerStats() {
  const cacheKey = "espn_players";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const seasonYear = getCurrentSeasonYear();
  const seasonType = getCurrentSeasonType();

  // ESPN statistics by athlete endpoint
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete?season=${seasonYear}&seasontype=${seasonType}&limit=80&sort=points.perGame%3Adesc`;

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`ESPN players ${res.status}`);
    const data = await res.json();

    const athletes = data.athletes || [];
    const playerDb = {};

    for (const entry of athletes) {
      const athlete = entry.athlete || {};
      const stats = entry.statistics || {};
      const name = athlete.displayName || athlete.fullName || "";
      if (!name) continue;

      const getStatValue = (category, statName) => {
        const cat = stats.splits?.find?.(s => s.displayName === category) || stats;
        const statEntry = cat?.stats?.find?.(s => s.name === statName || s.displayName === statName);
        return statEntry ? parseFloat(statEntry.value ?? statEntry.displayValue ?? 0) : 0;
      };

      // Flatten all stats for easier access
      const allStats = {};
      if (stats.splits && Array.isArray(stats.splits)) {
        for (const split of stats.splits) {
          for (const s of (split.stats || [])) {
            allStats[s.name || s.displayName] = parseFloat(s.value ?? s.displayValue ?? 0);
          }
        }
      }
      for (const s of (stats.stats || [])) {
        allStats[s.name || s.displayName] = parseFloat(s.value ?? s.displayValue ?? 0);
      }

      const pts = allStats.points || allStats.pointsPerGame || 0;
      const reb = allStats.rebounds || allStats.reboundsPerGame || 0;
      const ast = allStats.assists || allStats.assistsPerGame || 0;
      const min = allStats.minutesPerGame || allStats.minutes || 0;
      const gp = allStats.gamesPlayed || allStats.games || 0;

      playerDb[name] = {
        id: athlete.id || "",
        team: athlete.team?.abbreviation || entry.team?.abbreviation || "",
        tier: determineTier(pts),
        pts: Math.round(pts * 10) / 10,
        reb: Math.round(reb * 10) / 10,
        ast: Math.round(ast * 10) / 10,
        min: Math.round(min * 10) / 10,
        gp: Math.round(gp),
        seasonType: seasonType === 3 ? "Playoffs" : "Regular Season",
        season: seasonType === 3
          ? `${seasonYear - 1}-${String(seasonYear).slice(2)} Playoffs`
          : `${seasonYear - 1}-${String(seasonYear).slice(2)}`,
      };
    }

    const result = { players: playerDb, season: `${seasonYear - 1}-${String(seasonYear).slice(2)}`, seasonType: seasonType === 3 ? "Playoffs" : "Regular Season", fetchedAt: new Date().toISOString() };
    setCached(cacheKey, result);
    return result;
  } catch (err) {
    console.error("ESPN players fetch error:", err.message);
    // Return empty structure so the app degrades gracefully
    const fallbackYear = getCurrentSeasonYear();
    const fallbackType = getCurrentSeasonType();
    return { players: {}, season: `${fallbackYear - 1}-${String(fallbackYear).slice(2)}`, seasonType: fallbackType === 3 ? "Playoffs" : "Regular Season", fetchedAt: new Date().toISOString() };
  }
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const data = await fetchPlayerStats();
    return res.status(200).json(data);
  } catch (err) {
    console.error("NBA players handler error:", err);
    return res.status(500).json({ error: "Failed to fetch player stats", details: err.message });
  }
}
