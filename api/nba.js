import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";

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

function getNbaSeasonContext() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const season = 2025;

  /** Playoff window: treat tone as postseason (series, home court) — Apr 14–Jun 19. */
  if ((month === 4 && day >= 14) || month === 5 || (month === 6 && day <= 19)) {
    return { phase: "playoffs", postseason: true, season };
  }

  if (month >= 10 || month === 1) return { phase: "Regular Season (early)", season, postseason: false };
  if (month === 2 || (month === 3 && day < 10)) return { phase: "Regular Season (mid)", season, postseason: false };
  if ((month === 3 && day >= 10) || (month === 4 && day < 14)) return { phase: "Regular Season — final stretch", season, postseason: false };
  if (month === 6 && day > 19) return { phase: "NBA Finals", season, postseason: true };
  return { phase: "NBA Offseason", season, postseason: false };
}

function getTodayEtDateString() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}
function getTomorrowEtDateString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}
function toEtDateString(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}

function normalizeTeamAbbr(name) {
  const map = {
    "Atlanta Hawks":"ATL","Boston Celtics":"BOS","Brooklyn Nets":"BKN","Charlotte Hornets":"CHA",
    "Chicago Bulls":"CHI","Cleveland Cavaliers":"CLE","Dallas Mavericks":"DAL","Denver Nuggets":"DEN",
    "Detroit Pistons":"DET","Golden State Warriors":"GSW","Houston Rockets":"HOU","Indiana Pacers":"IND",
    "LA Clippers":"LAC","Los Angeles Clippers":"LAC","Los Angeles Lakers":"LAL","Memphis Grizzlies":"MEM",
    "Miami Heat":"MIA","Milwaukee Bucks":"MIL","Minnesota Timberwolves":"MIN","New Orleans Pelicans":"NOP",
    "New York Knicks":"NYK","Oklahoma City Thunder":"OKC","Orlando Magic":"ORL","Philadelphia 76ers":"PHI",
    "Phoenix Suns":"PHX","Portland Trail Blazers":"POR","Sacramento Kings":"SAC","San Antonio Spurs":"SAS",
    "Toronto Raptors":"TOR","Utah Jazz":"UTA","Washington Wizards":"WAS",
  };
  if (!name) return "UNK";
  return map[name] || name.split(" ").pop().slice(0, 3).toUpperCase();
}

function formatNbaStartTimeEt(isoDate) {
  if (!isoDate) return "TBD";
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return "TBD";
    return (
      d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      }) + " ET"
    );
  } catch {
    return "TBD";
  }
}

/** Map a BallDontLie /games row to the same shape as Odds API games (UI + prompts). */
function mapBdlGameRowToAppGame(g) {
  const home = g.home_team || g.homeTeam;
  const away = g.visitor_team || g.visitorTeam;
  const homeName = home?.full_name || home?.name || "";
  const awayName = away?.full_name || away?.name || "";
  const homeAbbr = home?.abbreviation || (home?.full_name ? normalizeTeamAbbr(home.full_name) : "?");
  const awayAbbr = away?.abbreviation || (away?.full_name ? normalizeTeamAbbr(away.full_name) : "?");

  const hs = g.home_team_score != null ? Number(g.home_team_score) : null;
  const vs = g.visitor_team_score != null ? Number(g.visitor_team_score) : null;
  const stRaw = String(g.status || "").trim();
  const stLower = stRaw.toLowerCase();
  const period = Number(g.period) || 0;

  let state;
  let status;
  let statusCode;

  if (stLower === "final") {
    state = "post";
    status = "Final";
    statusCode = 3;
  } else if (period > 0 && stLower !== "final") {
    state = "in";
    status = stRaw || "Live";
    statusCode = 2;
  } else {
    state = "pre";
    status = /qtr|half|ot/i.test(stRaw) ? stRaw : formatNbaStartTimeEt(g.date) || stRaw || "TBD";
    statusCode = 1;
  }

  const periodNum = Number(g.period);
  const clockRaw = g.time != null ? String(g.time).trim() : "";

  return {
    id: g.id,
    status,
    state,
    statusCode,
    period: Number.isFinite(periodNum) ? periodNum : null,
    clock: clockRaw || null,
    homeTeam: {
      name: homeName,
      abbr: homeAbbr,
      score: Number.isFinite(hs) ? hs : null,
    },
    awayTeam: {
      name: awayName,
      abbr: awayAbbr,
      score: Number.isFinite(vs) ? vs : null,
    },
    postseason: !!g.postseason,
  };
}

/** Box score numbers present on the board row (server-trust gate for live/halftime reads). */
export function nbaGameHasVerifiedBoxScore(game) {
  if (!game || typeof game !== "object") return false;
  const hs = game.homeTeam?.score;
  const vs = game.awayTeam?.score;
  if (hs == null || vs == null) return false;
  return Number.isFinite(Number(hs)) && Number.isFinite(Number(vs));
}

/**
 * Classify game phase from API-shaped rows only (no inference from user text).
 * Returns: pregame | live | halftime | final | unknown
 */
export function classifyNbaBoardGamePhase(game) {
  if (!game || typeof game !== "object") return "unknown";
  const state = String(game.state || "").toLowerCase();
  const statusRaw = String(game.status || "");
  const statusLower = statusRaw.toLowerCase();

  if (state === "post" || statusLower.includes("final")) return "final";

  if (state === "pre") return "pregame";

  if (state === "in") {
    if (!nbaGameHasVerifiedBoxScore(game)) return "unknown";

    if (/\bhalftime\b/i.test(statusRaw) || /\bhalf\s*time\b/i.test(statusLower)) {
      return "halftime";
    }

    const period = Number(game.period);
    if (Number.isFinite(period) && period >= 1) {
      return "live";
    }

    // Odds live rows may omit period but still carry scores while state is "in"
    return "live";
  }

  return "unknown";
}

/** Odds API only — used when BDL returns no rows or is unavailable. */
async function getTodaysGamesFromOddsApi(oddsKey, todayET, tomorrowET) {
  if (!oddsKey) return [];
  try {
    const url = `https://api.the-odds-api.com/v4/sports/basketball_nba/scores/?apiKey=${oddsKey}&daysFrom=2`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    let games = data
      .filter(
        (g) =>
          toEtDateString(g.commence_time) === todayET ||
          toEtDateString(g.commence_time) === tomorrowET ||
          (!g.completed && Array.isArray(g.scores) && g.scores.length > 0),
      )
      .map((g) => {
        const scores = g.scores || [];
        const homePts = scores.find((s) => s.name === g.home_team)?.score;
        const awayPts = scores.find((s) => s.name === g.away_team)?.score;
        const isLive = !g.completed && scores.length > 0;
        const isFinal = g.completed;
        const gameTime =
          new Date(g.commence_time).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "America/New_York",
          }) + " ET";
        return {
          id: g.id,
          status: isFinal ? "Final" : isLive ? "Live" : gameTime,
          state: isFinal ? "post" : isLive ? "in" : "pre",
          statusCode: isFinal ? 3 : isLive ? 2 : 1,
          period: null,
          clock: null,
          homeTeam: {
            name: g.home_team,
            abbr: normalizeTeamAbbr(g.home_team),
            score: homePts != null ? parseInt(homePts, 10) : null,
          },
          awayTeam: {
            name: g.away_team,
            abbr: normalizeTeamAbbr(g.away_team),
            score: awayPts != null ? parseInt(awayPts, 10) : null,
          },
        };
      });

    if (games.length === 0) {
      try {
        const oddsRes = await fetch(
          `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${oddsKey}&regions=us&markets=h2h&oddsFormat=american`,
        );
        if (oddsRes.ok) {
          const oddsData = await oddsRes.json();
          if (Array.isArray(oddsData)) {
            games = oddsData
              .filter((g) => {
                const et = toEtDateString(g.commence_time);
                return et === todayET || et === tomorrowET;
              })
              .map((g) => ({
                id: g.id,
                status:
                  new Date(g.commence_time).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "America/New_York",
                  }) + " ET",
                state: "pre",
                statusCode: 1,
                period: null,
                clock: null,
                homeTeam: {
                  name: g.home_team,
                  abbr: normalizeTeamAbbr(g.home_team),
                  score: null,
                },
                awayTeam: {
                  name: g.away_team,
                  abbr: normalizeTeamAbbr(g.away_team),
                  score: null,
                },
              }));
          }
        }
      } catch {
        /* odds merge optional */
      }
    }

    return games;
  } catch (err) {
    console.error("getTodaysGamesFromOddsApi error:", err.message);
    return [];
  }
}

