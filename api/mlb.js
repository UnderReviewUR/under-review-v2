import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { etDateStringToEspnYmd, getTodayEtDateString, getTomorrowEtDateString } from "./_espnEtDates.js";
import { persistLastKnownHomeMlbGames, recoverLastKnownHomeMlbGames } from "./_homeLastKnownGames.js";
import {
  fetchBdlMlbGameTotalsMap,
  fetchBdlMlbInjuriesForTeamIds,
  fetchBdlMlbPlayerPropsForSlate,
  fetchBdlMlbTodayTomorrowGames,
} from "./_mlbBdl.js";

/** MLB BDL merge here is slate/games/props/injuries — no NBA-style `/v1/stats` per-player game log sort in this route; recent pitcher/hitter logs would need the same nested-date fallback pattern as `bdlNestedGameRowDateMs` in `_balldontlie.js`. */

const CACHE_TTL = 5 * 60 * 1000;
const MLB_BDL_SLATE_MEMO_MS = 45000;
/** Dedupe today+tomorrow BallDontLie pulls within one board refresh / back-to-back getters. */
let mlbBdlSlateMemo = { ts: 0, bundle: null };

async function getMlbBdlSlateBundle(bdlKey) {
  if (!bdlKey) return null;
  const now = Date.now();
  if (mlbBdlSlateMemo.bundle != null && now - mlbBdlSlateMemo.ts < MLB_BDL_SLATE_MEMO_MS) {
    return mlbBdlSlateMemo.bundle;
  }
  const todayEt = getTodayEtDateString();
  const tomorrowEt = getTomorrowEtDateString();
  try {
    const bundle = await fetchBdlMlbTodayTomorrowGames(bdlKey, todayEt, tomorrowEt);
    if (!bundle || (!bundle.todayGames?.length && !bundle.tomorrowGames?.length)) return null;
    mlbBdlSlateMemo = { ts: now, bundle };
    return bundle;
  } catch (err) {
    console.warn("[mlb] BallDontLie slate error:", err?.message || err);
    return null;
  }
}

const cache = new Map();

function logOddsUnavailable(status, scope) {
  console.warn(
    `[odds] unavailable — running without lines (${scope}${Number.isFinite(status) ? ` status=${status}` : ""})`,
  );
}

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

/** UR Take / model: explicit PF index + friendly tag (<95 pitcher, >105 hitter). */
function parkFactorFieldsFromHomeTeam(homeTeamFullName) {
  const info = getParkForGame(homeTeamFullName);
  const pfRaw = info?.pf;
  const pf = Number.isFinite(Number(pfRaw)) ? Number(pfRaw) : null;
  let parkNote = "neutral";
  if (pf != null) {
    if (pf < 95) parkNote = "pitcher-friendly";
    else if (pf > 105) parkNote = "hitter-friendly";
  }
  return { parkFactor: pf, parkNote };
}

function enrichGameWithParkFactors(gameRow) {
  if (!gameRow || typeof gameRow !== "object") return gameRow;
  const homeName = gameRow.homeTeam?.name || "";
  const { parkFactor, parkNote } = parkFactorFieldsFromHomeTeam(homeName);
  return { ...gameRow, parkFactor, parkNote };
}

function buildMlbPitcherStatsText(games) {
  const names = new Set();
  for (const g of games || []) {
    if (g?.homeTeam?.pitcher) names.add(String(g.homeTeam.pitcher).trim());
    if (g?.awayTeam?.pitcher) names.add(String(g.awayTeam.pitcher).trim());
  }
  const lines = [...names]
    .filter(Boolean)
    .map(
      (name) =>
        `${name} — ERA/WHIP/K9 not available in current feed. Reason from prop lines only.`,
    );
  if (!lines.length) {
    return "Probable pitcher ERA/WHIP/K9 are not available in the current feed for today's slate. Reason from listed prop lines only.";
  }
  return lines.join("\n");
}

function buildMlbSeasonContextForBoard({ gamesForPitcherText, propLines }) {
  const base = getMlbSeasonContext();
  const props20 = Array.isArray(propLines) ? propLines.slice(0, 20) : [];
  return {
    ...base,
    urTakePropLines: props20,
    mlbPitcherStatsText: buildMlbPitcherStatsText(gamesForPitcherText || []),
  };
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
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}

