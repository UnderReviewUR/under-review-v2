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
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}
function toEtDateString(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
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

  return {
    id: g.id,
    status,
    state,
    statusCode,
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

/** Odds API only — used when BDL returns no rows or is unavailable. */
async function getTodaysGamesFromOddsApi(oddsKey, todayET) {
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
              .filter((g) => toEtDateString(g.commence_time) === todayET)
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
  const slateMeta = {
    primarySource: "none",
    bdlQueriedOk: false,
    bdlGameCount: 0,
    etDate: todayET,
    note: null,
  };

  if (bdlKey) {
    try {
      const bdlRows = await fetchBdlGamesForDate(bdlKey, todayET);
      slateMeta.bdlQueriedOk = true;
      slateMeta.bdlGameCount = bdlRows.length;
      if (bdlRows.length > 0) {
        const games = bdlRows.map(mapBdlGameRowToAppGame);
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

  const games = await getTodaysGamesFromOddsApi(oddsKey, todayET);
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

async function getNbaPropLines(oddsKey) {
  if (!oddsKey) return [];
  const cacheKey = "nba_props_v2";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const eventsRes = await fetch(`https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${oddsKey}&regions=us&markets=h2h&oddsFormat=american`);
    if (!eventsRes.ok) return [];
    const events = await eventsRes.json();
    if (!Array.isArray(events) || !events.length) return [];

    const todayET = getTodayEtDateString();
    const tomorrowET = getTomorrowEtDateString();

    console.log(
      JSON.stringify({
        event: "nba_props_events",
        oddsKeyPresent: !!oddsKey,
        eventsFound: Array.isArray(events) ? events.length : 0,
        todayET,
        tomorrowET,
        eventDates: (events || []).slice(0, 6).map((e) => ({
          id: e.id,
          home: e.home_team,
          away: e.away_team,
          commence_utc: e.commence_time,
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

    const targetEvents = events
      .filter((e) => {
        const d = toEtDateString(e.commence_time);
        return d === todayET || d === tomorrowET;
      })
      .slice(0, 6);

    console.log(
      JSON.stringify({
        event: "nba_props_filtered",
        todayEventsCount: targetEvents.length,
        targetEventIds: targetEvents.map((e) => e.id),
      }),
    );

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

        console.log(
          JSON.stringify({
            event: "nba_props_per_event",
            eventId: event.id,
            home: event.home_team,
            away: event.away_team,
            propResOk: propRes.ok,
            propResStatus: propRes.status,
            bookmakerCount: bookmakers.length,
            bookmakerKeys: bookmakers.map((b) => b.key),
            preferredKey: preferred?.key || "none",
            marketCount: preferred?.markets?.length || 0,
            marketsFound: (preferred?.markets || []).map((m) => m.key),
          }),
        );

        if (!propRes.ok || !preferred) continue;

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
        continue;
      }
    }

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

    if (propLines.length > 0) {
      setCached(cacheKey, propLines);
    }
    return propLines;
  } catch (err) {
    console.error("NBA props error:", err.message);
    return [];
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

/**
 * Per-team player names derived only from API payloads (box stats, injuries, prop↔stats match,
 * plus tonightGame + todaysGames for verified slate team keys).
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

  const teamByPropPlayerLower = new Map();
  for (const p of playerStats || []) {
    const k = String(p.name || "")
      .trim()
      .toLowerCase();
    if (!k || !p.team || p.team === "UNK") continue;
    if (!teamByPropPlayerLower.has(k)) teamByPropPlayerLower.set(k, p.team);
  }

  for (const p of playerStats || []) {
    const name = String(p?.name || "").trim();
    if (!name || !p?.team) continue;

    const tg = parseTonightGameAbbrs(p.tonightGame);
    if (tg) {
      const tu = String(p.team || "").toUpperCase();
      let resolved = tu === tg.away || tu === tg.home ? tu : "";
      if (!resolved) {
        const fromProp = String(teamByPropPlayerLower.get(name.toLowerCase()) || "").toUpperCase();
        if (fromProp === tg.away || fromProp === tg.home) resolved = fromProp;
      }
      if (resolved) add(resolved, name);
      continue;
    }

    if (statsSource === "game_box") {
      add(p.team, name);
    } else if (tonightTeams.size === 0 || tonightTeams.has(String(p.team || "").toUpperCase())) {
      add(p.team, name);
    }
  }

  for (const inj of injuries || []) {
    if (inj?.team && inj?.player) add(inj.team, inj.player);
  }

  for (const pl of propLines || []) {
    const pname = pl?.player;
    if (!pname) continue;
    const k = String(pname).trim().toLowerCase();
    const t = teamByPropPlayerLower.get(k);
    if (t) add(t, pname);
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
      } else {
        const fromProp = String(teamByPropPlayerLower.get(name.toLowerCase()) || "").toUpperCase();
        if (fromProp === away || fromProp === home) add(fromProp, name);
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

function buildPlayerStatsSummaryLines(players, statsSource) {
  const header =
    statsSource === "game_box"
      ? "PLAYER SNAPSHOT (from today's game box scores — team = who they played for in that game)"
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
 * Prefer today's BDL game stats (correct team per game). Fall back to season averages
 * when there is no slate or no box score yet.
 */
async function getNbaPlayerStatsBundle(bdlKey) {
  const todayIso = getTodayEtDateString();
  const cacheKey = `nba_player_bundle_${todayIso}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  if (!bdlKey) {
    const empty = { playerStats: [], playerStatsText: "", statsSource: "none" };
    return empty;
  }

  const season = new Date().getFullYear();

  try {
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
    } else {
      playerStats = await fetchSeasonAveragePlayerStats(bdlKey, season);
      statsSource = "season_average";
    }

    const playerStatsText = buildPlayerStatsSummaryLines(playerStats, statsSource);

    const bundle = { playerStats, playerStatsText, statsSource };
    setCached(cacheKey, bundle);
    return bundle;
  } catch (err) {
    console.warn("getNbaPlayerStatsBundle error:", err.message);
    const fallback = await fetchSeasonAveragePlayerStats(bdlKey, season);
    const bundle = {
      playerStats: fallback,
      playerStatsText: buildPlayerStatsSummaryLines(fallback, "season_average"),
      statsSource: "season_average",
    };
    setCached(cacheKey, bundle);
    return bundle;
  }
}

async function getNbaInjuries(propLines, todaysGames) {
  const cacheKey = "nba_injuries";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const propPlayers = new Set((propLines||[]).map(p=>p.player).filter(Boolean).map(p=>String(p).toLowerCase()));
  const gameTeams = new Set();
  for (const g of todaysGames||[]) {
    if (g.homeTeam?.abbr) gameTeams.add(g.homeTeam.abbr);
    if (g.awayTeam?.abbr) gameTeams.add(g.awayTeam.abbr);
  }

  try {
    const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries", { cache:"no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data?.injuries) ? data.injuries : [];

    const injuries = items.map(item => {
      const athlete = item.athlete || {};
      const team    = item.team || athlete.team || {};
      const status  = item.status || item.type || {};
      const name    = athlete.displayName || athlete.fullName || athlete.shortName || "";
      const teamAbbr= team.abbreviation || normalizeTeamAbbr(team.displayName || team.name || "");
      const detail  = item.details?.type?.description || item.details?.detail || status.description || status.name || "";
      const availability = item.details?.availability || status.type || status.abbreviation || status.name || "";
      return { player:name, team:teamAbbr, status:availability, detail };
    }).filter(i => i.player).filter(i => {
      const lower = i.player.toLowerCase();
      return propPlayers.has(lower) || gameTeams.has(i.team);
    });

    setCached(cacheKey, injuries);
    return injuries;
  } catch (err) {
    console.warn("getNbaInjuries error:", err.message);
    return [];
  }
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

      const [tgRes, rawPropLines, statsBundle, playoffSeries] = await Promise.all([
        getTodaysGames(ODDS_KEY, BDL_KEY),
        getNbaPropLines(ODDS_KEY),
        getNbaPlayerStatsBundle(BDL_KEY),
        getNbaPlayoffSeries(),
      ]);
      const todaysGames = tgRes.games;
      const todaysGamesSlateMeta = tgRes.slateMeta;

      const propLines = filterPropLinesForActiveSlate(rawPropLines, todaysGames);

      const injuries = await getNbaInjuries(propLines, todaysGames);

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
        playoffSeries,         recentForm: "", h2hSplits: [],
        gameTotals: buildGameTotalsFromProps(propLines),
        fetchedAt: new Date().toISOString(),
      };

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