const GAMES_TODAY_CACHE_KEY = "games_today_bdl_primary";

/**
 * Primary: BallDontLie games for today (ET). Fallback: Odds API scores → odds list.
 * Returns { games, slateMeta } for prompts when the slate is empty but BDL responded OK.
 */
async function getTodaysGames(oddsKey, bdlKey) {
  const cached = getCached(GAMES_TODAY_CACHE_KEY);
  if (cached) {
    if (Array.isArray(cached)) {
      return {
        games: cached,
        slateMeta: {
          primarySource: "odds",
          bdlQueriedOk: false,
          bdlGameCount: 0,
          etDate: getTodayEtDateString(),
          note: null,
        },
      };
    }
    if (cached.games && cached.slateMeta) return cached;
  }

  const todayET = getTodayEtDateString();
  const tomorrowET = getTomorrowEtDateString();
  const slateMeta = {
    primarySource: "none",
    bdlQueriedOk: false,
    bdlGameCount: 0,
    etDate: todayET,
    etDateWindow: [todayET, tomorrowET],
    note: null,
  };

  if (bdlKey) {
    try {
      const [todayRows, tomorrowRows] = await Promise.all([
        fetchBdlGamesForDate(bdlKey, todayET),
        fetchBdlGamesForDate(bdlKey, tomorrowET),
      ]);
      const bdlRows = [...todayRows, ...tomorrowRows];
      const byId = new Map();
      for (const row of bdlRows) {
        const id = row?.id ?? `${row?.date || ""}_${row?.home_team?.id || ""}_${row?.visitor_team?.id || ""}`;
        if (!byId.has(id)) byId.set(id, row);
      }
      const mergedRows = [...byId.values()];
      slateMeta.bdlQueriedOk = true;
      slateMeta.bdlGameCount = mergedRows.length;
      if (mergedRows.length > 0) {
        const games = mergedRows.map(mapBdlGameRowToAppGame);
        slateMeta.primarySource = "bdl";
        const payload = { games, slateMeta };
        setCached(GAMES_TODAY_CACHE_KEY, payload);
        return payload;
      }
    } catch (err) {
      console.warn("BDL games fetch failed, falling back to Odds API:", err.message);
      slateMeta.bdlQueriedOk = false;
    }
  }

  const games = await getTodaysGamesFromOddsApi(oddsKey, todayET, tomorrowET);
  if (games.length > 0) {
    slateMeta.primarySource = "odds";
    const payload = { games, slateMeta };
    setCached(GAMES_TODAY_CACHE_KEY, payload);
    return payload;
  }

  slateMeta.primarySource = slateMeta.bdlQueriedOk ? "bdl" : "none";
  if (slateMeta.bdlQueriedOk && slateMeta.bdlGameCount === 0) {
    slateMeta.note = `BallDontLie returned no games for ${todayET} (ET).`;
    if (oddsKey) slateMeta.note += " Odds API also returned no slate for today.";
    else slateMeta.note += " Odds API was not queried (no key).";
  } else if (!bdlKey) {
    slateMeta.note = "No BallDontLie API key; Odds API returned no games for today.";
  } else if (!slateMeta.bdlQueriedOk) {
    slateMeta.note = "BallDontLie games request failed; Odds API returned no games for today.";
  } else {
    slateMeta.note = "No games returned for today.";
  }

  const payload = { games: [], slateMeta };
  setCached(GAMES_TODAY_CACHE_KEY, payload);
  return payload;
}

const DEFAULT_NBA_PROP_FETCH_OPTIONS = {
  priorityAbbrevs: [],
  maxEvents: 18,
};

function scoreNbaEventBoost(event, boostSet) {
  if (!boostSet.size) return 0;
  const away = String(normalizeTeamAbbr(event.away_team) || "").toUpperCase();
  const home = String(normalizeTeamAbbr(event.home_team) || "").toUpperCase();
  let s = 0;
  if (away && away !== "UNK" && boostSet.has(away)) s++;
  if (home && home !== "UNK" && boostSet.has(home)) s++;
  return s;
}

/**
 * Pull NBA player props from The Odds API (per-event markets).
 * @returns {{ propLines: object[], feedMeta: object }}
 */
