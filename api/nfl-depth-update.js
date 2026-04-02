// api/nfl-depth-update.js
// Auto-updates NFL QB depth chart from Ourlads every week
// Called by Vercel cron - do not call manually in production

export const config = {
  api: { bodyParser: false },
};

// Simple in-memory cache (resets on each cold start, fine for cron use)
let cachedDepth = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

import { applyCors } from "./_cors.js";

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;

  // GET: Vercel cron invokes GET — scrape fresh data then cache it.
  //      Also serves cached data to other endpoints reading depth charts.
  if (req.method === "GET") {
    if (cachedDepth && Date.now() - cacheTime < CACHE_TTL) {
      return res.status(200).json({ source: "cache", updatedAt: new Date(cacheTime).toISOString(), depth: cachedDepth });
    }
    const depth = await fetchOurladsQBs();
    if (depth) {
      cachedDepth = depth;
      cacheTime = Date.now();
      console.log(`[nfl-depth-update] Updated at ${new Date().toISOString()} - ${Object.keys(depth).length} teams`);
      return res.status(200).json({ source: "fresh", updatedAt: new Date(cacheTime).toISOString(), depth });
    }
    return res.status(500).json({ error: "Failed to fetch depth charts" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

async function fetchOurladsQBs() {
  try {
    const response = await fetch("https://www.ourlads.com/nfldepthcharts/depthchartpos/QB", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; UnderReview/1.0)",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`[nfl-depth-update] Ourlads returned ${response.status}`);
      return null;
    }

    const html = await response.text();
    return parseOurladsQBs(html);
  } catch (err) {
    console.error("[nfl-depth-update] Fetch error:", err.message);
    return null;
  }
}

function parseOurladsQBs(html) {
  // Ourlads table rows contain: | TEAM | QB | NO | Player Name ... |
  // We parse Player 1 (QB1) and Player 2 (QB2) per team
  const depth = {};

  // Extract player name from Ourlads link format: "Last, First YEAR/ROUND"
  function cleanName(raw) {
    if (!raw) return "";
    // Remove draft year/round suffix like "24/1", "U/Det", "SF25", "CC/Mia"
    const cleaned = raw
      .replace(/\s+\d{2}\/\d+$/, "")      // "24/1"
      .replace(/\s+U\/\w+$/, "")           // "U/Det"
      .replace(/\s+SF\d{2}$/, "")          // "SF25"
      .replace(/\s+CF\d{2}$/, "")          // "CF25"
      .replace(/\s+CC\/\w+$/, "")          // "CC/Mia"
      .replace(/\s+W\/\w+$/, "")           // "W/Min"
      .replace(/\s+T\/\w+$/, "")           // "T/LAR"
      .replace(/\s+P\/\w+$/, "")           // "P/Dal"
      .trim();

    // Convert "Last, First" to "First Last"
    if (cleaned.includes(",")) {
      const parts = cleaned.split(",").map(s => s.trim());
      return `${parts[1]} ${parts[0]}`;
    }

    // Handle ALL CAPS names (new signings shown in caps on Ourlads)
    if (cleaned === cleaned.toUpperCase() && cleaned.length > 3) {
      return cleaned.split(" ").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
    }

    return cleaned;
  }

  // Team abbreviation mapping - Ourlads uses some non-standard codes
  const teamMap = {
    "BUF": "BUF", "MIA": "MIA", "NE": "NE", "NYJ": "NYJ",
    "BAL": "BAL", "CIN": "CIN", "CLE": "CLE", "PIT": "PIT",
    "HOU": "HOU", "IND": "IND", "JAX": "JAX", "TEN": "TEN",
    "DEN": "DEN", "KC": "KC", "LV": "LV", "SD": "LAC",
    "DAL": "DAL", "NYG": "NYG", "PHI": "PHI", "WAS": "WAS",
    "CHI": "CHI", "DET": "DET", "GB": "GB", "MIN": "MIN",
    "ATL": "ATL", "CAR": "CAR", "NO": "NO", "TB": "TB",
    "ARZ": "ARZ", "RAM": "LAR", "SF": "SF", "SEA": "SEA",
  };

  // Parse the QB position table
  // Ourlads renders: <td>TEAM</td><td>QB</td><td>NO</td><td>Player 1 link</td>...
  const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
  if (!tableMatch) return null;

  for (const table of tableMatch) {
    // Find QB rows
    const rowMatches = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    for (const row of rowMatches) {
      if (!row.includes(">QB<")) continue;

      // Extract team code
      const teamMatch = row.match(/depthchart\/([A-Z]+)/);
      const ourladsCode = teamMatch?.[1];
      const team = ourladsCode ? (teamMap[ourladsCode] || ourladsCode) : null;
      if (!team) continue;

      // Extract player names from links - format: "Last, First YEAR/ROUND"
      const playerLinks = row.match(/\/nfldepthcharts\/player\/\d+\/"[^>]*>([^<]+)<\/a>/g) || [];
      const players = playerLinks.map(link => {
        const nameMatch = link.match(/>([^<]+)<\/a>/);
        return cleanName(nameMatch?.[1] || "");
      }).filter(Boolean);

      if (players.length > 0) {
        depth[team] = {
          qb1: players[0] || null,
          qb2: players[1] || null,
          qb3: players[2] || null,
          fetchedAt: new Date().toISOString(),
        };
      }
    }
  }

  return Object.keys(depth).length > 0 ? depth : null;
}
