import { applyCors } from "./_cors.js";

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map();

function getCached(key) {
  const e = cache.get(key);
  if (!e || Date.now() > e.expires) return null;
  return e.payload;
}
function setCached(key, payload, ttl = CACHE_TTL) {
  cache.set(key, { expires: Date.now() + ttl, payload });
}

// ── Park factors (2024 run environment index, 100 = neutral) ─────────────────
const PARK_FACTORS = {
  COL: { name:"Coors Field",                 pf:120, run_env:"HIGH",   note:"Extreme altitude — always back OVERs and batter props" },
  CIN: { name:"Great American Ball Park",    pf:108, run_env:"HIGH",   note:"Hitter-friendly — above-average run environment" },
  TEX: { name:"Globe Life Field",            pf:107, run_env:"HIGH",   note:"Texas heat in summer boosts run environment" },
  BOS: { name:"Fenway Park",                 pf:105, run_env:"HIGH",   note:"Green Monster inflates doubles/hits props" },
  CHC: { name:"Wrigley Field",               pf:100, run_env:"NEUTRAL",note:"Wind-dependent — check direction day-of" },
  NYY: { name:"Yankee Stadium",              pf:101, run_env:"NEUTRAL",note:"Short porch in right — favors lefty power" },
  LAD: { name:"Dodger Stadium",              pf:99,  run_env:"NEUTRAL",note:"Pitcher-friendly in summer, neutral overall" },
  ATL: { name:"Truist Park",                 pf:102, run_env:"NEUTRAL",note:"Slightly above average, especially day games" },
  PHI: { name:"Citizens Bank Park",          pf:104, run_env:"HIGH",   note:"One of the best hitter parks in NL" },
  HOU: { name:"Minute Maid Park",            pf:100, run_env:"NEUTRAL",note:"Roof variable — night games lean neutral" },
  MIL: { name:"American Family Field",       pf:101, run_env:"NEUTRAL",note:"Dome-adjacent — neutral most nights" },
  MIN: { name:"Target Field",                pf:100, run_env:"NEUTRAL",note:"Cold early season suppresses offense" },
  TOR: { name:"Rogers Centre",               pf:103, run_env:"NEUTRAL",note:"Indoor turf — consistent run environment" },
  TB:  { name:"Tropicana Field",             pf:97,  run_env:"LOW",    note:"Dome with deep dimensions — pitcher-friendly" },
  PIT: { name:"PNC Park",                    pf:97,  run_env:"LOW",    note:"Deep to right-center suppresses power" },
  MIA: { name:"loanDepot park",              pf:96,  run_env:"LOW",    note:"Spacious and humid — pitchers thrive" },
  NYM: { name:"Citi Field",                  pf:96,  run_env:"LOW",    note:"Pitcher-friendly, especially to right field" },
  CLE: { name:"Progressive Field",           pf:96,  run_env:"LOW",    note:"Large outfield gaps suppress extra-base hits" },
  KC:  { name:"Kauffman Stadium",            pf:96,  run_env:"LOW",    note:"Large park, good for pitchers" },
  DET: { name:"Comerica Park",               pf:95,  run_env:"LOW",    note:"Deep center field — one of best pitcher parks" },
  OAK: { name:"Oakland Coliseum",            pf:94,  run_env:"LOW",    note:"Marine layer + massive foul territory" },
  SEA: { name:"T-Mobile Park",               pf:91,  run_env:"LOW",    note:"Marine layer + deep dimensions = elite pitcher park" },
  SF:  { name:"Oracle Park",                 pf:92,  run_env:"LOW",    note:"Marine layer suppresses fly balls significantly" },
  SD:  { name:"Petco Park",                  pf:93,  run_env:"LOW",    note:"Deep dimensions, marine layer — fade OVERs here" },
  LAA: { name:"Angel Stadium",               pf:98,  run_env:"NEUTRAL",note:"Generally neutral" },
  ARI: { name:"Chase Field",                 pf:103, run_env:"HIGH",   note:"Roof open = outdoor heat; closed = neutral" },
  STL: { name:"Busch Stadium",               pf:98,  run_env:"NEUTRAL",note:"Generally neutral, slight pitcher lean" },
  BAL: { name:"Camden Yards",                pf:104, run_env:"HIGH",   note:"Short right field — lefty power plays up" },
  CHW: { name:"Guaranteed Rate Field",       pf:103, run_env:"NEUTRAL",note:"Decent hitter park, especially mid-summer" },
  WAS: { name:"Nationals Park",              pf:99,  run_env:"NEUTRAL",note:"Generally neutral, windy at times" },
};