async function getNbaPropLines(oddsKey, options = {}) {
  const { priorityAbbrevs = [], maxEvents = DEFAULT_NBA_PROP_FETCH_OPTIONS.maxEvents } = {
    ...DEFAULT_NBA_PROP_FETCH_OPTIONS,
    ...options,
  };
  const boostSorted = [...priorityAbbrevs].map((a) => String(a || "").toUpperCase()).sort().join(",");
  const cacheKey = `nba_props_v4_${maxEvents}_${boostSorted}`;
  const boostSet = new Set(
    priorityAbbrevs.map((a) => String(a || "").toUpperCase()).filter(Boolean),
  );

  const logFeed = (feedMeta) =>
    console.log(
      JSON.stringify({
        event: "nba_props_feed",
        oddsKeyPresent: Boolean(oddsKey),
        maxEvents,
        priorityBoost: boostSorted || null,
        ...feedMeta,
      }),
    );

  const fail = (feedMeta) => {
    logFeed(feedMeta);
    return { propLines: [], feedMeta };
  };

  if (!oddsKey) {
    return fail({
      emptyReason: "missing_key",
      eventsFetchOk: false,
      eventsFetchStatus: null,
      matchingEventCount: 0,
      eventsProcessed: 0,
      propsIngestionRows: 0,
      propFetchFailures: 0,
      missingPreferredBookmaker: 0,
    });
  }

  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const eventsRes = await fetch(
      `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${oddsKey}&regions=us&markets=h2h&oddsFormat=american`,
    );
    const eventsFetchOk = eventsRes.ok;
    const eventsFetchStatus = eventsRes.status;

    if (!eventsFetchOk) {
      const out = fail({
        emptyReason: "events_fetch_failed",
        eventsFetchOk: false,
        eventsFetchStatus,
        matchingEventCount: 0,
        eventsProcessed: 0,
        propsIngestionRows: 0,
        propFetchFailures: 0,
        missingPreferredBookmaker: 0,
      });
      return out;
    }

    const events = await eventsRes.json();
    if (!Array.isArray(events) || !events.length) {
      return fail({
        emptyReason: "zero_events_payload",
        eventsFetchOk: true,
        eventsFetchStatus,
        matchingEventCount: 0,
        eventsProcessed: 0,
        propsIngestionRows: 0,
        propFetchFailures: 0,
        missingPreferredBookmaker: 0,
      });
    }

    const todayET = getTodayEtDateString();
    const tomorrowET = getTomorrowEtDateString();

    console.log(
      JSON.stringify({
        event: "nba_props_events",
        oddsKeyPresent: !!oddsKey,
        maxEvents,
        priorityBoost: boostSorted || null,
        eventsFound: events.length,
        todayET,
        tomorrowET,
        eventDates: events.slice(0, 8).map((e) => ({
          id: e.id,
          home: e.home_team,
          away: e.away_team,
          commence_et: toEtDateString(e.commence_time),
          passes:
            toEtDateString(e.commence_time) === todayET ||
            toEtDateString(e.commence_time) === tomorrowET,
        })),
      }),
    );

    const propMarkets =
      "player_points,player_rebounds,player_assists,player_points_rebounds_assists";
    const propLines = [];

    const etFiltered = events.filter((e) => {
      const d = toEtDateString(e.commence_time);
      return d === todayET || d === tomorrowET;
    });

    const prioritized = [...etFiltered].sort((a, b) => {
      const sb = scoreNbaEventBoost(b, boostSet);
      const sa = scoreNbaEventBoost(a, boostSet);
      if (sb !== sa) return sb - sa;
      const ta = new Date(a.commence_time || 0).getTime();
      const tb = new Date(b.commence_time || 0).getTime();
      return ta - tb;
    });

    const targetEvents = prioritized.slice(0, Math.max(1, Math.min(maxEvents, 40)));

    console.log(
      JSON.stringify({
        event: "nba_props_filtered",
        matchingEventCount: etFiltered.length,
        prioritizedSample: targetEvents.slice(0, 4).map((e) => ({
          id: e.id,
          away: e.away_team,
          home: e.home_team,
          boost: scoreNbaEventBoost(e, boostSet),
        })),
        targetEventCount: targetEvents.length,
      }),
    );

    let propFetchFailures = 0;
    let missingPreferredBookmaker = 0;

    for (const event of targetEvents) {
      try {
        const propRes = await fetch(
          `https://api.the-odds-api.com/v4/sports/basketball_nba/events/${event.id}/odds?apiKey=${oddsKey}&regions=us&markets=${propMarkets}&oddsFormat=american`,
        );
        const propData = propRes.ok ? await propRes.json() : {};
        const bookmakers = propData.bookmakers || [];
        const preferred =
          bookmakers.find((b) => ["draftkings", "fanduel", "betmgm"].includes(b.key)) ||
          bookmakers[0];

        if (!propRes.ok) {
          propFetchFailures++;
          continue;
        }
        if (!preferred) {
          missingPreferredBookmaker++;
          continue;
        }

        console.log(
          JSON.stringify({
            event: "nba_props_per_event",
            eventId: event.id,
            home: event.home_team,
            away: event.away_team,
            propResOk: propRes.ok,
            propResStatus: propRes.status,
            bookmakerCount: bookmakers.length,
            preferredKey: preferred?.key || "none",
            marketCount: preferred?.markets?.length || 0,
          }),
        );

        const awayAbbr = normalizeTeamAbbr(event.away_team);
        const homeAbbr = normalizeTeamAbbr(event.home_team);
        for (const market of preferred.markets || []) {
          for (const outcome of market.outcomes || []) {
            propLines.push({
              game: `${event.away_team} @ ${event.home_team}`,
              awayAbbr,
              homeAbbr,
              eventCompleted: Boolean(event.completed),
              player: outcome.description || outcome.name,
              prop: market.key.replace("player_", "").replace(/_/g, " "),
              line: outcome.point,
              side: outcome.name,
              odds: outcome.price,
              book: preferred.key,
              eventId: event.id,
            });
          }
        }
      } catch {
        propFetchFailures++;
        continue;
      }
    }

    const propsIngestionRows = propLines.length;
    let emptyReason = null;
    if (propsIngestionRows === 0) {
      if (etFiltered.length === 0) emptyReason = "zero_matching_events";
      else emptyReason = "zero_props_returned";
    }

    const feedMeta = {
      emptyReason,
      eventsFetchOk: true,
      eventsFetchStatus,
      matchingEventCount: etFiltered.length,
      eventsProcessed: targetEvents.length,
      propsIngestionRows,
      propFetchFailures,
      missingPreferredBookmaker,
    };

    logFeed(feedMeta);

    console.log(
      JSON.stringify({
        event: "nba_props_complete",
        totalPropsReturned: propLines.length,
        sampleProps: propLines.slice(0, 3).map((p) => ({
          player: p.player,
          prop: p.prop,
          line: p.line,
          game: p.game,
        })),
      }),
    );

    const result = { propLines, feedMeta };

    if (propLines.length > 0) {
      setCached(cacheKey, result);
    }
    return result;
  } catch (err) {
    console.error("NBA props error:", err.message);
    const fm = {
      emptyReason: "exception",
      eventsFetchOk: false,
      eventsFetchStatus: null,
      matchingEventCount: 0,
      eventsProcessed: 0,
      propsIngestionRows: 0,
      propFetchFailures: 0,
      missingPreferredBookmaker: 0,
    };
    logFeed(fm);
    return { propLines: [], feedMeta: fm };
  }
}

