import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { addCalendarDaysEt } from "./_espnEtDates.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { persistLastKnownHomeNbaGames, recoverLastKnownHomeNbaGames } from "./_homeLastKnownGames.js";
import { normalizeTeamAbbr } from "../shared/nbaTeamAbbrev.js";
import { buildNbaPlayoffPathGrounding } from "./_nbaPlayoffPath.js";

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map();
const BDL_SEASON_AVG_INTERVAL_MS = 1200;
const bdlSeasonAverageCache = new Map();
let bdlSeasonAverageQueueTail = Promise.resolve();
const rosterDiag = {
  firstDurableGetError: null,
  firstDurableGetChecked: false,
  lastSeasonAverageTeamIds: [],
  lastSeasonAverageReturnedRows: 0,
};

function logOddsUnavailable(status, scope) {
  console.warn(
    `[odds] unavailable — running without lines (${scope}${Number.isFinite(status) ? ` status=${status}` : ""})`,
  );
}

function enqueueBdlSeasonAverageRequest(task) {
  const run = bdlSeasonAverageQueueTail.then(async () => {
    const startedAt = Date.now();
    try {
      return await task();
    } finally {
      const elapsed = Date.now() - startedAt;
      const waitMs = Math.max(0, BDL_SEASON_AVG_INTERVAL_MS - elapsed);
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  });
  bdlSeasonAverageQueueTail = run.catch(() => null);
  return run;
}

/**
 * Single-source normalization for incoming team abbreviations from BDL, ESPN,
 * Odds API, or any external feed. Maps short/legacy/franchise-relocation tokens
 * to the canonical 3-letter NBA abbreviation used everywhere downstream.
 *
 * Apply this at every external boundary (mapBdlGameRowToAppGame, mapEspnEventToAppGame,
 * statRowsToPlayers, fetchSeasonAveragePlayerStats, getNbaInjuries, getNbaPlayoffSeries,
 * Odds API ingestion, etc.) so internal joins never see SA/NY/GS/NO/UT variants.
 */
const TEAM_ABBR_NORMALIZATION_MAP = {
  SA: "SAS",
  NY: "NYK",
  GS: "GSW",
  NO: "NOP",
  UT: "UTA",
  WSH: "WAS",
  NJ: "BKN",
  BRK: "BKN",
  NOH: "NOP",
  NOK: "NOP",
  CHH: "CHA",
  CHO: "CHA",
  PHO: "PHX",
  SAN: "SAS",
};

export function canonicalizeTeamAbbr(raw) {
  const cleaned = String(raw || "").trim().replace(/\./g, "").toUpperCase();
  if (!cleaned) return "";
  return TEAM_ABBR_NORMALIZATION_MAP[cleaned] || cleaned;
}

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
function toEspnDateToken(etDateString) {
  return String(etDateString || "").replace(/-/g, "");
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const s = String(value || "").trim();
    if (s) return s;
  }
  return "";
}

function extractEspnBroadcastChannel(event) {
  const broadcasts = Array.isArray(event?.competitions?.[0]?.broadcasts)
    ? event.competitions[0].broadcasts
    : [];
  const names = broadcasts
    .map((b) =>
      firstNonEmpty(
        b?.names?.join?.(", "),
        b?.media?.shortName,
        b?.media?.name,
        b?.type?.shortName,
        b?.type?.name,
      ),
    )
    .filter(Boolean);
  return [...new Set(names)].join(", ");
}

function mapEspnEventToAppGame(event) {
  const competitors = event?.competitions?.[0]?.competitors || [];
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");
  if (!home?.team || !away?.team) return null;

  const homeName = home.team.displayName || home.team.name || "";
  const awayName = away.team.displayName || away.team.name || "";
  const homeAbbr = canonicalizeTeamAbbr(home.team.abbreviation || normalizeTeamAbbr(homeName));
  const awayAbbr = canonicalizeTeamAbbr(away.team.abbreviation || normalizeTeamAbbr(awayName));
  const type = event?.status?.type || {};
  const stateRaw = String(type.state || "").toLowerCase();
  const completed = Boolean(type.completed);
  const period = Number(event?.status?.period);
  const displayClock = String(event?.status?.displayClock || "").trim();
  const startTimeUtc = String(event?.date || "").trim() || null;
  const series = event?.competitions?.[0]?.series;
  const seriesSummary = String(series?.summary || "").trim() || null;
  const seriesCompetitors = Array.isArray(series?.competitors) ? series.competitors : [];
  const teamIdToAbbr = new Map();
  if (home?.team?.id && homeAbbr) teamIdToAbbr.set(String(home.team.id), homeAbbr);
  if (away?.team?.id && awayAbbr) teamIdToAbbr.set(String(away.team.id), awayAbbr);
  const normalizedSeriesCompetitors = seriesCompetitors
    .map((c) => ({
      abbr:
        canonicalizeTeamAbbr(String(c?.team?.abbreviation || c?.abbreviation || "").trim()) ||
        teamIdToAbbr.get(String(c?.id || "")) ||
        null,
      wins: Number.parseInt(String(c?.wins ?? ""), 10),
    }))
    .filter((c) => c.abbr && Number.isFinite(c.wins));
  let seriesLeader = null;
  let seriesWins = null;
  let seriesDeficit = null;
  if (normalizedSeriesCompetitors.length >= 2) {
    const ordered = [...normalizedSeriesCompetitors].sort((a, b) => b.wins - a.wins);
    if (ordered[0].wins > ordered[1].wins) {
      seriesLeader = ordered[0].abbr;
      seriesWins = ordered[0].wins;
      seriesDeficit = ordered[1].wins;
    } else {
      // Tie case: keep leader null but still surface counts.
      seriesWins = ordered[0].wins;
      seriesDeficit = ordered[1].wins;
    }
  }

  let state = "pre";
  if (completed || stateRaw === "post") state = "post";
  else if (stateRaw === "in" || stateRaw === "live") state = "in";
  const showScore = state !== "pre";

  return {
    id: event.id,
    status: type.shortDetail || type.detail || type.description || (state === "pre" ? "Scheduled" : "Live"),
    state,
    statusCode: state === "post" ? 3 : state === "in" ? 2 : 1,
    period: Number.isFinite(period) ? period : null,
    clock: displayClock || null,
    homeTeam: {
      name: homeName,
      abbr: homeAbbr,
      score: showScore && home.score != null && home.score !== "" ? Number(home.score) : null,
    },
    awayTeam: {
      name: awayName,
      abbr: awayAbbr,
      score: showScore && away.score != null && away.score !== "" ? Number(away.score) : null,
    },
    startTimeUtc,
    startTimeSource: "espn_scoreboard",
    channel: extractEspnBroadcastChannel(event) || null,
    broadcast: extractEspnBroadcastChannel(event) || null,
    postseason: /playoff|final/i.test(String(event?.season?.slug || event?.season?.type || "")),
    seriesSummary,
    seriesLeader,
    seriesWins: Number.isFinite(seriesWins) ? seriesWins : null,
    seriesDeficit: Number.isFinite(seriesDeficit) ? seriesDeficit : null,
  };
}