// ── Team abbr → home park mapping ────────────────────────────────────────────
const TEAM_PARK = {
  "Colorado Rockies":"COL","Cincinnati Reds":"CIN","Texas Rangers":"TEX",
  "Boston Red Sox":"BOS","Chicago Cubs":"CHC","New York Yankees":"NYY",
  "Los Angeles Dodgers":"LAD","Atlanta Braves":"ATL","Philadelphia Phillies":"PHI",
  "Houston Astros":"HOU","Milwaukee Brewers":"MIL","Minnesota Twins":"MIN",
  "Toronto Blue Jays":"TOR","Tampa Bay Rays":"TB","Pittsburgh Pirates":"PIT",
  "Miami Marlins":"MIA","New York Mets":"NYM","Cleveland Guardians":"CLE",
  "Kansas City Royals":"KC","Detroit Tigers":"DET","Oakland Athletics":"OAK",
  "Seattle Mariners":"SEA","San Francisco Giants":"SF","San Diego Padres":"SD",
  "Los Angeles Angels":"LAA","Arizona Diamondbacks":"ARI","St. Louis Cardinals":"STL",
  "Baltimore Orioles":"BAL","Chicago White Sox":"CHW","Washington Nationals":"WAS",
};

function getParkForGame(homeTeamName) {
  const abbr = TEAM_PARK[homeTeamName] || (homeTeamName||"").split(" ").pop().slice(0,3).toUpperCase();
  return PARK_FACTORS[abbr] || { pf:100, run_env:"NEUTRAL", note:"Park data unavailable" };
}

function getTeamAbbr(fullName) {
  return TEAM_PARK[fullName]
    ? Object.keys(PARK_FACTORS).find(k => TEAM_PARK[fullName] === k) || fullName.split(" ").pop().slice(0,3).toUpperCase()
    : (fullName||"").split(" ").pop().slice(0,3).toUpperCase();
}

function getMlbSeasonContext() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  if (month === 3 || (month === 4 && day < 15)) return { phase:"Opening Month — small sample, fade extreme lines", season:2025 };
  if (month >= 4 && month <= 6) return { phase:"Spring stretch — form establishing, trust K/9 baselines", season:2025 };
  if (month >= 7 && month <= 8) return { phase:"Midsummer — pitchers tire, bullpen reliance up", season:2025 };
  if (month === 9 || (month === 10 && day < 5)) return { phase:"Pennant race — manage stakes carefully", season:2025 };
  if (month >= 10) return { phase:"Playoffs — elite pitching, fade OVERs vs aces", season:2025 };
  return { phase:"Offseason", season:2025 };
}

function toEtDateString(isoString) {
  const local = new Date(new Date(isoString).toLocaleString("en-US", { timeZone:"America/New_York" }));
  return local.toISOString().split("T")[0];
}
function getTodayEtDateString() {
  const etNow = new Date(new Date().toLocaleString("en-US", { timeZone:"America/New_York" }));
  return etNow.toISOString().split("T")[0];
}
function getTomorrowEtDateString() {
  const etNow = new Date(new Date().toLocaleString("en-US", { timeZone:"America/New_York" }));
  etNow.setDate(etNow.getDate() + 1);
  return etNow.toISOString().split("T")[0];
}

