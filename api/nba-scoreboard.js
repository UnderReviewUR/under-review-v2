// api/nba-scoreboard.js
// Today's NBA games with live scores via ESPN public API
// 60-second cache to stay current without hammering the endpoint

import { applyCors } from "./_cors.js";

const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expires) return null;
  return entry.payload;
}

function setCached(key, payload) {
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, payload });
}

async function fetchScoreboard() {
  const cached = getCached("espn_scoreboard");
  if (cached) return cached;

  try {
    const res = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) throw new Error(`ESPN scoreboard ${res.status}`);
    const data = await res.json();

    const games = (data.events || []).map(event => {
      const comps = event.competitions?.[0];
      const home = comps?.competitors?.find(c => c.homeAway === "home");
      const away = comps?.competitors?.find(c => c.homeAway === "away");
      const status = comps?.status;

      return {
        gameId: event.id,
        status: status?.type?.description || event.status?.type?.description || "Scheduled",
        statusCode: status?.type?.state === "in" ? 2 : status?.type?.state === "post" ? 3 : 1,
        period: status?.period || 0,
        gameClock: status?.displayClock || "",
        homeTeam: {
          name: home?.team?.displayName || home?.team?.name || "",
          tricode: home?.team?.abbreviation || "",
          score: home?.score ?? "",
          wins: home?.records?.[0]?.summary?.split("-")?.[0] ?? "",
          losses: home?.records?.[0]?.summary?.split("-")?.[1] ?? "",
        },
        awayTeam: {
          name: away?.team?.displayName || away?.team?.name || "",
          tricode: away?.team?.abbreviation || "",
          score: away?.score ?? "",
          wins: away?.records?.[0]?.summary?.split("-")?.[0] ?? "",
          losses: away?.records?.[0]?.summary?.split("-")?.[1] ?? "",
        },
        arena: comps?.venue?.fullName || "",
        broadcasts: (comps?.broadcasts || []).map(b => b.names?.[0] || b.market || "").filter(Boolean),
        odds: comps?.odds?.[0]
          ? {
              spread: comps.odds[0].details || "",
              overUnder: comps.odds[0].overUnder ?? null,
            }
          : null,
      };
    });

    setCached("espn_scoreboard", games);
    return games;
  } catch (err) {
    console.error("ESPN scoreboard error:", err.message);
    return [];
  }
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const games = await fetchScoreboard();
    return res.status(200).json(games);
  } catch (err) {
    console.error("NBA scoreboard handler error:", err);
    return res.status(500).json({ error: "Failed to fetch scoreboard", details: err.message });
  }
}