async function getNbaGamesFromEspnScoreboard(todayET, tomorrowET) {
  const tokens = [todayET, tomorrowET].map(toEspnDateToken).filter(Boolean);
  const byPair = new Map();
  for (const token of tokens) {
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${encodeURIComponent(token)}`,
        { cache: "no-store" },
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const event of data?.events || []) {
        const mapped = mapEspnEventToAppGame(event);
        if (!mapped) continue;
        const aa = String(mapped.awayTeam?.abbr || "").toUpperCase();
        const ha = String(mapped.homeTeam?.abbr || "").toUpperCase();
        if (!aa || !ha) continue;
        byPair.set(`${aa}|${ha}`, mapped);
      }
    } catch (err) {
      console.warn("ESPN NBA scoreboard fetch failed:", err.message);
    }
  }
  return [...byPair.values()];
}

function enrichNbaGamesWithEspn(games, espnGames) {
  const byPair = new Map();
  for (const g of espnGames || []) {
    const aa = String(g?.awayTeam?.abbr || "").toUpperCase();
    const ha = String(g?.homeTeam?.abbr || "").toUpperCase();
    if (aa && ha) byPair.set(`${aa}|${ha}`, g);
  }
  return (games || []).map((g) => {
    const aa = String(g?.awayTeam?.abbr || "").toUpperCase();
    const ha = String(g?.homeTeam?.abbr || "").toUpperCase();
    const espn = byPair.get(`${aa}|${ha}`);
    if (!espn) return g;
    const espnStart = String(espn.startTimeUtc || "").trim();
    const startTimeUtc = espnStart || g.startTimeUtc || g.commenceTime || null;
    return {
      ...g,
      status: espn.status || g.status,
      state: espn.state || g.state,
      statusCode: espn.statusCode || g.statusCode,
      period: espn.period ?? g.period ?? null,
      clock: espn.clock ?? g.clock ?? null,
      homeTeam: {
        ...g.homeTeam,
        score: espn.homeTeam?.score ?? g.homeTeam?.score ?? null,
      },
      awayTeam: {
        ...g.awayTeam,
        score: espn.awayTeam?.score ?? g.awayTeam?.score ?? null,
      },
      startTimeUtc,
      startTimeSource: espnStart ? "espn_scoreboard" : g.startTimeSource,
      channel: espn.channel || g.channel || null,
      broadcast: espn.broadcast || g.broadcast || null,
    };
  });
}

/** Map a BallDontLie /games row to the same shape as Odds API games (UI + prompts). */
function mapBdlGameRowToAppGame(g) {
  const home = g.home_team || g.homeTeam;
  const away = g.visitor_team || g.visitorTeam;
  const homeName = home?.full_name || home?.name || "";
  const awayName = away?.full_name || away?.name || "";
  const homeAbbr = canonicalizeTeamAbbr(home?.abbreviation || (home?.full_name ? normalizeTeamAbbr(home.full_name) : "?")) || "?";
  const awayAbbr = canonicalizeTeamAbbr(away?.abbreviation || (away?.full_name ? normalizeTeamAbbr(away.full_name) : "?")) || "?";

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
    status = /qtr|half|ot/i.test(stRaw) ? stRaw : "Scheduled";
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
    startTimeUtc: firstNonEmpty(g.start_time, g.datetime) || null,
    startTimeSource: "bdl_start_time",
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
    if (!res.ok) {
      logOddsUnavailable(res.status, "nba scores");
      return [];
    }
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
            abbr: canonicalizeTeamAbbr(normalizeTeamAbbr(g.home_team)),
            score: homePts != null ? parseInt(homePts, 10) : null,
          },
          awayTeam: {
            name: g.away_team,
            abbr: canonicalizeTeamAbbr(normalizeTeamAbbr(g.away_team)),
            score: awayPts != null ? parseInt(awayPts, 10) : null,
          },
          commenceTime: g.commence_time,
          startTimeUtc: String(g.commence_time || "").trim() || null,
          startTimeSource: "odds_fallback",
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
                  abbr: canonicalizeTeamAbbr(normalizeTeamAbbr(g.home_team)),
                  score: null,
                },
                awayTeam: {
                  name: g.away_team,
                  abbr: canonicalizeTeamAbbr(normalizeTeamAbbr(g.away_team)),
                  score: null,
                },
                commenceTime: g.commence_time,
                startTimeUtc: String(g.commence_time || "").trim() || null,
                startTimeSource: "odds_fallback",
              }));
          }
        } else {
          logOddsUnavailable(oddsRes.status, "nba odds list fallback");
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

/**
 * Primary: BallDontLie games for today (ET). Fallback: Odds API scores → odds list.
 * Returns { games, slateMeta } for prompts when the slate is empty but BDL responded OK.
 */
async function getTodaysGames(oddsKey, bdlKey) {
  const todayET = getTodayEtDateString();
  const tomorrowET = getTomorrowEtDateString();
  const GAMES_TODAY_CACHE_KEY = `games_today_bdl_primary_${todayET}_${tomorrowET}`;
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
        const espnGames = await getNbaGamesFromEspnScoreboard(todayET, tomorrowET);
        const games = enrichNbaGamesWithEspn(mergedRows.map(mapBdlGameRowToAppGame), espnGames);
        slateMeta.primarySource = "bdl";
        slateMeta.enrichmentSource = espnGames.length > 0 ? "espn_scoreboard" : null;
        const payload = { games, slateMeta };
        setCached(GAMES_TODAY_CACHE_KEY, payload);
        return payload;
      }
    } catch (err) {
      console.warn("BDL games fetch failed, falling back to Odds API:", err.message);
      slateMeta.bdlQueriedOk = false;
    }
  }

  const [oddsGames, espnGames] = await Promise.all([
    getTodaysGamesFromOddsApi(oddsKey, todayET, tomorrowET),
    getNbaGamesFromEspnScoreboard(todayET, tomorrowET),
  ]);
  const games = espnGames.length > 0
    ? enrichNbaGamesWithEspn(oddsGames.length > 0 ? oddsGames : espnGames, espnGames)
    : oddsGames;
  if (games.length > 0) {
    slateMeta.primarySource = oddsGames.length > 0 ? "odds" : "espn";
    slateMeta.enrichmentSource = espnGames.length > 0 ? "espn_scoreboard" : null;
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
  const away = canonicalizeTeamAbbr(normalizeTeamAbbr(event.away_team));
  const home = canonicalizeTeamAbbr(normalizeTeamAbbr(event.home_team));
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
      logOddsUnavailable(eventsFetchStatus, "nba props events");
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
          logOddsUnavailable(propRes.status, "nba props event");
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

        const awayAbbr = canonicalizeTeamAbbr(normalizeTeamAbbr(event.away_team));
        const homeAbbr = canonicalizeTeamAbbr(normalizeTeamAbbr(event.home_team));
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

  const qualityByTeam = {};
  let rosterGroundingQuality;
  if (tonightTeams.size > 0) {
    let anyZero = false;
    let anyUnderFour = false;
    for (const abbr of tonightTeams) {
      const n = (playersByTeamAbbrev[abbr] || []).length;
      qualityByTeam[abbr] = n === 0 ? "thin" : n < 4 ? "partial" : "full";
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
    qualityByTeam,
    trustNote,
    ...(rosterGroundingQuality ? { rosterGroundingQuality } : {}),
    rule:
      "Authoritative list is playersByTeamAbbrev (API + tonight slate). Follow UR Take ROSTER ENFORCEMENT block; never use training memory for player-team assignments.",
  };
}

function bdlHeaders(bdlKey) {
  return { Accept: "application/json", Authorization: bdlKey };
}

const NBA_PLAYER_INJURIES_CACHE_KEY = "nba_injuries_current_v2";
const NBA_PLAYER_INJURIES_TTL_SECONDS = 30 * 60;

function normalizePlayerInjuryMapEntry(row) {
  const playerObj = row?.player || row?.athlete || {};
  const teamObj = row?.team || playerObj?.team || {};
  const playerId = Number(playerObj?.id || row?.player_id || row?.athlete_id);
  if (!Number.isFinite(playerId)) return null;
  const player = String(
    playerObj?.full_name ||
      playerObj?.display_name ||
      [playerObj?.first_name, playerObj?.last_name].filter(Boolean).join(" ") ||
      row?.player_name ||
      "",
  ).trim();
  const teamFromPayload = canonicalizeTeamAbbr(
    teamObj?.abbreviation || normalizeTeamAbbr(teamObj?.full_name || teamObj?.name || ""),
  );
  const team =
    teamFromPayload && teamFromPayload !== "UNK" && teamFromPayload !== "?"
      ? teamFromPayload
      : BDL_TEAM_ABBR_BY_ID[String(playerObj?.team_id || row?.team_id || "")] || "UNK";
  const status = String(row?.status || row?.designation || row?.availability || "").trim();
  const description = String(row?.description || row?.detail || "").trim();
  const returnDate = String(
    row?.return_date || row?.returnDate || row?.expected_return || row?.estimated_return || "",
  ).trim();
  return {
    playerId,
    player,
    team,
    status,
    description,
    returnDate,
  };
}

export async function fetchPlayerInjuries(bdlKey) {
  if (!bdlKey) return {};
  try {
    const cached = await getDurableJson(NBA_PLAYER_INJURIES_CACHE_KEY);
    if (cached && typeof cached === "object" && !Array.isArray(cached)) return cached;
  } catch {
    // non-fatal
  }

  const endpoints = [
    "https://api.balldontlie.io/v1/player_injuries",
    "https://api.balldontlie.io/nba/v1/player_injuries",
  ];

  for (const url of endpoints) {
    try {
      const out = {};
      let cursor = null;
      let pages = 0;
      let sawOk = false;
      while (pages < 40) {
        const qs = new URLSearchParams();
        qs.append("per_page", "100");
        if (cursor != null && cursor !== "") qs.append("cursor", String(cursor));
        const res = await fetch(`${url}?${qs.toString()}`, { headers: bdlHeaders(bdlKey) });
        if (!res.ok) break;
        sawOk = true;
        const payload = await res.json().catch(() => ({}));
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        for (const row of rows) {
          const normalized = normalizePlayerInjuryMapEntry(row);
          if (!normalized) continue;
          out[String(normalized.playerId)] = {
            status: normalized.status || "unknown",
            description: normalized.description || "",
            returnDate: normalized.returnDate || "",
            player: normalized.player || "",
            team: normalized.team || "",
          };
        }
        const next = payload?.meta?.next_cursor;
        if (next == null || next === "" || rows.length === 0) break;
        cursor = next;
        pages += 1;
      }
      if (!sawOk) continue;
      await setDurableJson(NBA_PLAYER_INJURIES_CACHE_KEY, out, {
        ttlSeconds: NBA_PLAYER_INJURIES_TTL_SECONDS,
      });
      return out;
    } catch {
      // non-fatal — try next endpoint
    }
  }

  return {};
}

function abbrevFromTeamObj(t) {
  if (!t || typeof t !== "object") return "?";
  if (t.abbreviation) return canonicalizeTeamAbbr(t.abbreviation);
  if (t.full_name) return canonicalizeTeamAbbr(normalizeTeamAbbr(t.full_name));
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
    const team = canonicalizeTeamAbbr(row.team?.abbreviation) || "UNK";
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
      pf: row.pf,
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

/**
 * BDL team_id by canonical 3-letter abbreviation. Stable values from /v1/teams.
 * Used to translate canonicalized slate abbreviations into BDL team_ids for the
 * /v1/players/active call.
 */
const BDL_TEAM_ID_BY_ABBR = {
  ATL: 1, BOS: 2, BKN: 3, CHA: 4, CHI: 5, CLE: 6, DAL: 7, DEN: 8, DET: 9, GSW: 10,
  HOU: 11, IND: 12, LAC: 13, LAL: 14, MEM: 15, MIA: 16, MIL: 17, MIN: 18, NOP: 19, NYK: 20,
  OKC: 21, ORL: 22, PHI: 23, PHX: 24, POR: 25, SAC: 26, SAS: 27, TOR: 28, UTA: 29, WAS: 30,
};
const BDL_TEAM_ABBR_BY_ID = Object.fromEntries(
  Object.entries(BDL_TEAM_ID_BY_ABBR).map(([abbr, id]) => [String(id), abbr]),
);

/** Active roster pull for one or more team IDs from BDL's /v1/players/active endpoint. */
async function fetchActiveRosterPlayers(bdlKey, teamIds) {
  const ids = (teamIds || []).filter(Boolean);
  if (!ids.length) return [];
  const qs = ids.map((id) => `team_ids[]=${encodeURIComponent(id)}`).join("&");
  const baseUrl = `https://api.balldontlie.io/v1/players/active?${qs}&per_page=100`;

  const allRows = [];
  let cursor = null;
  let safety = 0;
  do {
    const url = cursor != null ? `${baseUrl}&cursor=${encodeURIComponent(cursor)}` : baseUrl;
    const res = await fetch(url, { headers: bdlHeaders(bdlKey) });
    if (!res.ok) break;
    const data = await res.json();
    const rows = Array.isArray(data?.data) ? data.data : [];
    allRows.push(...rows);
    cursor = data?.meta?.next_cursor ?? null;
    safety += 1;
  } while (cursor != null && safety < 20);

  return allRows.map((p) => ({
    playerId: p.id,
    name: [p.first_name, p.last_name].filter(Boolean).join(" ").trim(),
    team: canonicalizeTeamAbbr(p.team?.abbreviation || p.team?.full_name) || "UNK",
    position: p.position || "",
  }));
}

/** Per-player season averages via the new BDL contract: ?season=YYYY&player_id=<single integer>. */
async function fetchSeasonAverageForPlayer(bdlKey, season, playerId) {
  if (!playerId) return null;
  const cacheKey = `${playerId}_${season}`;
  if (bdlSeasonAverageCache.has(cacheKey)) {
    return bdlSeasonAverageCache.get(cacheKey);
  }
  const durableCacheKey = `nba_season_avg_${season}_${playerId}`;
  let cached = null;
  try {
    cached = await getDurableJson(durableCacheKey);
  } catch (err) {
    if (!rosterDiag.firstDurableGetChecked) {
      rosterDiag.firstDurableGetError = err?.message || String(err);
    }
  } finally {
    rosterDiag.firstDurableGetChecked = true;
  }
  if (cached?._empty) return null;
  if (cached !== null && cached !== undefined) return cached;
  const url = `https://api.balldontlie.io/v1/season_averages?season=${season}&player_id=${playerId}`;
  const row = await enqueueBdlSeasonAverageRequest(async () => {
    const res = await fetch(url, { headers: bdlHeaders(bdlKey) });
    if (!res.ok) {
      console.log(`[diag] fetchSeasonAverageForPlayer player_id=${playerId} url=${url} status=${res.status} hasData0=false`);
      return null;
    }
    const data = await res.json();
    const dataRow = Array.isArray(data?.data) && data.data[0] ? data.data[0] : null;
    console.log(`[diag] fetchSeasonAverageForPlayer player_id=${playerId} url=${url} status=${res.status} hasData0=${Boolean(dataRow)}`);
    return dataRow || null;
  });
  if (row) await setDurableJson(durableCacheKey, row, { ttlSeconds: 86400 });
  else await setDurableJson(durableCacheKey, { _empty: true }, { ttlSeconds: 86400 });
  bdlSeasonAverageCache.set(cacheKey, row);
  return row;
}

/**
 * Pregame roster + per-player season averages.
 * Step 1: pull active rosters via /v1/players/active for the supplied teamIds (1 batched call).
 * Step 2: fetch per-player season averages via /v1/season_averages?season=YYYY&player_id=N
 *         (parallelized with a small concurrency cap to respect BDL rate limits).
 * Output shape stays compatible with existing consumers (statRowsToPlayers / playerStats).
 *
 * @param {string} bdlKey
 * @param {number} season  - calendar year of fall tipoff (2025-26 season → 2025)
 * @param {number[]} [teamIds]  - if omitted, returns []. Pass the BDL team_ids whose pregame players are needed.
 */
async function fetchSeasonAveragePlayerStats(bdlKey, season, teamIds = []) {
  rosterDiag.lastSeasonAverageTeamIds = [...(teamIds || [])];
  const roster = await fetchActiveRosterPlayers(bdlKey, teamIds);
  if (!roster.length) {
    rosterDiag.lastSeasonAverageReturnedRows = 0;
    return [];
  }

  const concurrency = 6;
  const out = new Array(roster.length).fill(null);
  let cursor = 0;
  async function worker() {
    while (cursor < roster.length) {
      const idx = cursor++;
      const p = roster[idx];
      const avg = await fetchSeasonAverageForPlayer(bdlKey, season, p.playerId);
      out[idx] = {
        playerId: p.playerId,
        name: p.name,
        team: p.team,
        pts: avg?.pts ?? null,
        reb: avg?.reb ?? null,
        ast: avg?.ast ?? null,
        stl: avg?.stl ?? null,
        blk: avg?.blk ?? null,
        pf: avg?.pf ?? null,
        min: avg?.min ?? null,
        fg_pct: avg?.fg_pct ?? null,
        fg3_pct: avg?.fg3_pct ?? null,
        ft_pct: avg?.ft_pct ?? null,
        games_played: avg?.games_played ?? 0,
        season,
        source: avg ? "season_average" : "active_roster",
        statsNote: avg
          ? "Season averages — team field is from BDL player record and may lag mid-season trades. Prefer game_box rows or tonightGame when present."
          : "Active roster only — no season averages yet (early season or rookie).",
      };
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, roster.length) }, () => worker()));
  const result = out.filter(Boolean).sort((a, b) => (b.pts || 0) - (a.pts || 0));
  rosterDiag.lastSeasonAverageReturnedRows = result.length;
  return result;
}

