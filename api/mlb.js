// api/mlb.js
// MLB data sources (all free):
//   1. MLB Stats API (statsapi.mlb.com) — live scores, game schedule, no key needed
//   2. Odds API — prop lines + game totals (already paid)
// Park factors and pitcher context are embedded — updated manually each season

import { applyCors } from "./_cors.js";

const CACHE_TTL      = 5  * 60 * 1000;
const CACHE_TTL_LONG = 30 * 60 * 1000;
const cache          = new Map();

function getCached(key) {
  const e = cache.get(key);
  if (!e || Date.now() > e.expires) return null;
  return e.payload;
}
function setCached(key, payload, ttl) {
  cache.set(key, { expires: Date.now() + (ttl || CACHE_TTL), payload });
}

async function safeFetch(url, options) {
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const res   = await fetch(url, Object.assign({ signal: ctrl.signal }, options || {}));
    clearTimeout(timer);
    if (!res.ok) { console.warn("safeFetch", res.status, url.slice(0, 80)); return null; }
    return await res.json();
  } catch (e) {
    console.warn("safeFetch failed:", url.slice(0, 60), e.message);
    return null;
  }
}

// ── MLB season context ────────────────────────────────────────────────────────
function getMlbSeasonContext() {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const day   = now.getDate();
  if (month === 3 && day >= 20) return { phase: "Opening Month", season: 2026 };
  if (month === 4 || month === 5) return { phase: "Early Season", season: 2026 };
  if (month === 6 || month === 7) return { phase: "Mid-Season", season: 2026 };
  if (month === 8) return { phase: "Stretch Run", season: 2026 };
  if (month === 9) return { phase: "September — Pennant Race", season: 2026 };
  if (month === 10 && day <= 10) return { phase: "Wild Card + Division Series", season: 2026 };
  if (month === 10) return { phase: "Championship Series", season: 2026 };
  if (month === 11 && day <= 7) return { phase: "World Series", season: 2026 };
  return { phase: "MLB Offseason", season: 2026 };
}

// ── Today's games — ESPN primary, MLB Stats API fallback ─────────────────────
async function getTodaysGames() {
  const cached = getCached("mlb_games");
  if (cached) return cached;

  // ── Source 1: ESPN (same approach as NBA — reliable) ──────────────────────
  try {
    const espnData = await safeFetch(
      "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard"
    );
    if (espnData?.events?.length > 0) {
      const nowET = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
      const todayStr = `${nowET.getFullYear()}-${String(nowET.getMonth()+1).padStart(2,"0")}-${String(nowET.getDate()).padStart(2,"0")}`;

      const games = espnData.events
        .filter(e => {
          const gET = new Date(new Date(e.date).toLocaleString("en-US", { timeZone: "America/New_York" }));
          const gStr = `${gET.getFullYear()}-${String(gET.getMonth()+1).padStart(2,"0")}-${String(gET.getDate()).padStart(2,"0")}`;
          return gStr === todayStr;
        })
        .map(e => {
          const comp   = e.competitions?.[0];
          const home   = comp?.competitors?.find(c => c.homeAway === "home");
          const away   = comp?.competitors?.find(c => c.homeAway === "away");
          const status = e.status?.type;
          const isLive = status?.state === "in";
          const isFinal = status?.state === "post";
          const gameTime = e.date
            ? new Date(e.date).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", timeZone:"America/New_York" }) + " ET"
            : "TBD";
          // Extract probable pitchers from notes if available
          const notes = comp?.notes || [];
          const awayPitcher = notes.find(n => n.type === "away_starter")?.headline || null;
          const homePitcher = notes.find(n => n.type === "home_starter")?.headline || null;
          return {
            id:       e.id,
            status:   isFinal ? "Final" : isLive ? (status?.detail || "Live") : gameTime,
            state:    isFinal ? "post" : isLive ? "in" : "pre",
            inning:   isLive ? status?.period : null,
            inningHalf: null,
            homeTeam: {
              name:    home?.team?.displayName,
              abbr:    home?.team?.abbreviation,
              score:   isFinal||isLive ? parseInt(home?.score||"0") : null,
              pitcher: homePitcher,
              record:  home?.records?.[0]?.summary || null,
            },
            awayTeam: {
              name:    away?.team?.displayName,
              abbr:    away?.team?.abbreviation,
              score:   isFinal||isLive ? parseInt(away?.score||"0") : null,
              pitcher: awayPitcher,
              record:  away?.records?.[0]?.summary || null,
            },
            venue: comp?.venue?.fullName || null,
          };
        });

      if (games.length > 0) {
        console.log("MLB ESPN games:", games.length);
        setCached("mlb_games", games);
        return games;
      }
    }
  } catch (err) {
    console.warn("MLB ESPN fetch failed:", err.message);
  }

  // ── Source 2: MLB Stats API fallback ──────────────────────────────────────
  const now     = new Date();
  const etNow   = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const dateStr = `${etNow.getFullYear()}-${String(etNow.getMonth()+1).padStart(2,"0")}-${String(etNow.getDate()).padStart(2,"0")}`;

  const data = await safeFetch(
    `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${dateStr}&hydrate=team,linescore,probablePitcher`
  );

  if (!data || !data.dates || !data.dates.length) return [];

  const games = (data.dates[0]?.games || []).map(g => {
    const home = g.teams?.home;
    const away = g.teams?.away;
    const status = g.status?.detailedState || "Scheduled";
    const isLive = status.includes("In Progress") || status.includes("Warmup");
    const isFinal = status.includes("Final") || status.includes("Game Over");
    const gameTime = g.gameDate
      ? new Date(g.gameDate).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", timeZone:"America/New_York" }) + " ET"
      : "TBD";
    return {
      id:         g.gamePk,
      status:     isFinal ? "Final" : isLive ? status : gameTime,
      state:      isFinal ? "post" : isLive ? "in" : "pre",
      inning:     g.linescore?.currentInning || null,
      inningHalf: g.linescore?.inningHalf || null,
      homeTeam: {
        name:    home?.team?.name,
        abbr:    home?.team?.abbreviation,
        score:   home?.score ?? null,
        pitcher: home?.probablePitcher?.fullName || null,
        record:  home?.leagueRecord ? `${home.leagueRecord.wins}-${home.leagueRecord.losses}` : null,
      },
      awayTeam: {
        name:    away?.team?.name,
        abbr:    away?.team?.abbreviation,
        score:   away?.score ?? null,
        pitcher: away?.probablePitcher?.fullName || null,
        record:  away?.leagueRecord ? `${away.leagueRecord.wins}-${away.leagueRecord.losses}` : null,
      },
      venue: g.venue?.name || null,
    };
  });

  if (games.length > 0) setCached("mlb_games", games);
  return games;
}