function normalizeNbaGameLabel(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function gameLabelFromAppGame(g) {
  const a = String(g.awayTeam?.name || "").trim();
  const h = String(g.homeTeam?.name || "").trim();
  if (!a || !h) return "";
  return normalizeNbaGameLabel(`${a} @ ${h}`);
}

/**
 * Remove player props for games that are already over so prompts don't treat
 * finished slates as "tonight." Uses Odds `event.completed` when present and
 * BallDontLie / Odds slate rows with state === "post".
 */
function filterPropLinesForActiveSlate(propLines, todaysGames) {
  const finalAbbrPairs = new Set();
  const finalLabels = new Set();
  for (const g of todaysGames || []) {
    if (g.state !== "post") continue;
    const aa = String(g.awayTeam?.abbr || "").toUpperCase();
    const ha = String(g.homeTeam?.abbr || "").toUpperCase();
    if (aa && ha && aa !== "?" && ha !== "?") {
      finalAbbrPairs.add(`${aa}@${ha}`);
    }
    const lbl = gameLabelFromAppGame(g);
    if (lbl) finalLabels.add(lbl);
  }

  return (propLines || []).filter((pl) => {
    if (pl.eventCompleted) return false;
    const aa = String(pl.awayAbbr || "").toUpperCase();
    const ha = String(pl.homeAbbr || "").toUpperCase();
    if (aa && ha && finalAbbrPairs.has(`${aa}@${ha}`)) return false;
    const lbl = normalizeNbaGameLabel(pl.game);
    if (lbl && finalLabels.has(lbl)) return false;
    return true;
  });
}

/** Odds API prop lines list which game each player is priced for — merge with BDL game rows. */
function attachTonightGamesFromProps(playerStats, propLines) {
  const gameByPlayer = {};
  for (const pl of propLines || []) {
    const k = String(pl.player || "")
      .trim()
      .toLowerCase();
    if (!k || !pl.game) continue;
    if (!gameByPlayer[k]) gameByPlayer[k] = pl.game;
  }
  return (playerStats || []).map((p) => {
    const k = String(p.name || "")
      .trim()
      .toLowerCase();
    const tonightGame = gameByPlayer[k];
    return tonightGame ? { ...p, tonightGame } : { ...p };
  });
}

const ROSTER_GROUNDING_MAX_NAMES_PER_TEAM = 45;

function parseTonightGameAbbrs(tonightGame) {
  const s = String(tonightGame || "").trim();
  const m = s.match(/^([A-Z0-9]{2,4})\s*@\s*([A-Z0-9]{2,4})$/i);
  if (!m) return null;
  const away = m[1].toUpperCase();
  const home = m[2].toUpperCase();
  if (!away || !home || away === "?" || home === "?") return null;
  return { away, home };
}

function collectTonightTeamAbbrevs(todaysGames) {
  const set = new Set();
  for (const g of todaysGames || []) {
    const aa = String(g?.awayTeam?.abbr || "").toUpperCase();
    const ha = String(g?.homeTeam?.abbr || "").toUpperCase();
    if (aa && aa !== "?") set.add(aa);
    if (ha && ha !== "?") set.add(ha);
  }
  return set;
}

function buildBdlGroundingEnvelope({ playerStats, todaysGames, injuries }) {
  // Authoritative NBA roster grounding contract: BDL-only truth for player/team/slate/availability.
  const bdlSlateTeams = [...collectTonightTeamAbbrevs(todaysGames)].sort();
  const slateTeamSet = new Set(bdlSlateTeams);
  const bdlAvailability = {};
  for (const row of injuries || []) {
    const name = String(row?.player || "").trim();
    const team = String(row?.team || "").toUpperCase();
    if (!name || !team || !slateTeamSet.has(team)) continue;
    bdlAvailability[name] = {
      team,
      status: String(row?.status || "").trim() || "unknown",
      detail: String(row?.detail || "").trim() || "",
      source: "bdl",
    };
  }

  const bdlGroundedPlayers = {};
  for (const row of playerStats || []) {
    const name = String(row?.name || "").trim();
    const team = String(row?.team || "").toUpperCase();
    if (!name || !team || team === "UNK") continue;
    const tg = parseTonightGameAbbrs(row?.tonightGame);
    const onSlate =
      slateTeamSet.has(team) ||
      (tg && slateTeamSet.has(tg.away) && slateTeamSet.has(tg.home) && (team === tg.away || team === tg.home));
    if (!onSlate) continue;
    const avail = bdlAvailability[name];
    bdlGroundedPlayers[name] = {
      team,
      onSlate: true,
      availability: avail
        ? {
            status: avail.status,
            detail: avail.detail,
          }
        : null,
    };
  }

  for (const [name, meta] of Object.entries(bdlAvailability)) {
    if (bdlGroundedPlayers[name]) continue;
    bdlGroundedPlayers[name] = {
      team: meta.team,
      onSlate: true,
      availability: {
        status: meta.status,
        detail: meta.detail,
      },
    };
  }

  return {
    bdlGroundedPlayers,
    bdlSlateTeams,
    bdlAvailability,
  };
}

/**
 * Per-team player names derived only from BDL payloads.
 * UR Take uses this to block hallucinated teammate pairings — never trust static training rosters.
 */
function buildNbaRosterGrounding(playerStats, propLines, injuries, statsSource, todaysGames) {
  const playersByTeamAbbrev = {};
  const tonightTeams = collectTonightTeamAbbrevs(todaysGames);

  const add = (abbr, name) => {
    const a = String(abbr || "").toUpperCase();
    const n = String(name || "").trim();
    if (!a || a === "UNK" || !n) return;
    if (!playersByTeamAbbrev[a]) playersByTeamAbbrev[a] = [];
    const list = playersByTeamAbbrev[a];
    if (!list.includes(n) && list.length < ROSTER_GROUNDING_MAX_NAMES_PER_TEAM) list.push(n);
  };

  for (const p of playerStats || []) {
    const name = String(p?.name || "").trim();
    if (!name || !p?.team) continue;

    const tg = parseTonightGameAbbrs(p.tonightGame);
    if (tg) {
      const tu = String(p.team || "").toUpperCase();
      const resolved = tu === tg.away || tu === tg.home ? tu : "";
      if (resolved) add(resolved, name);
      continue;
    }

    if (statsSource === "game_box") {
      add(p.team, name);
    } else if (tonightTeams.size === 0 || tonightTeams.has(String(p.team || "").toUpperCase())) {
      add(p.team, name);
    }
  }

  /** Reconcile each slate game: tonightGame must match that game's away@home abbrs. */
  for (const g of todaysGames || []) {
    const away = String(g?.awayTeam?.abbr || "").toUpperCase();
    const home = String(g?.homeTeam?.abbr || "").toUpperCase();
    if (!away || !home || away === "?" || home === "?") continue;
    for (const p of playerStats || []) {
      const parsed = parseTonightGameAbbrs(p.tonightGame);
      if (!parsed || parsed.away !== away || parsed.home !== home) continue;
      const name = String(p?.name || "").trim();
      if (!name) continue;
      const tu = String(p.team || "").toUpperCase();
      if (tu === away || tu === home) {
        add(tu, name);
      }
    }
  }

  let rosterGroundingQuality;
  if (tonightTeams.size > 0) {
    let anyZero = false;
    let anyUnderFour = false;
    for (const abbr of tonightTeams) {
      const n = (playersByTeamAbbrev[abbr] || []).length;
      if (n === 0) anyZero = true;
      if (n < 4) anyUnderFour = true;
    }
    if (anyZero) {
      rosterGroundingQuality = "thin";
    } else if (anyUnderFour) {
      rosterGroundingQuality = "partial";
    } else {
      rosterGroundingQuality = "full";
    }
    console.log(`[nba] rosterGroundingQuality=${rosterGroundingQuality} (tonightTeams=${tonightTeams.size})`);
  }

  const trustNote =
    statsSource === "game_box"
      ? "Team keys in playersByTeamAbbrev come from today's game box scores — use for who played for which team in those games."
      : "statsSource is season_average — team keys may lag mid-season trades. Prefer tonightGame + props; never invent teammates.";

  return {
    playersByTeamAbbrev,
    trustNote,
    ...(rosterGroundingQuality ? { rosterGroundingQuality } : {}),
    rule:
      "Authoritative list is playersByTeamAbbrev (API + tonight slate). Follow UR Take ROSTER ENFORCEMENT block; never use training memory for player-team assignments.",
  };
}

function bdlHeaders(bdlKey) {
  return { Accept: "application/json", Authorization: bdlKey };
}

async function fetchBdlInjuries(bdlKey) {
  if (!bdlKey) return [];
  const bases = [
    "https://api.balldontlie.io/nba/v1/injuries",
    "https://api.balldontlie.io/v1/injuries",
  ];
  for (const base of bases) {
    try {
      const res = await fetch(`${base}?per_page=100`, { headers: bdlHeaders(bdlKey) });
      if (!res.ok) continue;
      const data = await res.json();
      const rows = Array.isArray(data?.data) ? data.data : [];
      if (!rows.length) continue;
      return rows
        .map((row) => {
          const playerObj = row?.player || row?.athlete || {};
          const teamObj = row?.team || playerObj?.team || {};
          const player =
            String(playerObj?.full_name || playerObj?.display_name || row?.player_name || "").trim();
          const team =
            String(teamObj?.abbreviation || normalizeTeamAbbr(teamObj?.full_name || teamObj?.name || "")).toUpperCase();
          const status = String(row?.status || row?.designation || row?.availability || "").trim();
          const detail = String(row?.description || row?.detail || "").trim();
          if (!player) return null;
          return { player, team, status, detail };
        })
        .filter(Boolean);
    } catch {
      // try fallback endpoint
    }
  }
  return [];
}

function abbrevFromTeamObj(t) {
  if (!t || typeof t !== "object") return "?";
  if (t.abbreviation) return t.abbreviation;
  if (t.full_name) return normalizeTeamAbbr(t.full_name);
  return "?";
}

/** Visitor @ Home using BDL game object (supports visitor_team/home_team naming). */
function matchupLabelFromGame(g) {
  if (!g) return "";
  const vis = g.visitor_team || g.visitorTeam;
  const hom = g.home_team || g.homeTeam;
  const va = abbrevFromTeamObj(vis);
  const ha = abbrevFromTeamObj(hom);
  return `${va} @ ${ha}`;
}

function buildGameLabelMap(games) {
  const m = new Map();
  for (const g of games || []) {
    if (g?.id != null) m.set(g.id, matchupLabelFromGame(g));
  }
  return m;
}

async function fetchJsonOrNull(url, bdlKey) {
  try {
    const res = await fetch(url, { headers: bdlHeaders(bdlKey) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Paginated BDL games for one calendar date (ET). Tries /nba/v1/games then /v1/games. */
async function fetchBdlGamesForDate(bdlKey, dateIso) {
  const bases = [
    "https://api.balldontlie.io/nba/v1/games",
    "https://api.balldontlie.io/v1/games",
  ];
  for (const base of bases) {
    const all = [];
    let cursor = null;
    let pages = 0;
    let firstOk = false;
    while (pages < 30) {
      const qs = new URLSearchParams();
      qs.append("dates[]", dateIso);
      qs.append("per_page", "100");
      if (cursor != null && cursor !== "") qs.append("cursor", String(cursor));
      const data = await fetchJsonOrNull(`${base}?${qs.toString()}`, bdlKey);
      if (!data || !Array.isArray(data.data)) break;
      firstOk = true;
      all.push(...data.data);
      const next = data.meta?.next_cursor;
      if (next == null || next === "" || data.data.length === 0) break;
      cursor = next;
      pages += 1;
    }
    if (firstOk) return all;
  }
  return [];
}

/** Paginated stats for a batch of game IDs. Tries /nba/v1/stats then /v1/stats. */
async function fetchBdlStatsForGameIds(bdlKey, gameIds) {
  if (!gameIds.length) return [];
  const bases = [
    "https://api.balldontlie.io/nba/v1/stats",
    "https://api.balldontlie.io/v1/stats",
  ];
  const chunkSize = 12;
  const out = [];
  for (let i = 0; i < gameIds.length; i += chunkSize) {
    const chunk = gameIds.slice(i, i + chunkSize);
    const idQs = chunk.map((id) => `game_ids[]=${encodeURIComponent(id)}`).join("&");
    for (const base of bases) {
      const rows = [];
      let cursor = null;
      let pages = 0;
      while (pages < 40) {
        let url = `${base}?${idQs}&per_page=100`;
        if (cursor != null && cursor !== "") url += `&cursor=${encodeURIComponent(cursor)}`;
        const data = await fetchJsonOrNull(url, bdlKey);
        if (!data || !Array.isArray(data.data)) break;
        rows.push(...data.data);
        const next = data.meta?.next_cursor;
        if (next == null || next === "" || data.data.length === 0) break;
        cursor = next;
        pages += 1;
      }
      if (rows.length > 0) {
        out.push(...rows);
        break;
      }
    }
  }
  return out;
}

function statRowsToPlayers(statRows, gameLabelMap) {
  const byPlayer = new Map();
  for (const row of statRows) {
    const p = row.player;
    if (!p?.id) continue;
    const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
    const team = row.team?.abbreviation || "UNK";
    const gid = row.game?.id;
    let tonightGame = gid != null ? gameLabelMap.get(gid) : null;
    if (!tonightGame && row.game) tonightGame = matchupLabelFromGame(row.game);
    const o = {
      playerId: p.id,
      name,
      team,
      pts: row.pts,
      reb: row.reb,
      ast: row.ast,
      stl: row.stl,
      blk: row.blk,
      min: row.min,
      fg_pct: row.fg_pct,
      fg3_pct: row.fg3_pct,
      ft_pct: row.ft_pct,
      games_played: 1,
      season: row.game?.season ?? new Date().getFullYear(),
      source: "game_box",
      tonightGame: tonightGame || undefined,
      gameId: gid,
    };
    byPlayer.set(p.id, o);
  }
  return [...byPlayer.values()].sort((a, b) => (b.pts || 0) - (a.pts || 0));
}

/** Season averages + /v1/players lookup — team can lag trades; used only as fallback. */
async function fetchSeasonAveragePlayerStats(bdlKey, season) {
  const res = await fetch(`https://api.balldontlie.io/v1/season_averages?season=${season}`, {
    headers: bdlHeaders(bdlKey),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const rows = Array.isArray(data?.data) ? data.data : [];

  const playerIds = rows.map((r) => r.player_id).filter(Boolean).slice(0, 250);
  const players = [];
  for (let j = 0; j < playerIds.length; j += 25) {
    const chunk = playerIds.slice(j, j + 25);
    const qs = chunk.map((id) => `player_ids[]=${encodeURIComponent(id)}`).join("&");
    const pRes = await fetch(`https://api.balldontlie.io/v1/players?${qs}`, {
      headers: bdlHeaders(bdlKey),
    });
    if (!pRes.ok) continue;
    const pData = await pRes.json();
    if (Array.isArray(pData?.data)) players.push(...pData.data);
  }

  const playerMap = new Map(players.map((p) => [p.id, p]));
  return rows
    .map((r) => {
      const p = playerMap.get(r.player_id);
      if (!p) return null;
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      const team = p.team?.abbreviation || p.team?.full_name || "UNK";
      return {
        playerId: r.player_id,
        name,
        team,
        pts: r.pts,
        reb: r.reb,
        ast: r.ast,
        stl: r.stl,
        blk: r.blk,
        min: r.min,
        fg_pct: r.fg_pct,
        fg3_pct: r.fg3_pct,
        ft_pct: r.ft_pct,
        games_played: r.games_played,
        season,
        source: "season_average",
        statsNote:
          "Season averages — team field is from BDL player record and may lag mid-season trades. Prefer game_box rows or tonightGame when present.",
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.pts || 0) - (a.pts || 0));
}

/**
 * When the slate is mixed, BDL only returns game_box players for games with box data.
 * Pregame matchups (e.g. MIN @ DEN at 9:30) have no box yet — add those teams' season
 * rows so UR Take can still reason about Jokic, Edwards, etc.
 */
function mergeGameBoxWithPregameSeasonAverages(gameBoxPlayers, todaysGames, seasonPlayers) {
  if (!Array.isArray(todaysGames) || todaysGames.length === 0 || !Array.isArray(seasonPlayers) || !seasonPlayers.length) {
    return {
      players: gameBoxPlayers,
      statsSource: gameBoxPlayers.length ? "game_box" : "season_average",
    };
  }

  const preTeams = new Set();
  for (const g of todaysGames) {
    const state = String(g?.state || "").toLowerCase();
    /** Finished or live games already have box paths; empty/unknown often means scheduled (pregame). */
    if (state === "post" || state === "in") continue;
    const aa = String(g?.awayTeam?.abbr || "").toUpperCase();
    const ha = String(g?.homeTeam?.abbr || "").toUpperCase();
    if (aa && aa !== "?") preTeams.add(aa);
    if (ha && ha !== "?") preTeams.add(ha);
  }

  if (preTeams.size === 0) {
    return {
      players: gameBoxPlayers,
      statsSource: gameBoxPlayers.length ? "game_box" : "season_average",
    };
  }

  const seen = new Set((gameBoxPlayers || []).map((p) => p.playerId).filter(Boolean));
  const supplemental = [];
  for (const p of seasonPlayers) {
    if (!p?.playerId || seen.has(p.playerId)) continue;
    const team = String(p.team || "").toUpperCase();
    if (!preTeams.has(team)) continue;
    supplemental.push({
      ...p,
      statsNote: `${p.statsNote || ""} [Pregame: season average — game not started yet.]`.trim(),
    });
    seen.add(p.playerId);
  }

  const merged = [...(gameBoxPlayers || []), ...supplemental].sort(
    (a, b) => (b.pts || 0) - (a.pts || 0),
  );
  const added = supplemental.length;
  const statsSource =
    (gameBoxPlayers || []).length && added > 0
      ? "hybrid_game_box_plus_pregame_season"
      : (gameBoxPlayers || []).length
        ? "game_box"
        : "season_average";

  return { players: merged, statsSource };
}

const NBA_QUERY_TEAM_ALIASES = {
  "timberwolves": "MIN",
  "wolves": "MIN",
  nuggets: "DEN",
  nugget: "DEN",
  lakers: "LAL",
  warriors: "GSW",
  "trail blazers": "POR",
  blazers: "POR",
  mavericks: "DAL",
  mavs: "DAL",
  grizzlies: "MEM",
  hornets: "CHA",
  thunder: "OKC",
  jazz: "UTA",
  pelicans: "NOP",
  bucks: "MIL",
  pistons: "DET",
  kings: "SAC",
  suns: "PHX",
  rockets: "HOU",
  spurs: "SAS",
  clippers: "LAC",
};

/** Pull team abbreviations from user text so Odds prop fetch + board sorting hit the asked matchup first. */
export function extractNbaTeamAbbrevsFromQuestion(question) {
  const q = String(question || "");
  const out = new Set();
  const re =
    /\b(ATL|BOS|BKN|CHA|CHI|CLE|DAL|DEN|DET|GSW|HOU|IND|LAC|LAL|MEM|MIA|MIL|MIN|NOP|NYK|OKC|ORL|PHI|PHX|POR|SAC|SAS|TOR|UTA|WAS)\b/gi;
  let m;
  while ((m = re.exec(q)) !== null) out.add(m[1].toUpperCase());

  const ql = q.toLowerCase();
  for (const [nick, abbr] of Object.entries(NBA_QUERY_TEAM_ALIASES)) {
    if (ql.includes(nick)) out.add(abbr);
  }
  return [...out];
}

function prioritizeNbaBoardForQuestion(board, abbrevs) {
  const ab = new Set((abbrevs || []).map((a) => String(a || "").toUpperCase()).filter(Boolean));
  if (ab.size === 0) return board;

  const gameMatches = (g) => {
    const aa = String(g?.awayTeam?.abbr || "").toUpperCase();
    const ha = String(g?.homeTeam?.abbr || "").toUpperCase();
    return (aa && ab.has(aa)) || (ha && ab.has(ha));
  };

  const propMatches = (p) => {
    const aa = String(p?.awayAbbr || "").toUpperCase();
    const ha = String(p?.homeAbbr || "").toUpperCase();
    return (aa && ab.has(aa)) || (ha && ab.has(ha));
  };

  const playerTeamMatches = (p) => ab.has(String(p?.team || "").toUpperCase());

  return {
    ...board,
    todaysGames: [...(board.todaysGames || [])].sort(
      (a, b) => Number(gameMatches(b)) - Number(gameMatches(a)),
    ),
    propLines: [...(board.propLines || [])].sort(
      (a, b) => Number(propMatches(b)) - Number(propMatches(a)),
    ),
    playerStats: [...(board.playerStats || [])].sort((a, b) => {
      const pa = playerTeamMatches(a) ? 1 : 0;
      const pb = playerTeamMatches(b) ? 1 : 0;
      if (pb !== pa) return pb - pa;
      return (b.pts || 0) - (a.pts || 0);
    }),
  };
}

function buildPlayerStatsSummaryLines(players, statsSource) {
  const header =
    statsSource === "game_box"
      ? "PLAYER SNAPSHOT (from today's game box scores — team = who they played for in that game)"
      : statsSource === "hybrid_game_box_plus_pregame_season"
        ? "PLAYER SNAPSHOT (today's box scores PLUS season averages for teams whose games have not tipped yet — prefer tonightGame / props for matchup)"
        : "PLAYER SNAPSHOT (season averages — NOT live roster; team may lag trades. Cross-check tonightGame / props.)";
  const lines = (players || []).slice(0, 120).map((p) => {
    const pts = p.pts != null ? `${Number(p.pts)}` : "?";
    const reb = p.reb != null ? `${Number(p.reb)}` : "?";
    const ast = p.ast != null ? `${Number(p.ast)}` : "?";
    const tg = p.tonightGame ? ` | Tonight: ${p.tonightGame}` : "";
    const tag = p.source === "season_average" ? " [season avg]" : "";
    return `${p.name} (${p.team}) — ${pts}pts ${reb}reb ${ast}ast${tg}${tag}`;
  });
  return [header, "", ...lines].join("\n");
}

/**
 * Prefer today's BDL game stats (correct team per game); merge pregame teams' season-average
 * rows when the slate mixes finished/live games with games not yet tipped.
 *
 * @param {string} bdlKey
 * @param {object[]} [todaysGames] — merged scoreboard/API games (ET today). Used to attach
 *   season-average rows for teams in pregame games when game_box rows only cover tipped games.
 */
async function getNbaPlayerStatsBundle(bdlKey, todaysGames = []) {
  if (!bdlKey) {
    const empty = { playerStats: [], playerStatsText: "", statsSource: "none" };
    return empty;
  }

  const season = new Date().getFullYear();

  try {
    const todayIso = getTodayEtDateString();
    const games = await fetchBdlGamesForDate(bdlKey, todayIso);
    const gameIds = [...new Set(games.map((g) => g.id).filter(Boolean))];

    let statRows = [];
    if (gameIds.length > 0) {
      statRows = await fetchBdlStatsForGameIds(bdlKey, gameIds);
    }

    let playerStats = [];
    let statsSource = "season_average";

    if (statRows.length > 0) {
      const gameLabelMap = buildGameLabelMap(games);
      playerStats = statRowsToPlayers(statRows, gameLabelMap);
      statsSource = "game_box";
      const seasonAvg = await fetchSeasonAveragePlayerStats(bdlKey, season);
      const merged = mergeGameBoxWithPregameSeasonAverages(playerStats, todaysGames, seasonAvg);
      playerStats = merged.players;
      statsSource = merged.statsSource;
    } else {
      playerStats = await fetchSeasonAveragePlayerStats(bdlKey, season);
      statsSource = "season_average";
    }

    const playerStatsText = buildPlayerStatsSummaryLines(playerStats, statsSource);

    return { playerStats, playerStatsText, statsSource };
  } catch (err) {
    console.warn("getNbaPlayerStatsBundle error:", err.message);
    const fallback = await fetchSeasonAveragePlayerStats(bdlKey, season);
    return {
      playerStats: fallback,
      playerStatsText: buildPlayerStatsSummaryLines(fallback, "season_average"),
      statsSource: "season_average",
    };
  }
}

function questionMentionsPlayer(question, playerName) {
  const q = String(question || "").toLowerCase();
  const full = String(playerName || "").trim().toLowerCase();
  if (!q || !full) return false;
  if (q.includes(full)) return true;
  const parts = full.split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] || "";
  if (last.length >= 4 && new RegExp(`\\b${last}(?:'s)?\\b`, "i").test(q)) return true;
  return false;
}

async function getNbaInjuries(bdlKey, todaysGames, question = "") {
  const cacheKey = "nba_injuries";
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const gameTeams = new Set();
  for (const g of todaysGames||[]) {
    if (g.homeTeam?.abbr) gameTeams.add(g.homeTeam.abbr);
    if (g.awayTeam?.abbr) gameTeams.add(g.awayTeam.abbr);
  }

  try {
    const rows = await fetchBdlInjuries(bdlKey);
    const injuries = rows.filter((i) => {
      const lower = String(i.player || "").toLowerCase();
      return gameTeams.has(i.team) || questionMentionsPlayer(question, lower);
    });

    setCached(cacheKey, injuries);
    return injuries;
  } catch (err) {
    console.warn("getNbaInjuries error:", err.message);
    return [];
  }
}

function normalizeInjuryStatus(status, detail) {
  const s = `${String(status || "").toLowerCase()} ${String(detail || "").toLowerCase()}`;
  if (
    /\b(out|inactive|dnp|did not play|ruled out|available:\s*out|suspended|not with team)\b/.test(s)
  ) {
    return "out";
  }
  if (/\b(doubtful)\b/.test(s)) return "doubtful";
  if (/\b(questionable|game[- ]time decision|gtd|probable)\b/.test(s)) return "questionable";
  return "unknown";
}

function inferPlayerRoleFromStats(playerStatsRow) {
  const ast = Number(playerStatsRow?.ast || 0);
  const reb = Number(playerStatsRow?.reb || 0);
  const pts = Number(playerStatsRow?.pts || 0);
  const fg3 = Number(playerStatsRow?.fg3_pct || 0);

  if (ast >= 5 || (ast >= reb && ast >= 4)) return "guard";
  if (reb >= 8 || (reb >= ast && reb >= 7)) return "big";
  if (pts >= 18 && fg3 >= 0.33) return "wing";
  if (reb >= ast) return "big";
  if (ast > reb) return "guard";
  return "wing";
}

function inferPlayerCentrality(playerStatsRow, propLines, playerName) {
  const nameKey = String(playerName || "").trim().toLowerCase();
  const propCount = (propLines || []).filter(
    (pl) => String(pl?.player || "").trim().toLowerCase() === nameKey,
  ).length;
  const hasPra = (propLines || []).some(
    (pl) =>
      String(pl?.player || "").trim().toLowerCase() === nameKey &&
      String(pl?.prop || "").toLowerCase().includes("points rebounds assists"),
  );
  const pts = Number(playerStatsRow?.pts || 0);
  const ast = Number(playerStatsRow?.ast || 0);
  const reb = Number(playerStatsRow?.reb || 0);
  if (hasPra || propCount >= 3) return "high";
  if (pts >= 22 || ast >= 7 || reb >= 10) return "high";
  if (pts >= 16 || ast >= 5 || reb >= 8 || propCount >= 2) return "medium";
  return "low";
}

function rankTeamCandidates(playerStats, teamAbbr, excludedNames, sortKeys) {
  const excluded = new Set(
    (excludedNames || []).map((n) => String(n || "").trim().toLowerCase()).filter(Boolean),
  );
  const rows = (playerStats || []).filter((p) => {
    const team = String(p?.team || "").toUpperCase();
    const nameKey = String(p?.name || "").trim().toLowerCase();
    return team === teamAbbr && nameKey && !excluded.has(nameKey);
  });
  rows.sort((a, b) => {
    for (const key of sortKeys) {
      const da = Number(a?.[key] || 0);
      const db = Number(b?.[key] || 0);
      if (db !== da) return db - da;
    }
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  });
  return rows.slice(0, 3);
}

function buildBeneficiariesForRole({ role, teamAbbr, playerStats, excludedNames }) {
  if (role === "guard") {
    return rankTeamCandidates(playerStats, teamAbbr, excludedNames, ["ast", "pts"]).slice(0, 2).map((p) => ({
      player: p.name,
      markets: ["points", "assists"],
      reason: "primary on-ball creation increase",
    }));
  }
  if (role === "big") {
    return rankTeamCandidates(playerStats, teamAbbr, excludedNames, ["reb", "pts"]).slice(0, 2).map((p) => ({
      player: p.name,
      markets: ["rebounds", "pra"],
      reason: "frontcourt rebound and interior share increase",
    }));
  }
  return rankTeamCandidates(playerStats, teamAbbr, excludedNames, ["pts", "fg3_pct"]).slice(0, 2).map((p) => ({
    player: p.name,
    markets: ["points", "threes"],
    reason: "perimeter scoring volume redistribution",
  }));
}

function dedupeBeneficiaries(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows || []) {
    const name = String(row?.player || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out.slice(0, 4);
}

export function buildNbaNewsImpact(board = {}) {
  const injuries = Array.isArray(board?.injuries) ? board.injuries : [];
  const playerStats = Array.isArray(board?.playerStats) ? board.playerStats : [];
  const propLines = Array.isArray(board?.propLines) ? board.propLines : [];
  const teamBuckets = new Map();
  const globalFlags = ["Never project props for OUT or DNP players"];

  const getTeamBucket = (team) => {
    const t = String(team || "").toUpperCase();
    if (!t || t === "UNK") return null;
    if (!teamBuckets.has(t)) {
      teamBuckets.set(t, {
        team: t,
        priority: "low",
        outs: [],
        doubtful: [],
        questionable: [],
        beneficiaries: [],
        invalidMarkets: [],
        notes: [],
      });
    }
    return teamBuckets.get(t);
  };

  const statsByName = new Map(
    playerStats
      .filter((p) => p?.name)
      .map((p) => [String(p.name).trim().toLowerCase(), p]),
  );

  for (const row of injuries) {
    const team = String(row?.team || "").toUpperCase();
    const player = String(row?.player || "").trim();
    if (!team || !player) continue;
    const bucket = getTeamBucket(team);
    if (!bucket) continue;

    const statusClass = normalizeInjuryStatus(row?.status, row?.detail);
    if (statusClass === "unknown") continue;

    if (statusClass === "out") bucket.outs.push(player);
    else if (statusClass === "doubtful") bucket.doubtful.push(player);
    else if (statusClass === "questionable") bucket.questionable.push(player);

    const statsRow = statsByName.get(player.toLowerCase());
    const role = inferPlayerRoleFromStats(statsRow);
    const centrality = inferPlayerCentrality(statsRow, propLines, player);

    if (statusClass === "out") {
      bucket.invalidMarkets.push({
        player,
        markets: ["points", "rebounds", "assists", "pra"],
        reason: "player out",
      });
      const beneficiaries = buildBeneficiariesForRole({
        role,
        teamAbbr: team,
        playerStats,
        excludedNames: [...bucket.outs, ...bucket.doubtful],
      });
      bucket.beneficiaries.push(...beneficiaries);
      if (centrality === "high") {
        bucket.priority = "high";
        bucket.notes.push("Primary usage vacated");
      } else if (bucket.priority !== "high") {
        bucket.priority = "medium";
      }
      if (role === "big") bucket.notes.push("Frontcourt rebound share redistributed");
      if (role === "guard") bucket.notes.push("Lead creation role likely expands");
      if (role === "wing") bucket.notes.push("Perimeter volume reallocated");
      continue;
    }

    if (statusClass === "doubtful") {
      if (centrality === "high") bucket.priority = "high";
      else if (bucket.priority !== "high") bucket.priority = "medium";
      bucket.notes.push(`${player} status unresolved pre-tip`);
      const likely = buildBeneficiariesForRole({
        role,
        teamAbbr: team,
        playerStats,
        excludedNames: [...bucket.outs, ...bucket.doubtful, player],
      }).map((b) => ({
        ...b,
        reason: `conditional: ${b.reason}`,
      }));
      bucket.beneficiaries.push(...likely);
      continue;
    }

    if (statusClass === "questionable") {
      if (centrality === "high" && bucket.priority !== "high") bucket.priority = "medium";
      bucket.notes.push(`${player} questionable — monitor final status`);
      const likely = buildBeneficiariesForRole({
        role,
        teamAbbr: team,
        playerStats,
        excludedNames: [...bucket.outs, ...bucket.questionable, player],
      })
        .slice(0, 1)
        .map((b) => ({
          ...b,
          reason: `conditional: ${b.reason}`,
        }));
      bucket.beneficiaries.push(...likely);
    }
  }

  const affectedTeams = [...teamBuckets.values()]
    .map((bucket) => ({
      ...bucket,
      outs: [...new Set(bucket.outs)],
      doubtful: [...new Set(bucket.doubtful)],
      questionable: [...new Set(bucket.questionable)],
      beneficiaries: dedupeBeneficiaries(bucket.beneficiaries),
      invalidMarkets: bucket.invalidMarkets.slice(0, 6),
      notes: [...new Set(bucket.notes)].slice(0, 4),
    }))
    .filter(
      (bucket) =>
        bucket.outs.length > 0 ||
        bucket.doubtful.length > 0 ||
        bucket.questionable.length > 0,
    )
    .sort((a, b) => {
      const rank = (p) => (p === "high" ? 2 : p === "medium" ? 1 : 0);
      return rank(b.priority) - rank(a.priority);
    });

  return {
    generatedAt: new Date().toISOString(),
    affectedTeams,
    globalFlags,
  };
}

function shouldShowSeriesScore(item) {
  const hw = Number(item?.homeWins || 0);
  const aw = Number(item?.awayWins || 0);
  return Number.isFinite(hw) && Number.isFinite(aw) && hw + aw > 0;
}

async function getNbaPlayoffSeries() {
  const cacheKey = "nba_playoff_series";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const fromPlayoffEndpoint = async () => {
    const res = await fetch("https://site.api.espn.com/apis/v2/sports/basketball/nba/playoff?season=2025", {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const d2 = await res.json();
    const brackets = d2?.bracket?.series || d2?.rounds?.flatMap((r) => r.series || []) || [];
    const rows = brackets
      .map((s) => {
        const home = s.competitors?.find((c) => c.homeAway === "home");
        const away = s.competitors?.find((c) => c.homeAway === "away");
        return {
          round: s.round?.displayName || s.displayName || "",
          home: home?.team?.abbreviation || "",
          away: away?.team?.abbreviation || "",
          homeWins: parseInt(home?.wins || 0, 10) || 0,
          awayWins: parseInt(away?.wins || 0, 10) || 0,
          status: s.status?.type?.description || s.statusText || "",
        };
      })
      .filter((s) => s.home || s.away);
    return rows;
  };

  const fromScoreboardEndpoint = async () => {
    const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?groups=playoff", {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    const events = data?.events || [];
    const seriesMap = {};

    for (const ev of events) {
      const sid = ev.series?.id || ev.uid;
      if (!sid || seriesMap[sid]) continue;
      const comps = ev.competitions?.[0]?.competitors || [];
      const home = comps.find((c) => c.homeAway === "home");
      const away = comps.find((c) => c.homeAway === "away");
      seriesMap[sid] = {
        round: ev.series?.type?.text || ev.seriesStatus?.displayName || "",
        home: home?.team?.abbreviation || "",
        away: away?.team?.abbreviation || "",
        homeWins: parseInt(home?.wins || ev.seriesStatus?.homeTeamWins || 0, 10) || 0,
        awayWins: parseInt(away?.wins || ev.seriesStatus?.awayTeamWins || 0, 10) || 0,
        status: ev.seriesStatus?.summary || ev.status?.type?.description || "",
      };
    }

    return Object.values(seriesMap).filter((s) => s.home || s.away);
  };

  try {
    const [playoffRows, scoreboardRows] = await Promise.allSettled([
      fromPlayoffEndpoint(),
      fromScoreboardEndpoint(),
    ]);
    const playoffSeries = playoffRows.status === "fulfilled" ? playoffRows.value : [];
    const scoreboardSeries = scoreboardRows.status === "fulfilled" ? scoreboardRows.value : [];

    const preferred = playoffSeries.length > 0 ? playoffSeries : scoreboardSeries;
    const filtered = preferred.filter(shouldShowSeriesScore);
    if (filtered.length > 0) {
      setCached(cacheKey, filtered);
      return filtered;
    }
    return [];
  } catch (err) {
    console.warn("getNbaPlayoffSeries error:", err.message);
    return [];
  }
}

function buildGameTotalsFromProps(propLines) {
  const totals = {};
  for (const line of propLines||[]) {
    if (!line.game) continue;
    if (!totals[line.game]) totals[line.game] = { total:null, pace:"NEUTRAL" };
  }
  return totals;
}

/**
 * Fresh NBA payload for UR Take — **do not rely on the browser-cached board**.
 * Prioritizes Odds prop pulls + stat rows for teams named in the question (e.g. MIN @ DEN).
 */
export async function buildNbaUrTakeBoard(question = "") {
  const ODDS_KEY = getEnv("ODDS_API_KEY");
  const BDL_KEY = getEnv("BALLDONTLIE_API_KEY");
  const boost = extractNbaTeamAbbrevsFromQuestion(String(question || ""));

  const tgRes = await getTodaysGames(ODDS_KEY, BDL_KEY);
  const todaysGames = tgRes.games || [];
  const todaysGamesSlateMeta = tgRes.slateMeta;

  const [rawBundle, statsBundle, playoffSeries] = await Promise.all([
    getNbaPropLines(ODDS_KEY, { priorityAbbrevs: boost, maxEvents: 18 }),
    getNbaPlayerStatsBundle(BDL_KEY, todaysGames),
    getNbaPlayoffSeries(),
  ]);
  const rawPropLines = rawBundle.propLines || [];
  const propLines = filterPropLinesForActiveSlate(rawPropLines, todaysGames);
  const propFeedMeta = {
    ...rawBundle.feedMeta,
    propsReturnedBeforeSlateFilter: rawPropLines.length,
    propsActiveSlateCount: propLines.length,
  };
  const injuries = await getNbaInjuries(BDL_KEY, todaysGames, question);
  const playerStatsWithTonight = attachTonightGamesFromProps(
    statsBundle.playerStats || [],
    propLines,
  );
  const playerStatsTextMerged = buildPlayerStatsSummaryLines(
    playerStatsWithTonight,
    statsBundle.statsSource || "season_average",
  );

  let board = {
    seasonContext: getNbaSeasonContext(),
    todaysGames,
    todaysGamesSlateMeta,
    todaysGamesSlateNote:
      todaysGames.length === 0 && todaysGamesSlateMeta?.note ? todaysGamesSlateMeta.note : null,
    lastNight: [],
    lastNightStats: [],
    liveStats: [],
    playerStats: playerStatsWithTonight.slice(0, 120),
    playerStatsText: playerStatsTextMerged,
    statsSource: statsBundle.statsSource || "unknown",
    rosterGrounding: buildNbaRosterGrounding(
      playerStatsWithTonight,
      propLines,
      injuries,
      statsBundle.statsSource || "unknown",
      todaysGames,
    ),
    propLines: propLines.slice(0, 120),
    injuries,
    bdlGrounding: buildBdlGroundingEnvelope({
      playerStats: playerStatsWithTonight,
      todaysGames,
      injuries,
    }),
    playoffSeries,
    recentForm: "",
    h2hSplits: [],
    gameTotals: buildGameTotalsFromProps(propLines),
    fetchedAt: new Date().toISOString(),
    propFeedMeta,
    urTakeParsing: {
      boostedTeamAbbrevsFromQuestion: boost,
      note: boost.length
        ? `Question referenced teams: ${boost.join(", ")} — props and player rows are ordered for this matchup first.`
        : "",
    },
  };

  board.newsImpact = buildNbaNewsImpact(board);
  board = prioritizeNbaBoardForQuestion(board, boost);
  return board;
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error:"Method not allowed" });

  const ODDS_KEY = getEnv("ODDS_API_KEY");
  const BDL_KEY  = getEnv("BALLDONTLIE_API_KEY");
  const view = String(req.query.view || "board").toLowerCase();

  try {
    if (view === "games") {
      const tg = await getTodaysGames(ODDS_KEY, BDL_KEY);
      return res.status(200).json(tg.games);
    }

    if (view === "board") {
      const boardCacheKey = `nba_board_${new Date().getFullYear()}`;
      const boardCached = getCached(boardCacheKey);
      if (boardCached) return res.status(200).json(boardCached);

      const tgRes = await getTodaysGames(ODDS_KEY, BDL_KEY);
      const [rawBundle, statsBundle, playoffSeries] = await Promise.all([
        getNbaPropLines(ODDS_KEY, {}),
        getNbaPlayerStatsBundle(BDL_KEY, tgRes.games || []),
        getNbaPlayoffSeries(),
      ]);
      const rawPropLines = rawBundle.propLines || [];
      const todaysGames = tgRes.games;
      const todaysGamesSlateMeta = tgRes.slateMeta;

      const propLines = filterPropLinesForActiveSlate(rawPropLines, todaysGames);
      const propFeedMeta = {
        ...rawBundle.feedMeta,
        propsReturnedBeforeSlateFilter: rawPropLines.length,
        propsActiveSlateCount: propLines.length,
      };

      const injuries = await getNbaInjuries(BDL_KEY, todaysGames, "");

      const playerStatsWithTonight = attachTonightGamesFromProps(
        statsBundle.playerStats || [],
        propLines,
      );

      const playerStatsTextMerged = buildPlayerStatsSummaryLines(
        playerStatsWithTonight,
        statsBundle.statsSource || "season_average",
      );

      const board = {
        seasonContext: getNbaSeasonContext(),
        todaysGames,
        todaysGamesSlateMeta,
        lastNight: [], lastNightStats: [], liveStats: [],
        playerStats: playerStatsWithTonight.slice(0, 120),
        playerStatsText: playerStatsTextMerged,
        statsSource: statsBundle.statsSource || "unknown",
        rosterGrounding: buildNbaRosterGrounding(
          playerStatsWithTonight,
          propLines,
          injuries,
          statsBundle.statsSource || "unknown",
          todaysGames,
        ),
        propLines:   propLines.slice(0, 120),
        injuries,
        bdlGrounding: buildBdlGroundingEnvelope({
          playerStats: playerStatsWithTonight,
          todaysGames,
          injuries,
        }),
        playoffSeries,         recentForm: "", h2hSplits: [],
        gameTotals: buildGameTotalsFromProps(propLines),
        fetchedAt: new Date().toISOString(),
        propFeedMeta,
      };
      board.newsImpact = buildNbaNewsImpact(board);

      if (
        todaysGames.length > 0 ||
        propLines.length > 0 ||
        injuries.length > 0 ||
        (statsBundle.playerStats || []).length > 0
      ) {
        setCached(boardCacheKey, board);
      }
      return res.status(200).json(board);
    }

    return res.status(400).json({ error:"Invalid view", allowed:["board","games"] });
  } catch (err) {
    console.error("NBA API error:", err);
    return res.status(500).json({ error:"Failed to fetch NBA data", details:err.message });
  }
}