/** Resolve BDL team_ids for every team appearing on the supplied slate (canonicalized abbrs). */
function bdlTeamIdsForSlate(todaysGames) {
  const ids = new Set();
  for (const g of todaysGames || []) {
    const a = canonicalizeTeamAbbr(g?.awayTeam?.abbr);
    const h = canonicalizeTeamAbbr(g?.homeTeam?.abbr);
    if (a && BDL_TEAM_ID_BY_ABBR[a]) ids.add(BDL_TEAM_ID_BY_ABBR[a]);
    if (h && BDL_TEAM_ID_BY_ABBR[h]) ids.add(BDL_TEAM_ID_BY_ABBR[h]);
  }
  return [...ids];
}

/** Resolve BDL team_ids for pregame teams only (state is neither "post" nor "in"). */
function bdlTeamIdsForPregameTeams(todaysGames) {
  const ids = new Set();
  for (const g of todaysGames || []) {
    const state = String(g?.state || "").toLowerCase();
    if (state === "post" || state === "in") continue;
    const a = canonicalizeTeamAbbr(g?.awayTeam?.abbr);
    const h = canonicalizeTeamAbbr(g?.homeTeam?.abbr);
    if (a && BDL_TEAM_ID_BY_ABBR[a]) ids.add(BDL_TEAM_ID_BY_ABBR[a]);
    if (h && BDL_TEAM_ID_BY_ABBR[h]) ids.add(BDL_TEAM_ID_BY_ABBR[h]);
  }
  return [...ids];
}