// ── Prop lines (Odds API) ─────────────────────────────────────────────────────
async function getMlbPropLines(oddsKey) {
  const cached = getCached("mlb_props");
  if (cached) return cached;
  if (!oddsKey) return [];

  try {
    const events = await safeFetch(
      `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/?apiKey=${oddsKey}&regions=us&markets=h2h&oddsFormat=american`
    );
    if (!Array.isArray(events) || !events.length) return [];

    const propMarkets = "batter_home_runs,batter_hits,batter_total_bases,batter_rbis,batter_strikeouts,pitcher_strikeouts,pitcher_hits_allowed";
    const propLines   = [];

    const results = await Promise.all(
      events.slice(0, 6).map(event =>
        safeFetch(
          `https://api.the-odds-api.com/v4/sports/baseball_mlb/events/${event.id}/odds?apiKey=${oddsKey}&regions=us&markets=${propMarkets}&oddsFormat=american`
        ).then(d => ({ event, data: d }))
      )
    );

    for (const { event, data } of results) {
      if (!data) continue;
      const book = (data.bookmakers || []).find(b =>
        ["draftkings","fanduel","betmgm"].includes(b.key)
      ) || (data.bookmakers || [])[0];
      if (!book) continue;

      for (const market of book.markets || []) {
        for (const outcome of market.outcomes || []) {
          if (outcome.point == null) continue;
          propLines.push({
            game:   event.away_team + " @ " + event.home_team,
            player: outcome.description || outcome.name,
            prop:   market.key.replace("batter_","").replace("pitcher_","P: ").replace(/_/g," "),
            line:   outcome.point,
            side:   outcome.name,
            odds:   outcome.price,
            book:   book.key,
          });
        }
      }
    }

    if (propLines.length > 0) setCached("mlb_props", propLines);
    return propLines;
  } catch (err) {
    console.error("MLB props error:", err.message);
    return [];
  }
}

// ── Game totals (Odds API) ────────────────────────────────────────────────────
async function getMlbTotals(oddsKey) {
  const cached = getCached("mlb_totals");
  if (cached) return cached;
  if (!oddsKey) return {};

  const data = await safeFetch(
    `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/?apiKey=${oddsKey}&regions=us&markets=totals&oddsFormat=american`
  );
  if (!Array.isArray(data)) return {};

  const totals = {};
  for (const event of data) {
    const book = (event.bookmakers || []).find(b =>
      ["draftkings","fanduel","betmgm"].includes(b.key)
    ) || (event.bookmakers || [])[0];
    if (!book) continue;
    const tm = (book.markets || []).find(m => m.key === "totals");
    if (!tm) continue;
    const over = (tm.outcomes || []).find(o => o.name === "Over");
    if (over?.point) {
      const key = event.away_team + " @ " + event.home_team;
      totals[key] = {
        total: over.point,
        run_env: over.point >= 9 ? "HIGH" : over.point <= 7 ? "LOW" : "NORMAL",
      };
    }
  }

  setCached("mlb_totals", totals, CACHE_TTL_LONG);
  return totals;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ODDS_KEY = process.env.ODDS_API_KEY;
  const view     = String(req.query.view || "board").toLowerCase();

  try {
    if (view === "games") {
      return res.status(200).json(await getTodaysGames());
    }

    if (view === "board") {
      const boardCached = getCached("mlb_board");
      if (boardCached) return res.status(200).json(boardCached);

      const [games, propLines, gameTotals] = await Promise.all([
        getTodaysGames(),
        getMlbPropLines(ODDS_KEY),
        getMlbTotals(ODDS_KEY),
      ]);

      const board = {
        seasonContext: getMlbSeasonContext(),
        games,
        propLines: propLines.slice(0, 100),
        gameTotals,
        fetchedAt: new Date().toISOString(),
      };

      if (games.length > 0) setCached("mlb_board", board);
      res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
      return res.status(200).json(board);
    }

    return res.status(400).json({ error: "Invalid view" });

  } catch (err) {
    console.error("MLB API error:", err);
    return res.status(200).json({
      seasonContext: getMlbSeasonContext(),
      games: [],
      propLines: [],
      gameTotals: {},
      error: err.message,
    });
  }
}
