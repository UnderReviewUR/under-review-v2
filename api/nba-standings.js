// api/nba-standings.js
// Current NBA standings via ESPN public API
// 5-minute cache

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

// Auto-detect current season year (ESPN uses the ending year: 2025-26 => 2026)
function getCurrentSeasonYear() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return month >= 10 ? year + 1 : year;
}

async function fetchStandings() {
  const cacheKey = "espn_standings";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const seasonYear = getCurrentSeasonYear();
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/standings?season=${seasonYear}`;

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`ESPN standings ${res.status}`);
    const data = await res.json();

    const conferences = [];
    for (const group of (data.standings?.entries || data.children || [])) {
      const confName = group.name || group.abbreviation || "";
      const teams = [];

      const entries = group.standings?.entries || group.entries || [];
      for (const entry of entries) {
        const team = entry.team || {};
        const stats = {};
        for (const s of (entry.stats || [])) {
          stats[s.name || s.abbreviation] = s.value ?? s.displayValue;
        }

        teams.push({
          rank: entry.note?.rank || teams.length + 1,
          teamId: team.id || "",
          teamName: team.displayName || team.name || "",
          tricode: team.abbreviation || "",
          wins: parseInt(stats.wins || stats.W || 0),
          losses: parseInt(stats.losses || stats.L || 0),
          pct: parseFloat(stats.winPercent || stats.PCT || 0).toFixed(3),
          gb: stats.gamesBehind || stats.GB || "—",
          homeRecord: stats.Home || stats.home || "",
          awayRecord: stats.Road || stats.road || "",
          streak: stats.streak || "",
          last10: stats.Last10 || stats["L10"] || "",
          clinched: entry.note?.color === "00ff00" ? "x" : "",
        });
      }

      if (teams.length > 0) conferences.push({ conference: confName, teams });
    }

    const season = `${seasonYear - 1}-${String(seasonYear).slice(2)}`;
    const result = { standings: conferences, season, fetchedAt: new Date().toISOString() };
    setCached(cacheKey, result);
    return result;
  } catch (err) {
    console.error("ESPN standings fetch error:", err.message);
    const seasonYear2 = getCurrentSeasonYear();
    return { standings: [], season: `${seasonYear2 - 1}-${String(seasonYear2).slice(2)}`, fetchedAt: new Date().toISOString() };
  }
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const data = await fetchStandings();
    return res.status(200).json(data);
  } catch (err) {
    console.error("NBA standings handler error:", err);
    return res.status(500).json({ error: "Failed to fetch standings", details: err.message });
  }
}