function bdlTeamIdsForAbbrevs(abbrevs) {
  const ids = new Set();
  for (const abbr of abbrevs || []) {
    const a = canonicalizeTeamAbbr(abbr);
    if (a && BDL_TEAM_ID_BY_ABBR[a]) ids.add(BDL_TEAM_ID_BY_ABBR[a]);
  }
  return [...ids];
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
  magic: "ORL",
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

function attachPraFieldsToPlayerRow(p) {
  const rg = Array.isArray(p?.recentGames) ? p.recentGames : [];
  let praSeason = null;
  if (p.pts != null && p.reb != null && p.ast != null) {
    praSeason = Number(p.pts) + Number(p.reb) + Number(p.ast);
  }
  let praRecent = null;
  let praFloor = null;
  let praCeiling = null;
  let ptsRecent = null;
  let rebRecent = null;
  let astRecent = null;
  let ptsFloor = null;
  let ptsCeiling = null;
  let rebFloor = null;
  let rebCeiling = null;
  let astFloor = null;
  let astCeiling = null;
  if (rg.length > 0) {
    const pras = rg.map(
      (g) => Number(g?.pts || 0) + Number(g?.reb || 0) + Number(g?.ast || 0),
    );
    praRecent = pras.reduce((sum, n) => sum + n, 0) / rg.length;
    praFloor = Math.min(...pras);
    praCeiling = Math.max(...pras);

    const ptss = rg
      .map((g) => (g?.pts == null ? NaN : Number(g.pts)))
      .filter((n) => Number.isFinite(n));
    const rebs = rg
      .map((g) => (g?.reb == null ? NaN : Number(g.reb)))
      .filter((n) => Number.isFinite(n));
    const asts = rg
      .map((g) => (g?.ast == null ? NaN : Number(g.ast)))
      .filter((n) => Number.isFinite(n));
    if (ptss.length > 0) {
      ptsRecent = ptss.reduce((sum, n) => sum + n, 0) / ptss.length;
      ptsFloor = Math.min(...ptss);
      ptsCeiling = Math.max(...ptss);
    }
    if (rebs.length > 0) {
      rebRecent = rebs.reduce((sum, n) => sum + n, 0) / rebs.length;
      rebFloor = Math.min(...rebs);
      rebCeiling = Math.max(...rebs);
    }
    if (asts.length > 0) {
      astRecent = asts.reduce((sum, n) => sum + n, 0) / asts.length;
      astFloor = Math.min(...asts);
      astCeiling = Math.max(...asts);
    }
  }
  return {
    ...p,
    praSeason,
    praRecent,
    praFloor,
    praCeiling,
    ptsRecent,
    rebRecent,
    astRecent,
    ptsFloor,
    ptsCeiling,
    rebFloor,
    rebCeiling,
    astFloor,
    astCeiling,
  };
}

function formatPraToken(v) {
  if (v == null || Number.isNaN(v)) return "n/a";
  if (typeof v === "number" && !Number.isInteger(v)) {
    const rounded = Math.round(v * 10) / 10;
    return String(rounded);
  }
  return String(v);
}

function buildPlayerStatsSummaryLines(players, statsSource) {
  const header =
    statsSource === "game_box"
      ? "PLAYER SNAPSHOT (from today's game box scores — team = who they played for in that game)"
      : statsSource === "hybrid_game_box_plus_pregame_season"
        ? "PLAYER SNAPSHOT (today's box scores PLUS season averages for teams whose games have not tipped yet — prefer tonightGame / props for matchup)"
        : "PLAYER SNAPSHOT (season averages — NOT live roster; team may lag trades. Cross-check tonightGame / props.)";
  const lines = (players || []).slice(0, 120).flatMap((p) => {
    const pts = p.pts != null ? `${Number(p.pts)}` : "?";
    const reb = p.reb != null ? `${Number(p.reb)}` : "?";
    const ast = p.ast != null ? `${Number(p.ast)}` : "?";
    const min = p.min != null ? ` ${p.min}min` : "";
    const fouls = p.pf != null ? ` ${Number(p.pf)}pf` : "";
    const tg = p.tonightGame ? ` | Tonight: ${p.tonightGame}` : "";
    const tag = p.source === "season_average" ? " [season avg]" : "";
    const base = `${p.name} (${p.team}) — ${pts}pts ${reb}reb ${ast}ast${min}${fouls}${tg}${tag}`;
    const rg = Array.isArray(p.recentGames) ? p.recentGames : [];
    const recentLine =
      rg.length > 0
        ? `Last ${rg.length} games: ${rg
            .map(
              (g) =>
                `${g.date} vs ${g.matchup}: ${g.pts}pts ${g.reb}reb ${g.ast}ast`,
            )
            .join(" | ")}`
        : "(no recent game log available)";
    const recentAveragesLine =
      rg.length > 0
        ? `Recent form: ${formatPraToken(p.ptsRecent)} pts | ${formatPraToken(p.rebRecent)} reb | ${formatPraToken(p.astRecent)} ast over last ${rg.length} games`
        : "";
    const praLine = `PRA: season avg ${formatPraToken(p.praSeason)} | recent avg ${formatPraToken(p.praRecent)} | range ${formatPraToken(p.praFloor)}–${formatPraToken(p.praCeiling)}`;
    return recentAveragesLine
      ? [base, recentLine, recentAveragesLine, praLine]
      : [base, recentLine, praLine];
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
async function getNbaPlayerStatsBundle(bdlKey, todaysGames = [], focusTeamAbbrevs = []) {
  if (!bdlKey) {
    const empty = { playerStats: [], playerStatsText: "", statsSource: "none" };
    return empty;
  }

  const season = getNbaSeasonContext().season;
  const focusTeamIds = bdlTeamIdsForAbbrevs(focusTeamAbbrevs);

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
      const seasonAvg = await fetchSeasonAveragePlayerStats(
        bdlKey,
        season,
        focusTeamIds.length ? focusTeamIds : bdlTeamIdsForPregameTeams(todaysGames),
      );
      const merged = mergeGameBoxWithPregameSeasonAverages(playerStats, todaysGames, seasonAvg);
      playerStats = merged.players;
      statsSource = merged.statsSource;
    } else {
      playerStats = await fetchSeasonAveragePlayerStats(
        bdlKey,
        season,
        focusTeamIds.length ? focusTeamIds : bdlTeamIdsForSlate(todaysGames),
      );
      statsSource = "season_average";
    }

    playerStats = playerStats.map(attachPraFieldsToPlayerRow);
    const playerStatsText = buildPlayerStatsSummaryLines(playerStats, statsSource);

    return { playerStats, playerStatsText, statsSource };
  } catch (err) {
    console.warn("getNbaPlayerStatsBundle error:", err.message);
    const fallback = await fetchSeasonAveragePlayerStats(
      bdlKey,
      season,
      focusTeamIds.length ? focusTeamIds : bdlTeamIdsForSlate(todaysGames),
    );
    const fallbackWithPra = fallback.map(attachPraFieldsToPlayerRow);
    return {
      playerStats: fallbackWithPra,
      playerStatsText: buildPlayerStatsSummaryLines(fallbackWithPra, "season_average"),
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
    const injuryMap = await fetchPlayerInjuries(bdlKey);
    const rows = Object.entries(injuryMap || {}).map(([playerId, meta]) => ({
      playerId: Number(playerId),
      player: String(meta?.player || "").trim(),
      team: String(meta?.team || "").trim().toUpperCase(),
      status: String(meta?.status || "").trim(),
      detail: String(meta?.description || "").trim(),
      returnDate: String(meta?.returnDate || "").trim(),
    }));
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

function buildRecentGameLogEntry(row) {
  const game = row?.game || {};
  const homeAbbr = canonicalizeTeamAbbr(game?.home_team?.abbreviation || "");
  const awayAbbr = canonicalizeTeamAbbr(game?.visitor_team?.abbreviation || "");
  const gameDate = String(game?.date || row?.date || "").trim();
  return {
    gameId: game?.id ?? null,
    date: gameDate || null,
    matchup: awayAbbr && homeAbbr ? `${awayAbbr} @ ${homeAbbr}` : "",
    pts: row?.pts ?? null,
    reb: row?.reb ?? null,
    ast: row?.ast ?? null,
    stl: row?.stl ?? null,
    blk: row?.blk ?? null,
    min: row?.min ?? null,
    fg_pct: row?.fg_pct ?? null,
    fg3_pct: row?.fg3_pct ?? null,
    ft_pct: row?.ft_pct ?? null,
  };
}

async function fetchRecentGameLogs(bdlKey, playerStats, focusTeamAbbrevs) {
  if (!bdlKey) return {};
  const focus = new Set((focusTeamAbbrevs || []).map((a) => String(a || "").toUpperCase()).filter(Boolean));
  if (!focus.size) {
    const tonightTeams = new Set(
      (playerStats || [])
        .filter((p) => p?.tonightGame)
        .map((p) => String(p?.team || "").toUpperCase())
        .filter(Boolean),
    );
    if (!tonightTeams.size) return {};
    tonightTeams.forEach((t) => focus.add(t));
  }

  const targetPlayerIds = [...new Set(
    (playerStats || [])
      .filter((p) => focus.has(String(p?.team || "").toUpperCase()))
      .map((p) => Number(p?.playerId))
      .filter(Number.isFinite),
  )].slice(0, 40);
  if (!targetPlayerIds.length) return {};

  const byPlayer = {};
  const chunkSize = 10;
  for (let i = 0; i < targetPlayerIds.length; i += chunkSize) {
    const chunk = targetPlayerIds.slice(i, i + chunkSize);
    let cursor = null;
    let pages = 0;
    while (pages < 10) {
      const qs = new URLSearchParams();
      qs.append("per_page", "100");
      chunk.forEach((id) => qs.append("player_ids[]", String(id)));
      if (cursor != null && cursor !== "") qs.append("cursor", String(cursor));
      const data = await fetchJsonOrNull(`https://api.balldontlie.io/v1/stats?${qs.toString()}`, bdlKey);
      if (!data || !Array.isArray(data.data) || data.data.length === 0) break;
      for (const row of data.data) {
        const playerId = Number(row?.player?.id || row?.player_id);
        if (!Number.isFinite(playerId)) continue;
        if (!byPlayer[playerId]) byPlayer[playerId] = [];
        byPlayer[playerId].push(row);
      }
      const next = data.meta?.next_cursor;
      if (next == null || next === "") break;
      cursor = next;
      pages += 1;
    }
  }

  const out = {};
  for (const [playerIdStr, rows] of Object.entries(byPlayer)) {
    const top = [...rows]
      .sort((a, b) => Date.parse(String(b?.game?.date || "")) - Date.parse(String(a?.game?.date || "")))
      .slice(0, 5)
      .map(buildRecentGameLogEntry);
    out[playerIdStr] = top;
  }
  return out;
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

function formatLiveEdgeBeneficiaryLine(fouledRole, beneficiaryName, beneficiaryRole) {
  const n = String(beneficiaryName || "").trim();
  if (!n) return null;
  const fr = String(fouledRole || "");
  const br = String(beneficiaryRole || "");
  if (fr === "big" || br === "big") {
    return `${n} rebounding props worth watching before the market adjusts.`;
  }
  if (fr === "guard" || br === "guard") {
    return `${n} assists and scoring props worth watching before the market adjusts.`;
  }
  return `${n} perimeter scoring props worth watching before the market adjusts.`;
}

function pickLiveEdgeBeneficiary({
  fouledStats,
  fouledName,
  teamAbbr,
  playersByTeamAbbrev,
  playerStats,
}) {
  const team = String(teamAbbr || "").toUpperCase();
  const roster = Array.isArray(playersByTeamAbbrev?.[team]) ? playersByTeamAbbrev[team] : [];
  const fouledKey = String(fouledName || "").trim().toLowerCase();
  const fouledRole = inferPlayerRoleFromStats(fouledStats);
  let bestName = "";
  let bestRole = "";
  let bestScore = -1;
  for (const nm of roster) {
    const label = String(nm || "").trim();
    const nk = label.toLowerCase();
    if (!label || nk === fouledKey) continue;
    const row = (playerStats || []).find(
      (p) =>
        String(p?.team || "").toUpperCase() === team &&
        String(p?.name || "").trim().toLowerCase() === nk,
    );
    if (!row) continue;
    const role = inferPlayerRoleFromStats(row);
    let score = 0;
    if (fouledRole === "big") {
      score =
        role === "big"
          ? Number(row.reb || 0) * 12 + Number(row.pts || 0)
          : Number(row.reb || 0) * 8 + Number(row.pts || 0);
    } else if (fouledRole === "guard") {
      score = Number(row.ast || 0) * 12 + Number(row.pts || 0);
    } else {
      score = Number(row.pts || 0) * 2 + Number(row.ast || 0);
    }
    if (score > bestScore) {
      bestScore = score;
      bestName = label;
      bestRole = role;
    }
  }
  if (!bestName) {
    return { beneficiaryName: null, beneficiaryPosition: null, beneficiaryLine: null };
  }
  return {
    beneficiaryName: bestName,
    beneficiaryPosition: bestRole,
    beneficiaryLine: formatLiveEdgeBeneficiaryLine(fouledRole, bestName, bestRole),
  };
}

/**
 * Phase 1 foul-trouble alerts from confirmed BDL box `pf` only (no inference).
 * Star gate: season PPG ≥ 15 from BDL season_averages (cached).
 */
export async function buildNbaLiveEdgeAlerts(board = {}) {
  const bdlKey = getEnv("BALLDONTLIE_API_KEY");
  const season = getNbaSeasonContext().season;
  const todaysGames = Array.isArray(board.todaysGames) ? board.todaysGames : [];
  const playerStats = Array.isArray(board.playerStats) ? board.playerStats : [];
  const playersByTeamAbbrev =
    board?.rosterGrounding?.playersByTeamAbbrev &&
    typeof board.rosterGrounding.playersByTeamAbbrev === "object"
      ? board.rosterGrounding.playersByTeamAbbrev
      : {};

  if (!bdlKey || !todaysGames.length || !playerStats.length) return [];

  const liveGames = todaysGames.filter((g) => String(g?.state || "").toLowerCase() === "in");
  if (!liveGames.length) return [];

  const rosterHas = (teamAbbr, playerName) => {
    const team = String(teamAbbr || "").toUpperCase();
    const list = Array.isArray(playersByTeamAbbrev[team]) ? playersByTeamAbbrev[team] : [];
    const pk = String(playerName || "").trim().toLowerCase();
    return list.some((n) => String(n || "").trim().toLowerCase() === pk);
  };

  const ppgCache = new Map();
  const seasonPpg = async (playerId) => {
    const id = Number(playerId);
    if (!Number.isFinite(id)) return null;
    const key = String(id);
    if (ppgCache.has(key)) return ppgCache.get(key);
    const row = await fetchSeasonAverageForPlayer(bdlKey, season, id);
    const v = row?.pts != null ? Number(row.pts) : null;
    ppgCache.set(key, v);
    return v;
  };

  /** Stage 1 — foul + lineup gates only (no season avg yet). */
  const pending = [];
  for (const g of liveGames) {
    const gid = g?.id;
    const period = Number(g?.period);
    if (gid == null || !Number.isFinite(period) || period < 1 || period > 2) continue;

    const home = canonicalizeTeamAbbr(g?.homeTeam?.abbr);
    const away = canonicalizeTeamAbbr(g?.awayTeam?.abbr);

    for (const p of playerStats) {
      if (Number(p?.gameId) !== Number(gid)) continue;
      const team = String(p?.team || "").toUpperCase();
      if (team !== home && team !== away) continue;
      if (p.pf == null || p.pf === "") continue;
      const pf = Number(p.pf);
      if (!Number.isFinite(pf)) continue;

      const playerName = String(p?.name || "").trim();
      const playerId = p?.playerId;
      if (!playerName || !rosterHas(team, playerName)) continue;

      let quarterLabel = "";
      let fires = false;
      if (period === 1 && pf >= 2) {
        fires = true;
        quarterLabel = "Q1 still active";
      } else if (period === 2 && pf >= 3) {
        fires = true;
        quarterLabel = "first half still active";
      }
      if (!fires) continue;

      pending.push({ g, gid, period, p, team, playerName, playerId, pf, quarterLabel });
    }
  }

  const starIds = [...new Set(pending.map((x) => Number(x.playerId)).filter(Number.isFinite))];
  for (const id of starIds) {
    await seasonPpg(id);
  }

  const alerts = [];
  for (const row of pending) {
    const ppg = ppgCache.get(String(row.playerId));
    if (ppg == null || ppg < 15) continue;

    const ben = pickLiveEdgeBeneficiary({
      fouledStats: row.p,
      fouledName: row.playerName,
      teamAbbr: row.team,
      playersByTeamAbbrev,
      playerStats,
    });

    alerts.push({
      id: `live_edge_${row.gid}_${row.playerId}`,
      playerId: row.playerId,
      playerName: row.playerName,
      team: row.team,
      fouls: row.pf,
      quarter: row.period,
      quarterLabel: row.quarterLabel,
      beneficiaryName: ben.beneficiaryName,
      beneficiaryPosition: ben.beneficiaryPosition,
      beneficiaryLine: ben.beneficiaryLine,
      gameId: row.gid,
    });
  }

  return alerts;
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

/** Final head-to-head game between two abbrs from ESPN scoreboard event (post only). */
function extractFinishedHeadToHeadGameTotals(event, seriesAway, seriesHome) {
  const st = String(event?.status?.type?.state || "").toLowerCase();
  if (st !== "post") return null;
  const stRaw = event?.season?.type;
  if (stRaw === 2 || stRaw === "2") return null;

  const comp = event?.competitions?.[0];
  const home = comp?.competitors?.find((c) => c.homeAway === "home");
  const away = comp?.competitors?.find((c) => c.homeAway === "away");
  const ha = canonicalizeTeamAbbr(home?.team?.abbreviation);
  const aa = canonicalizeTeamAbbr(away?.team?.abbreviation);
  if (!ha || !aa) return null;
  const sa = String(seriesAway || "").toUpperCase();
  const sh = String(seriesHome || "").toUpperCase();
  const set = new Set([aa, ha]);
  if (!set.has(sa) || !set.has(sh)) return null;

  const hs = parseInt(String(home?.score ?? ""), 10);
  const aws = parseInt(String(away?.score ?? ""), 10);
  if (!Number.isFinite(hs) || !Number.isFinite(aws)) return null;

  return {
    combinedPoints: aws + hs,
    awayScore: aws,
    homeScore: hs,
    awayAbbrBoard: aa,
    homeAbbrBoard: ha,
    startTimeUtc: String(event?.date || "").trim() || null,
    eventId: event?.id ?? null,
  };
}

/** Attach completed-game combined point totals per series row (ESPN scoreboard date range). */
async function enrichPlayoffSeriesRowsWithCompletedGameTotals(seriesRows) {
  if (!Array.isArray(seriesRows) || seriesRows.length === 0) return seriesRows;
  const endEt = getTodayEtDateString();
  const startEt = addCalendarDaysEt(endEt, -28);
  const rangeToken = `${toEspnDateToken(startEt)}-${toEspnDateToken(endEt)}`;
  let events = [];
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${encodeURIComponent(rangeToken)}`,
      { cache: "no-store" },
    );
    if (res.ok) {
      const data = await res.json();
      events = data?.events || [];
    }
  } catch (err) {
    console.warn("playoff series scoreboard range fetch:", err.message);
  }

  return seriesRows.map((row) => {
    const aa = String(row?.away || "").toUpperCase();
    const hh = String(row?.home || "").toUpperCase();
    if (!aa || !hh) return row;
    const games = events
      .map((ev) => extractFinishedHeadToHeadGameTotals(ev, aa, hh))
      .filter(Boolean)
      .sort((a, b) => Date.parse(a.startTimeUtc || 0) - Date.parse(b.startTimeUtc || 0));
    const totals = games.map((g) => g.combinedPoints).filter((n) => Number.isFinite(n));
    const avg =
      totals.length > 0 ? Math.round((totals.reduce((s, n) => s + n, 0) / totals.length) * 10) / 10 : null;
    return {
      ...row,
      completedGamesCombinedPoints: games,
      completedGamesCombinedPointsAverage: avg,
    };
  });
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
          home: canonicalizeTeamAbbr(home?.team?.abbreviation),
          away: canonicalizeTeamAbbr(away?.team?.abbreviation),
          homeWins: parseInt(home?.wins || 0, 10) || 0,
          awayWins: parseInt(away?.wins || 0, 10) || 0,
          status: s.status?.type?.description || s.statusText || "",
        };
      })
      .filter((s) => s.home || s.away);
    return rows;
  };

  const fromScoreboardEndpoint = async () => {
    const todayYmd = toEspnDateToken(getTodayEtDateString());
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${encodeURIComponent(todayYmd)}&groups=playoff`,
      { cache: "no-store" },
    );
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
        home: canonicalizeTeamAbbr(home?.team?.abbreviation),
        away: canonicalizeTeamAbbr(away?.team?.abbreviation),
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
      const enriched = await enrichPlayoffSeriesRowsWithCompletedGameTotals(filtered);
      setCached(cacheKey, enriched);
      return enriched;
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

/** Prepended in board JSON immediately before `injuries` so UR Take stringified context lists injuries last. */
const NBA_INJURIES_CONTEXT_NOTE =
  "INJURY CONTEXT (background only — do not open response with this information, do not frame as primary edge):";

/**
 * Fresh NBA payload for UR Take — **do not rely on the browser-cached board**.
 * Prioritizes Odds prop pulls + stat rows for teams named in the question (e.g. MIN @ DEN).
 */
export async function buildNbaUrTakeBoard(question = "") {
  const boardStart = Date.now();
  const ODDS_KEY = getEnv("ODDS_API_KEY");
  const BDL_KEY = getEnv("BALLDONTLIE_API_KEY");
  const boost = extractNbaTeamAbbrevsFromQuestion(String(question || ""));

  const tgRes = await getTodaysGames(ODDS_KEY, BDL_KEY);
  const todaysGames = tgRes.games || [];
  const todaysGamesSlateMeta = tgRes.slateMeta;

  const [rawBundle, statsBundle, playoffSeries] = await Promise.all([
    getNbaPropLines(ODDS_KEY, { priorityAbbrevs: boost, maxEvents: 18 }),
    getNbaPlayerStatsBundle(BDL_KEY, todaysGames, boost),
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
  const recentGameLogsByPlayerId = await fetchRecentGameLogs(
    BDL_KEY,
    playerStatsWithTonight,
    boost,
  );
  const playerStatsWithRecent = playerStatsWithTonight.map((p) => {
    const playerId = Number(p?.playerId);
    const recentGames = Number.isFinite(playerId)
      ? recentGameLogsByPlayerId[String(playerId)] || []
      : [];
    return attachPraFieldsToPlayerRow({ ...p, recentGames });
  });
  const playerStatsTextMerged = buildPlayerStatsSummaryLines(
    playerStatsWithRecent,
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
    playerStats: playerStatsWithRecent.slice(0, 120),
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
    propFeedMeta,
    playoffSeries,
    recentForm: "",
    h2hSplits: [],
    gameTotals: buildGameTotalsFromProps(propLines),
    bdlGrounding: buildBdlGroundingEnvelope({
      playerStats: playerStatsWithRecent,
      todaysGames,
      injuries,
    }),
    injuriesContextNote: NBA_INJURIES_CONTEXT_NOTE,
    injuries,
    fetchedAt: new Date().toISOString(),
    urTakeParsing: {
      boostedTeamAbbrevsFromQuestion: boost,
      note: boost.length
        ? `Question referenced teams: ${boost.join(", ")} — props and player rows are ordered for this matchup first.`
        : "",
    },
  };
  board.bdlAvailability = board?.bdlGrounding?.bdlAvailability || {};

  board.newsImpact = buildNbaNewsImpact(board);
  board.liveEdgeAlerts = await buildNbaLiveEdgeAlerts(board);
  board = prioritizeNbaBoardForQuestion(board, boost);
  try {
    board.playoffPathGrounding = await buildNbaPlayoffPathGrounding(board.playoffSeries || [], boost);
  } catch (err) {
    console.warn("[nba] playoffPathGrounding failed:", err?.message || err);
    board.playoffPathGrounding = null;
  }
  console.log(JSON.stringify({
    event: "nba_board_complete",
    durationMs: Date.now() - boardStart,
    playerStatsCount: board?.playerStats?.length || 0,
    propLinesCount: board?.propLines?.length || 0,
    rosterQuality: board?.rosterGrounding?.rosterGroundingQuality || "unknown",
  }));
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
      let games = tg.games || [];
      if (!games.length) {
        const rec = await recoverLastKnownHomeNbaGames();
        if (rec?.games?.length) games = rec.games;
      }
      return res.status(200).json(games);
    }

    if (view === "board") {
      const boardCacheKey = `nba_board_${new Date().getFullYear()}_le1`;
      const boardCached = getCached(boardCacheKey);
      if (boardCached) {
        let out = boardCached;
        const cachedTodays = Array.isArray(out.todaysGames) ? out.todaysGames : [];
        if (cachedTodays.length === 0) {
          const rec = await recoverLastKnownHomeNbaGames();
          if (rec?.games?.length) {
            out = {
              ...out,
              todaysGames: rec.games,
              slateRecovery: { fromLastKnownKv: true, lastUpdated: rec.lastUpdated },
              fetchedAt: new Date().toISOString(),
            };
          }
        }
        const liveEdgeAlertsCached = await buildNbaLiveEdgeAlerts(out);
        return res.status(200).json({ ...out, liveEdgeAlerts: liveEdgeAlertsCached });
      }

      const tgRes = await getTodaysGames(ODDS_KEY, BDL_KEY);
      let todaysGames = tgRes.games || [];
      let slateRecovery = null;
      if (todaysGames.length > 0) {
        await persistLastKnownHomeNbaGames(todaysGames);
      } else {
        const rec = await recoverLastKnownHomeNbaGames();
        if (rec?.games?.length) {
          todaysGames = rec.games;
          slateRecovery = { fromLastKnownKv: true, lastUpdated: rec.lastUpdated };
        }
      }

      const [rawBundle, statsBundle, playoffSeries] = await Promise.all([
        getNbaPropLines(ODDS_KEY, {}),
        getNbaPlayerStatsBundle(BDL_KEY, todaysGames),
        getNbaPlayoffSeries(),
      ]);
      const rawPropLines = rawBundle.propLines || [];
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
      const recentGameLogsByPlayerId = await fetchRecentGameLogs(
        BDL_KEY,
        playerStatsWithTonight,
        [],
      );
      const playerStatsWithRecent = playerStatsWithTonight.map((p) => {
        const playerId = Number(p?.playerId);
        const recentGames = Number.isFinite(playerId)
          ? recentGameLogsByPlayerId[String(playerId)] || []
          : [];
        return attachPraFieldsToPlayerRow({ ...p, recentGames });
      });

      const playerStatsTextMerged = buildPlayerStatsSummaryLines(
        playerStatsWithRecent,
        statsBundle.statsSource || "season_average",
      );

      const board = {
        seasonContext: getNbaSeasonContext(),
        todaysGames,
        todaysGamesSlateMeta,
        slateRecovery,
        lastNight: [], lastNightStats: [], liveStats: [],
        playerStats: playerStatsWithRecent.slice(0, 120),
        playerStatsText: playerStatsTextMerged,
        statsSource: statsBundle.statsSource || "unknown",
        rosterGrounding: buildNbaRosterGrounding(
          playerStatsWithRecent,
          propLines,
          injuries,
          statsBundle.statsSource || "unknown",
          todaysGames,
        ),
        propLines: propLines.slice(0, 120),
        propFeedMeta,
        playoffSeries,
        recentForm: "",
        h2hSplits: [],
        gameTotals: buildGameTotalsFromProps(propLines),
        bdlGrounding: buildBdlGroundingEnvelope({
          playerStats: playerStatsWithRecent,
          todaysGames,
          injuries,
        }),
        injuriesContextNote: NBA_INJURIES_CONTEXT_NOTE,
        injuries,
        fetchedAt: new Date().toISOString(),
        _rosterDiag: {
          pregameTeamIdCount: rosterDiag.lastSeasonAverageTeamIds.length,
          pregameTeamIds: rosterDiag.lastSeasonAverageTeamIds,
          seasonAverageReturnedRows: rosterDiag.lastSeasonAverageReturnedRows,
          firstDurableGetError: rosterDiag.firstDurableGetError,
        },
      };
      board.bdlAvailability = board?.bdlGrounding?.bdlAvailability || {};
      board.newsImpact = buildNbaNewsImpact(board);
      board.liveEdgeAlerts = await buildNbaLiveEdgeAlerts(board);

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
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
