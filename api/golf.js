import { applyCors } from "./_cors.js";

const CACHE_TTL = 8 * 60 * 1000;
const cache = new Map();
function getCached(k) { const e=cache.get(k); return (!e||Date.now()>e.expires)?null:e.payload; }
function setCached(k,v,ttl=CACHE_TTL) { cache.set(k,{expires:Date.now()+ttl,payload:v}); }

async function safeFetch(url) {
  try {
    const res = await fetch(url, { cache:"no-store", signal:AbortSignal.timeout(6000) });
    if (!res.ok) { console.warn("safeFetch",res.status,url.slice(0,80)); return null; }
    return await res.json();
  } catch(e) { console.warn("safeFetch failed:", url.slice(0,60), e.message); return null; }
}

// ── ESPN Golf: current event + leaderboard ────────────────────────────────────
async function getCurrentEvent() {
  const cached = getCached("golf_event");
  if (cached) return cached;
  try {
    const data = await safeFetch("https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard");
    const events = data?.events || [];
    if (!events.length) return null;
    const event = events[0];
    const comp = event?.competitions?.[0];
    const venue = comp?.venue || {};
    const status = event?.status?.type || {};
    const competitors = comp?.competitors || [];
    const leaderboard = competitors
      .filter(c => c.athlete)
      .map(c => {
        const a = c.athlete;
        const stats = c.statistics || [];
        const score = c.score || {};
        return {
          position: c.status?.position?.displayText || "—",
          name: a.displayName || a.fullName || "",
          country: a.flag?.alt || "",
          score: score.displayValue || "E",
          today: c.status?.today?.displayValue || "—",
          thru: c.status?.thru || "—",
          round1: stats.find(s=>s.name==="round1")?.displayValue || "—",
          round2: stats.find(s=>s.name==="round2")?.displayValue || "—",
          round3: stats.find(s=>s.name==="round3")?.displayValue || "—",
          round4: stats.find(s=>s.name==="round4")?.displayValue || "—",
        };
      }).slice(0, 30);
    const result = {
      name: event.name || event.shortName || "PGA Tour Event",
      shortName: event.shortName || "",
      course: venue.fullName || venue.shortName || "TBD",
      location: `${venue.city||""}, ${venue.state||venue.country||""}`.trim().replace(/^,|,$/g,""),
      round: status.shortDetail || status.description || "In Progress",
      state: status.state || "pre",
      par: comp?.format?.par || 72,
      leaderboard,
      startDate: event.date || null,
    };
    setCached("golf_event", result, 3 * 60 * 1000);
    return result;
  } catch(err) { console.warn("golf getCurrentEvent error:", err.message); return null; }
}

// ── ESPN Golf world rankings ──────────────────────────────────────────────────
async function getWorldRankings() {
  const cached = getCached("golf_rankings");
  if (cached) return cached;
  try {
    const data = await safeFetch("https://site.api.espn.com/apis/site/v2/sports/golf/pga/rankings");
    const entries = data?.rankings?.[0]?.ranks || [];
    const rankings = entries.slice(0, 50).map(r => ({
      rank: r.current,
      name: r.athlete?.displayName || "",
      country: r.athlete?.flag?.alt || "",
      points: r.rankValue || 0,
    }));
    setCached("golf_rankings", rankings, 60 * 60 * 1000);
    return rankings;
  } catch(err) { console.warn("golf rankings error:", err.message); return []; }
}

// ── Odds API: golf outrights + top-10 + make-cut ─────────────────────────────
async function getGolfOdds(oddsKey) {
  if (!oddsKey) return { outrights:[], topFinish:{}, makeCut:{}, matchups:[] };
  const cached = getCached("golf_odds");
  if (cached) return cached;
  try {
    const data = await safeFetch(
      `https://api.the-odds-api.com/v4/sports/golf_pga/odds/?apiKey=${oddsKey}&regions=us&markets=outrights&oddsFormat=american`
    );
    if (!Array.isArray(data) || !data.length) return { outrights:[], topFinish:{}, makeCut:{}, matchups:[] };
    const event = data[0];
    const book = event.bookmakers?.find(b=>b.key==="draftkings") || event.bookmakers?.find(b=>b.key==="fanduel") || event.bookmakers?.[0];
    const outrights = [];
    if (book) {
      const market = book.markets?.find(m=>m.key==="outrights");
      if (market) {
        for (const o of market.outcomes||[]) outrights.push({ player:o.name, odds:o.price, book:book.key });
        outrights.sort((a,b) => a.odds - b.odds);
      }
    }
    const topFinish = {};
    const makeCut = {};
    try {
      const propData = await safeFetch(
        `https://api.the-odds-api.com/v4/sports/golf_pga/events/${event.id}/odds?apiKey=${oddsKey}&regions=us&markets=top_10_finish,top_20_finish,make_cut&oddsFormat=american`
      );
      const propBook = propData?.bookmakers?.find(b=>b.key==="draftkings") || propData?.bookmakers?.[0];
      if (propBook) {
        for (const market of propBook.markets||[]) {
          for (const o of market.outcomes||[]) {
            if (market.key==="make_cut") {
              if (o.name==="Yes") makeCut[o.description||o.name] = o.price;
            } else {
              const key = o.description||o.name;
              if (!topFinish[key]) topFinish[key] = {};
              topFinish[key][market.key] = o.price;
            }
          }
        }
      }
    } catch {}
    const result = { outrights, topFinish, makeCut, matchups:[], eventName:event.sport_title };
    setCached("golf_odds", result);
    return result;
  } catch(err) { console.warn("getGolfOdds error:", err.message); return { outrights:[], topFinish:{}, makeCut:{}, matchups:[] }; }
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error:"Method not allowed" });
  const ODDS_KEY = process.env.ODDS_API_KEY;
  const view = String(req.query.view || "board").toLowerCase();
  try {
    if (view === "board") {
      const boardCached = getCached("golf_board");
      if (boardCached) return res.status(200).json(boardCached);
      const [currentEvent, rankings, odds] = await Promise.all([
        getCurrentEvent(), getWorldRankings(), getGolfOdds(ODDS_KEY),
      ]);
      const board = { currentEvent, rankings, odds, fetchedAt: new Date().toISOString() };
      if (currentEvent || odds.outrights.length > 0) setCached("golf_board", board);
      return res.status(200).json(board);
    }
    return res.status(400).json({ error:"Invalid view" });
  } catch(err) {
    console.error("Golf API error:", err);
    return res.status(500).json({ error:"Failed to fetch golf data", details:err.message });
  }
}