// ── Fetch games with probable pitchers from ESPN ──────────────────────────────
function firstString(values = []) {
  for (const v of values) {
    const s = typeof v === "string" ? v.trim() : "";
    if (s) return s;
  }
  return null;
}

function extractPitcherFromCompetitor(competitor) {
  if (!competitor || typeof competitor !== "object") return null;
  return firstString([
    competitor?.probablePitcher?.athlete?.shortName,
    competitor?.probablePitcher?.athlete?.displayName,
    competitor?.probablePitcher?.displayName,
    competitor?.startingPitcher?.athlete?.shortName,
    competitor?.startingPitcher?.athlete?.displayName,
    competitor?.startingPitcher?.displayName,
    competitor?.starter?.athlete?.shortName,
    competitor?.starter?.athlete?.displayName,
    competitor?.pitcher?.athlete?.shortName,
    competitor?.pitcher?.athlete?.displayName,
    competitor?.pitcher?.displayName,
  ]);
}

function extractLivePitcherHint(comp, event, homeAway) {
  const sideKey = homeAway === "home" ? "home" : "away";
  return firstString([
    comp?.situation?.[`${sideKey}Pitcher`]?.athlete?.shortName,
    comp?.situation?.[`${sideKey}Pitcher`]?.athlete?.displayName,
    comp?.situation?.[`${sideKey}Pitcher`]?.displayName,
    event?.situation?.[`${sideKey}Pitcher`]?.athlete?.shortName,
    event?.situation?.[`${sideKey}Pitcher`]?.athlete?.displayName,
    event?.situation?.[`${sideKey}Pitcher`]?.displayName,
  ]);
}