// ── Fetch games with probable pitchers from ESPN ──────────────────────────────
async function getMlbGamesWithPitchers() {
  const cacheKey = "mlb_games";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard", { cache:"no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    const events = data?.events || [];

    const nowET = new Date(new Date().toLocaleString("en-US", { timeZone:"America/New_York" }));
    const todayStr = `${nowET.getFullYear()}-${String(nowET.getMonth()+1).padStart(2,"0")}-${String(nowET.getDate()).padStart(2,"0")}`;

    const games = events
      .filter(e => {
        const gET = new Date(new Date(e.date).toLocaleString("en-US", { timeZone:"America/New_York" }));
        const gStr = `${gET.getFullYear()}-${String(gET.getMonth()+1).padStart(2,"0")}-${String(gET.getDate()).padStart(2,"0")}`;
        return gStr === todayStr;
      })
      .map(e => {
        const comp   = e.competitions?.[0];
        const home   = comp?.competitors?.find(c => c.homeAway === "home");
        const away   = comp?.competitors?.find(c => c.homeAway === "away");
        const status = e.status?.type;
        const isLive  = status?.state === "in";
        const isFinal = status?.state === "post";
        const gameTime = e.date
          ? new Date(e.date).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", timeZone:"America/New_York" }) + " ET"
          : "TBD";

        // Extract probable pitchers from probables array
        const probables = comp?.probables || [];
        const homePitcher = probables.find(p => p.homeAway === "home")?.athlete?.shortName || null;
        const awayPitcher = probables.find(p => p.homeAway === "away")?.athlete?.shortName || null;

        // Park factor for home team
        const homeTeamFull = home?.team?.displayName || home?.team?.name || "";
        const parkInfo = getParkForGame(homeTeamFull);

        return {
          id:       e.id,
          status:   isFinal ? "Final" : isLive ? (status?.detail || "Live") : gameTime,
          state:    isFinal ? "post" : isLive ? "in" : "pre",
          inning:   isLive ? e.status?.period : null,
          homeTeam: {
            name: homeTeamFull,
            abbr: getTeamAbbr(homeTeamFull),
            score: (isFinal || isLive) ? parseInt(home?.score || "0") : null,
            pitcher: homePitcher,
          },
          awayTeam: {
            name: away?.team?.displayName || away?.team?.name || "",
            abbr: getTeamAbbr(away?.team?.displayName || away?.team?.name || ""),
            score: (isFinal || isLive) ? parseInt(away?.score || "0") : null,
            pitcher: awayPitcher,
          },
          park: parkInfo,
          venue: comp?.venue?.fullName || "",
        };
      });

    if (games.length > 0) setCached(cacheKey, games, 3 * 60 * 1000); // 3min cache for live games
    return games;
  } catch (err) {
    console.warn("MLB ESPN games error:", err.message);
    return [];
  }
}

// ── Fetch prop lines from Odds API (two-step like NBA) ────────────────────────
async function getMlbPropLines(oddsKey) {
  if (!oddsKey) return [];
  const cacheKey = "mlb_props";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const todayET    = getTodayEtDateString();
    const tomorrowET = getTomorrowEtDateString();

    // Step 1: Get event list
    const eventsRes = await fetch(
      `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/?apiKey=${oddsKey}&regions=us&markets=h2h&oddsFormat=american`
    );
    if (!eventsRes.ok) {
      console.warn("MLB odds events status:", eventsRes.status);
      return [];
    }
    const events = await eventsRes.json();
    if (!Array.isArray(events) || !events.length) return [];

    // Filter to today/tomorrow
    const targetEvents = events
      .filter(e => { const d = toEtDateString(e.commence_time); return d === todayET || d === tomorrowET; })
      .slice(0, 8); // Max 8 games to save API credits

    // Step 2: Fetch player props per event
    // MLB prop markets — pitcher strikeouts is the money market
    const propMarkets = [
      "pitcher_strikeouts",
      "batter_hits",
      "batter_home_runs",
      "batter_total_bases",
      "batter_rbis",
    ].join(",");

    const propLines = [];

    for (const event of targetEvents) {
      try {
        const propRes = await fetch(
          `https://api.the-odds-api.com/v4/sports/baseball_mlb/events/${event.id}/odds?apiKey=${oddsKey}&regions=us&markets=${propMarkets}&oddsFormat=american`
        );
        if (!propRes.ok) continue;
        const propData = await propRes.json();
        const bookmakers = propData.bookmakers || [];

        // Prefer DraftKings → FanDuel → BetMGM → first available
        const preferred = bookmakers.find(b => b.key === "draftkings")
          || bookmakers.find(b => b.key === "fanduel")
          || bookmakers.find(b => b.key === "betmgm")
          || bookmakers[0];
        if (!preferred) continue;

        for (const market of preferred.markets || []) {
          for (const outcome of market.outcomes || []) {
            propLines.push({
              game:    `${event.away_team} @ ${event.home_team}`,
              player:  outcome.description || outcome.name,
              prop:    market.key.replace("pitcher_","").replace("batter_","").replace(/_/g," "),
              propRaw: market.key,
              line:    outcome.point,
              side:    outcome.name,   // "Over" | "Under"
              odds:    outcome.price,
              book:    preferred.key,
              eventId: event.id,
              gameTime: new Date(event.commence_time).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/New_York"}) + " ET",
            });
          }
        }
      } catch (e) {
        console.warn("MLB prop fetch error for event:", event.id, e.message);
        continue;
      }
    }

    console.log(`MLB props fetched: ${propLines.length} lines`);
    if (propLines.length > 0) setCached(cacheKey, propLines);
    return propLines;
  } catch (err) {
    console.error("getMlbPropLines error:", err.message);
    return [];
  }
}

