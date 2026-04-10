// api/golf.js
// Pulls PGA Tour data from ESPN (leaderboard/event) + Odds API (outrights/top-10/make-cut)
// No dedicated golf API key needed — ESPN is free, Odds API uses existing ODDS_API_KEY

import { applyCors } from "./_cors.js";

const ODDS_API_KEY = process.env.ODDS_API_KEY || "";

// ── Cache ─────────────────────────────────────────────────────────────────────
const cache = new Map();
function getCached(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > e.ttl) { cache.delete(key); return null; }
  return e.data;
}
function setCached(key, data, ttlMs) {
  cache.set(key, { data, ts: Date.now(), ttl: ttlMs });
}

async function safeFetch(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; UnderReview/1.0)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ── ESPN: Current PGA Tour event + leaderboard ────────────────────────────────
async function getCurrentEvent() {
  const cached = getCached("golf_event");
  if (cached) return cached;

  try {
    // ESPN scoreboard endpoint for PGA Tour
    const data = await safeFetch(
      "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard"
    );
    if (!data?.events?.length) return null;

    const event = data.events[0];
    const comp = event.competitions?.[0];

    // Build leaderboard
    const leaderboard = (comp?.competitors || [])
      .sort((a, b) => (parseInt(a.status?.position) || 99) - (parseInt(b.status?.position) || 99))
      .slice(0, 30)
      .map(p => ({
        name: p.athlete?.displayName || p.athlete?.shortName || "Unknown",
        country: p.athlete?.flag?.alt || "",
        position: p.status?.position || "—",
        score: p.score?.displayValue || p.linescores?.[0]?.displayValue || "—",
        thru: p.status?.thru || "—",
        teeTime: p.teeTime || null,
        status: p.status?.displayValue || "—",
      }));

    const result = {
      name: event.name || event.shortName || "PGA Tour Event",
      shortName: event.shortName || "PGA TOUR",
      course: comp?.venue?.fullName || comp?.venue?.shortName || "",
      location: comp?.venue?.address?.city ? `${comp.venue.address.city}, ${comp.venue.address.state || ""}` : "",
      round: comp?.status?.type?.detail || "Upcoming",
      startDate: event.date || null,
      endDate: event.endDate || null,
      leaderboard,
    };

    setCached("golf_event", result, 5 * 60 * 1000); // 5 min cache
    return result;
  } catch { return null; }
}

// ── ESPN: World Golf Rankings ─────────────────────────────────────────────────
async function getRankings() {
  const cached = getCached("golf_rankings");
  if (cached) return cached;

  try {
    const data = await safeFetch(
      "https://site.api.espn.com/apis/site/v2/sports/golf/pga/rankings"
    );
    if (!data?.rankings) return [];

    const rankings = (data.rankings || []).slice(0, 30).map((p, i) => ({
      rank: p.rank || i + 1,
      name: p.athlete?.displayName || "Unknown",
      country: p.athlete?.flag?.alt || "",
      points: p.value || null,
    }));

    setCached("golf_rankings", rankings, 60 * 60 * 1000); // 1 hour
    return rankings;
  } catch { return []; }
}

// ── Odds API: Golf outrights + top-10 + make-cut ─────────────────────────────
async function getGolfOdds() {
  if (!ODDS_API_KEY) return {};
  const cached = getCached("golf_odds");
  if (cached) return cached;

  try {
    // Golf outright winner odds
    const data = await safeFetch(
      `https://api.the-odds-api.com/v4/sports/golf_pga_tour_winner/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=outrights&oddsFormat=american`
    );

    if (!data?.length) return {};

    const event = data[0];
    const bookmaker = event.bookmakers?.find(b => b.key === "draftkings") ||
                      event.bookmakers?.find(b => b.key === "fanduel") ||
                      event.bookmakers?.[0];

    if (!bookmaker) return {};

    const outrightMarket = bookmaker.markets?.find(m => m.key === "outrights");
    const outrights = (outrightMarket?.outcomes || [])
      .sort((a, b) => a.price - b.price)
      .slice(0, 30)
      .map(o => ({
        player: o.name,
        odds: o.price,
        book: bookmaker.title,
      }));

    const result = {
      eventName: event.sport_title,
      outrights,
    };

    setCached("golf_odds", result, 15 * 60 * 1000); // 15 min
    return result;
  } catch { return {}; }
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "GET, OPTIONS" })) return;

  const view = req.query.view || "board";

  if (view === "board") {
    const [currentEvent, rankings, odds] = await Promise.all([
      getCurrentEvent(),
      getRankings(),
      getGolfOdds(),
    ]);

    return res.status(200).json({
      currentEvent,
      rankings,
      odds,
      lastUpdated: new Date().toISOString(),
    });
  }

  return res.status(400).json({ error: "Unknown view" });
}