async function getMlbGamesWithPitchers() {
  const cacheKey = "mlb_games";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const bdlKey = getEnv("BALLDONTLIE_API_KEY");
  if (bdlKey) {
    const bundle = await getMlbBdlSlateBundle(bdlKey);
    if (bundle?.todayGames?.length) {
      const enriched = bundle.todayGames.map((g) =>
        enrichGameWithParkFactors({
          ...g,
          park: g.park || getParkForGame(g.homeTeam?.name || ""),
        }),
      );
      if (enriched.length > 0) setCached(cacheKey, enriched, 3 * 60 * 1000);
      return enriched;
    }
  }

  try {
    const todayYmd = etDateStringToEspnYmd(getTodayEtDateString());
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${encodeURIComponent(todayYmd)}`,
      { cache: "no-store" },
    );
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

        // Extract probable pitchers from probables array, then fallback competitor fields.
        const probables = comp?.probables || [];
        let homePitcher = probables.find(p => p.homeAway === "home")?.athlete?.shortName || null;
        let awayPitcher = probables.find(p => p.homeAway === "away")?.athlete?.shortName || null;
        if (!homePitcher) homePitcher = extractPitcherFromCompetitor(home);
        if (!awayPitcher) awayPitcher = extractPitcherFromCompetitor(away);

        // Live fallback hint: some ESPN payloads expose current pitcher under situation.
        if (isLive && !homePitcher) homePitcher = extractLivePitcherHint(comp, e, "home");
        if (isLive && !awayPitcher) awayPitcher = extractLivePitcherHint(comp, e, "away");

        // Park factor for home team
        const homeTeamFull = home?.team?.displayName || home?.team?.name || "";
        const parkInfo = getParkForGame(homeTeamFull);
        const { parkFactor, parkNote } = parkFactorFieldsFromHomeTeam(homeTeamFull);

        return {
          id:       e.id,
          status:   isFinal ? "Final" : isLive ? (status?.detail || "Live") : gameTime,
          state:    isFinal ? "post" : isLive ? "in" : "pre",
          date: e.date || null,
          startTimeUtc: e.date || null,
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
          parkFactor,
          parkNote,
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

async function getMlbTomorrowGamesWithPitchers() {
  const cacheKey = "mlb_games_tomorrow";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const bdlKey = getEnv("BALLDONTLIE_API_KEY");
  if (bdlKey) {
    const bundle = await getMlbBdlSlateBundle(bdlKey);
    if (bundle?.tomorrowGames?.length) {
      const enriched = bundle.tomorrowGames.map((g) =>
        enrichGameWithParkFactors({
          ...g,
          park: g.park || getParkForGame(g.homeTeam?.name || ""),
        }),
      );
      if (enriched.length > 0) setCached(cacheKey, enriched, 15 * 60 * 1000);
      return enriched;
    }
  }

  try {
    const tomorrowStr = getTomorrowEtDateString();
    const tomorrowYmd = etDateStringToEspnYmd(tomorrowStr);
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${tomorrowYmd}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    const events = data?.events || [];

    const games = events
      .filter((e) => {
        const gET = new Date(new Date(e.date).toLocaleString("en-US", { timeZone: "America/New_York" }));
        const gStr = `${gET.getFullYear()}-${String(gET.getMonth() + 1).padStart(2, "0")}-${String(gET.getDate()).padStart(2, "0")}`;
        return gStr === tomorrowStr;
      })
      .map((e) => {
        const comp = e.competitions?.[0];
        const home = comp?.competitors?.find((c) => c.homeAway === "home");
        const away = comp?.competitors?.find((c) => c.homeAway === "away");
        const status = e.status?.type;
        const isLive = status?.state === "in";
        const isFinal = status?.state === "post";
        const gameTime = e.date
          ? new Date(e.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET"
          : "TBD";

        const probables = comp?.probables || [];
        let homePitcher = probables.find((p) => p.homeAway === "home")?.athlete?.shortName || null;
        let awayPitcher = probables.find((p) => p.homeAway === "away")?.athlete?.shortName || null;
        if (!homePitcher) homePitcher = extractPitcherFromCompetitor(home);
        if (!awayPitcher) awayPitcher = extractPitcherFromCompetitor(away);
        if (isLive && !homePitcher) homePitcher = extractLivePitcherHint(comp, e, "home");
        if (isLive && !awayPitcher) awayPitcher = extractLivePitcherHint(comp, e, "away");

        const homeTeamFull = home?.team?.displayName || home?.team?.name || "";
        const { parkFactor, parkNote } = parkFactorFieldsFromHomeTeam(homeTeamFull);
        return {
          id: e.id,
          status: isFinal ? "Final" : isLive ? status?.detail || "Live" : gameTime,
          state: isFinal ? "post" : isLive ? "in" : "pre",
          date: e.date || null,
          startTimeUtc: e.date || null,
          inning: isLive ? e.status?.period : null,
          homeTeam: {
            name: homeTeamFull,
            abbr: getTeamAbbr(homeTeamFull),
            score: (isFinal || isLive) ? parseInt(home?.score || "0", 10) : null,
            pitcher: homePitcher,
          },
          awayTeam: {
            name: away?.team?.displayName || away?.team?.name || "",
            abbr: getTeamAbbr(away?.team?.displayName || away?.team?.name || ""),
            score: (isFinal || isLive) ? parseInt(away?.score || "0", 10) : null,
            pitcher: awayPitcher,
          },
          park: getParkForGame(homeTeamFull),
          parkFactor,
          parkNote,
          venue: comp?.venue?.fullName || "",
        };
      });

    if (games.length > 0) setCached(cacheKey, games, 15 * 60 * 1000);
    return games;
  } catch (err) {
    console.warn("MLB ESPN tomorrow games error:", err.message);
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
      logOddsUnavailable(eventsRes.status, "mlb events");
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
        if (!propRes.ok) {
          logOddsUnavailable(propRes.status, "mlb props");
          continue;
        }
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
    if (!res.ok) {
      logOddsUnavailable(res.status, "mlb totals");
      return {};
    }
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

  const ODDS_KEY = getEnv("ODDS_API_KEY");
  const view = String(req.query.view || "board").toLowerCase();

  try {
    if (view === "games") {
      let games = await getMlbGamesWithPitchers();
      if (!games.length) {
        const rec = await recoverLastKnownHomeMlbGames();
        if (rec?.games?.length) games = rec.games;
      }
      return res.status(200).json(games);
    }

    if (view === "board") {
      const boardCached = getCached("mlb_board_v4");
      if (boardCached) {
        let out = boardCached;
        const cachedGames = Array.isArray(out.games) ? out.games : [];
        if (cachedGames.length === 0) {
          const rec = await recoverLastKnownHomeMlbGames();
          if (rec?.games?.length) {
            const gamesWithPark = rec.games.map((g) =>
              enrichGameWithParkFactors({
                ...g,
                park: g.park || getParkForGame(g.homeTeam?.name || ""),
              }),
            );
            out = {
              ...out,
              games: gamesWithPark,
              slateRecovery: { fromLastKnownKv: true, lastUpdated: rec.lastUpdated },
              fetchedAt: new Date().toISOString(),
            };
          }
        }
        return res.status(200).json(out);
      }

      let games = await getMlbGamesWithPitchers();
      let slateRecovery = null;
      if (games.length > 0) {
        await persistLastKnownHomeMlbGames(games);
      } else {
        const rec = await recoverLastKnownHomeMlbGames();
        if (rec?.games?.length) {
          games = rec.games;
          slateRecovery = { fromLastKnownKv: true, lastUpdated: rec.lastUpdated };
        }
      }

      const [tomorrowGamesRaw, propLinesOdds, gameTotalsOdds] = await Promise.all([
        getMlbTomorrowGamesWithPitchers(),
        getMlbPropLines(ODDS_KEY),
        getMlbGameTotals(ODDS_KEY),
      ]);

      // Enrich games with park factor index + model-facing notes
      const gamesWithPark = games.map((g) =>
        enrichGameWithParkFactors({
          ...g,
          park: g.park || getParkForGame(g.homeTeam?.name || ""),
        }),
      );
      const tomorrowGames = tomorrowGamesRaw.map((g) =>
        enrichGameWithParkFactors({
          ...g,
          park: g.park || getParkForGame(g.homeTeam?.name || ""),
        }),
      );

      let propLines = propLinesOdds;
      let gameTotals = gameTotalsOdds;
      let injuries = [];

      const BDL_KEY = getEnv("BALLDONTLIE_API_KEY");
      const slateFromBdl = gamesWithPark.some((g) => g.source === "balldontlie_mlb");
      if (BDL_KEY && slateFromBdl && gamesWithPark.length > 0) {
        const bundle = await getMlbBdlSlateBundle(BDL_KEY);
        const teamIds = bundle?.teamIds || [];
        const [bdlProps, bdlTotals, bdlInj] = await Promise.all([
          fetchBdlMlbPlayerPropsForSlate(BDL_KEY, gamesWithPark),
          fetchBdlMlbGameTotalsMap(BDL_KEY, getTodayEtDateString(), gamesWithPark),
          teamIds.length ? fetchBdlMlbInjuriesForTeamIds(BDL_KEY, teamIds) : Promise.resolve([]),
        ]);
        if (bdlProps.length > 0) propLines = bdlProps;
        if (Object.keys(bdlTotals).length > 0) gameTotals = bdlTotals;
        injuries = Array.isArray(bdlInj) ? bdlInj : [];
        console.log(
          JSON.stringify({
            event: "mlb_board_bdl",
            slateFromBdl: true,
            games: gamesWithPark.length,
            bdlProps: bdlProps.length,
            bdlTotals: Object.keys(bdlTotals || {}).length,
            injuries: injuries.length,
          }),
        );
      }

      const board = {
        seasonContext: buildMlbSeasonContextForBoard({
          gamesForPitcherText: gamesWithPark,
          propLines,
        }),
        games: gamesWithPark,
        tomorrowGames,
        propLines: propLines.slice(0, 100),
        gameTotals,
        injuries,
        primarySource: slateFromBdl ? "balldontlie_mlb" : "espn",
        parkFactors: PARK_FACTORS,
        fetchedAt: new Date().toISOString(),
        slateRecovery,
      };

      if (games.length > 0 || propLines.length > 0) {
        setCached("mlb_board_v4", board, 4 * 60 * 1000);
      }

      return res.status(200).json(board);
    }

    return res.status(400).json({ error:"Invalid view", allowed:["board","games"] });
  } catch (err) {
    console.error("MLB API error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