// ── Fetch game totals from Odds API ───────────────────────────────────────────
async function getMlbGameTotals(oddsKey) {
  if (!oddsKey) return {};
  const cacheKey = "mlb_totals";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const todayET = getTodayEtDateString();
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/?apiKey=${oddsKey}&regions=us&markets=totals&oddsFormat=american`
    );
    if (!res.ok) return {};
    const data = await res.json();
    if (!Array.isArray(data)) return {};

    const totals = {};
    for (const event of data.filter(e => toEtDateString(e.commence_time) === todayET)) {
      const gameKey = `${event.away_team} @ ${event.home_team}`;
      const book = event.bookmakers?.[0];
      if (!book) continue;
      const market = book.markets?.find(m => m.key === "totals");
      if (!market) continue;
      const over = market.outcomes?.find(o => o.name === "Over");
      if (!over) continue;

      // Determine run environment from park factor
      const homePark = getParkForGame(event.home_team);
      totals[gameKey] = {
        total: over.point,
        run_env: homePark.run_env,
        park: homePark.name,
        parkNote: homePark.note,
        parkFactor: homePark.pf,
      };
    }

    setCached(cacheKey, totals);
    return totals;
  } catch (err) {
    console.warn("getMlbGameTotals error:", err.message);
    return {};
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error:"Method not allowed" });

  const ODDS_KEY = process.env.ODDS_API_KEY;
  const view = String(req.query.view || "board").toLowerCase();

  try {
    if (view === "games") {
      return res.status(200).json(await getMlbGamesWithPitchers());
    }

    if (view === "board") {
      const boardCached = getCached("mlb_board");
      if (boardCached) return res.status(200).json(boardCached);

      const [games, propLines, gameTotals] = await Promise.all([
        getMlbGamesWithPitchers(),
        getMlbPropLines(ODDS_KEY),
        getMlbGameTotals(ODDS_KEY),
      ]);

      // Enrich games with park factor data
      const gamesWithPark = games.map(g => ({
        ...g,
        park: g.park || getParkForGame(g.homeTeam?.name || ""),
      }));

      const board = {
        seasonContext: getMlbSeasonContext(),
        games: gamesWithPark,
        propLines: propLines.slice(0, 100),
        gameTotals,
        parkFactors: PARK_FACTORS,
        fetchedAt: new Date().toISOString(),
      };

      if (games.length > 0 || propLines.length > 0) {
        setCached("mlb_board", board, 4 * 60 * 1000);
      }

      return res.status(200).json(board);
    }

    return res.status(400).json({ error:"Invalid view", allowed:["board","games"] });
  } catch (err) {
    console.error("MLB API error:", err);
    return res.status(500).json({ error:"Failed to fetch MLB data", details:err.message });
  }
}
