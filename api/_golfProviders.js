import { bdlFetch } from "./_balldontlie.js";
import { etDateStringToEspnYmd, getTodayEtDateString } from "./_espnEtDates.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { PGA_PLAYERS } from "../src/components/data/golf/players.js";
import { buildSportDataCoverage } from "./_dataCoverage.js";
import {
  buildNameToBdlPlayerIdMap,
  enrichGolfLeaderboardWithStats,
} from "./_golfBdlStats.js";
import { normalizePlayerKey } from "./_playerIdentity.js";
import { getStaticPlayerSG } from "./_golfStaticSg.js";

export { getStaticPlayerSG };
import {
  buildCurrentEventFromScheduleRow,
  extractGolfTournamentIntentFromQuestion,
  findBestScheduleRowForIntent,
  golfContextNeedsCourseResolution,
  golfCourseConflictsWithIntent,
  golfCurrentEventMatchesIntent,
  golfLabelsMatchIntent,
} from "../shared/golfTournamentIntent.js";

const GOLF_CUT_LINE_FEED_NOTE =
  "Cut line: not available in current feed. Do not project cut line. Reference make_cut odds only.";

/** Shared major labels — ESPN scoring, BDL pick, and merge conflict resolution. */
const GOLF_MAJOR_NAMES = [
  "pga championship",
  "u.s. open",
  "us open",
  "the open championship",
  "british open",
  "the open",
  "masters",
  "masters tournament",
];

function tournamentNameLooksMajor(name, shortName) {
  const n = `${name || ""} ${shortName || ""}`.toLowerCase();
  return GOLF_MAJOR_NAMES.some((m) => n.includes(m));
}

const PGA_COURSE_COORDS = {
  "Augusta National Golf Club": { lat: 33.5021, lon: -82.0232 },
  "TPC Sawgrass": { lat: 30.1975, lon: -81.3967 },
  "Pebble Beach Golf Links": { lat: 36.5681, lon: -121.9484 },
  "Torrey Pines Golf Course": { lat: 32.8975, lon: -117.2503 },
  "Muirfield Village Golf Club": { lat: 40.1542, lon: -83.0938 },
  "Congressional Country Club": { lat: 39.0117, lon: -77.1347 },
  "Valhalla Golf Club": { lat: 38.2527, lon: -85.5235 },
  "Riviera Country Club": { lat: 34.0438, lon: -118.5126 },
  "Bay Hill Club": { lat: 28.4772, lon: -81.4984 },
  "TPC Scottsdale": { lat: 33.6607, lon: -111.891 },
  "Quail Hollow Club": { lat: 35.149, lon: -80.8773 },
  "Harbour Town Golf Links": { lat: 32.1382, lon: -80.6737 },
  "Colonial Country Club": { lat: 32.7297, lon: -97.3684 },
  "Kiawah Island Golf Resort": { lat: 32.6082, lon: -80.085 },
  "Bethpage Black": { lat: 40.7479, lon: -73.4582 },
  "Southern Hills Country Club": { lat: 36.0668, lon: -95.958 },
  "Oakmont Country Club": { lat: 40.5243, lon: -79.8279 },
  "Winged Foot Golf Club": { lat: 40.9626, lon: -73.7546 },
  "Medinah Country Club": { lat: 41.9722, lon: -88.0281 },
  "East Lake Golf Club": { lat: 33.7157, lon: -84.3024 },
};

function normalizeName(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

/** Top world-ranking players virtually always in major championship fields (fallback when live feed is thin). */
export const MAJOR_FIELD_ALWAYS_INCLUDE = [
  "Scottie Scheffler",
  "Xander Schauffele",
  "Rory McIlroy",
  "Collin Morikawa",
  "Viktor Hovland",
  "Patrick Cantlay",
  "Wyndham Clark",
  "Ludvig Aberg",
  "Tommy Fleetwood",
  "Shane Lowry",
  "Brooks Koepka",
  "Jon Rahm",
  "Bryson DeChambeau",
  "Jordan Spieth",
  "Justin Thomas",
  "Tony Finau",
  "Min Woo Lee",
  "Hideki Matsuyama",
  "Tom Kim",
  "Jason Day",
  "Adam Scott",
  "Matt Fitzpatrick",
  "Sungjae Im",
  "Russell Henley",
  "Sahith Theegala",
  "Cameron Smith",
  "Dustin Johnson",
  "Phil Mickelson",
  "Tiger Woods",
  "Max Homa",
  "Keegan Bradley",
  "Billy Horschel",
  "Chris Kirk",
  "Harris English",
  "Sepp Straka",
  "Cameron Young",
  "Nick Taylor",
  "Corey Conners",
  "Taylor Pendrith",
  "Jake Knapp",
];

/**
 * Normalize golfer display names for matching across feeds (ESPN, BDL, user text).
 * @returns {{ full: string, lastName: string, firstInitial: string }}
 */
export function normalizeGolfName(name) {
  const s = String(name || "").trim().toLowerCase();
  const clean = s.replace(/\./g, "").replace(/\s+/g, " ").trim();
  if (s.includes(",")) {
    const [last, first] = s.split(",").map((p) => p.trim());
    const full = `${first} ${last}`.replace(/\s+/g, " ").trim();
    const parts = full.split(" ").filter(Boolean);
    return {
      full,
      lastName: last || parts[parts.length - 1] || "",
      firstInitial: parts[0]?.[0] || "",
    };
  }
  const parts = clean.split(" ").filter(Boolean);
  return {
    full: clean,
    lastName: parts[parts.length - 1] || "",
    firstInitial: parts[0]?.[0] || "",
  };
}

/** True when two golfer labels refer to the same player (full name or unambiguous last name). */
export function golfPlayerNamesMatch(a, b, lastNameCounts = null) {
  const na = normalizeGolfName(a);
  const nb = normalizeGolfName(b);
  if (!na.full || !nb.full) return false;
  if (na.full === nb.full) return true;
  if (na.lastName && na.lastName === nb.lastName) {
    if (lastNameCounts && lastNameCounts.get(na.lastName) > 1) return false;
    if (na.firstInitial && nb.firstInitial && na.firstInitial !== nb.firstInitial) return false;
    return na.lastName.length >= 3;
  }
  return false;
}

function countGolfLastNames(names) {
  const counts = new Map();
  for (const n of names) {
    const ln = normalizeGolfName(n).lastName;
    if (!ln) continue;
    counts.set(ln, (counts.get(ln) || 0) + 1);
  }
  return counts;
}

function dedupeGolfFieldNames(names) {
  const list = [...names].filter(Boolean);
  const lastCounts = countGolfLastNames(list);
  const byLast = new Map();
  for (const name of list) {
    const ln = normalizeGolfName(name).lastName || normalizeGolfName(name).full;
    if (!ln) continue;
    if (!byLast.has(ln)) byLast.set(ln, []);
    byLast.get(ln).push(name);
  }
  const out = [];
  for (const [, group] of byLast) {
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    const canonical = [...group].sort((a, b) => b.length - a.length)[0];
    if (lastCounts.get(normalizeGolfName(canonical).lastName) === 1) {
      out.push(canonical);
    } else {
      out.push(...group);
    }
  }
  return out;
}

/** Known PGA Tour pro in static repo data or major-field fallback list. */
export function isKnownPgaTourPlayer(playerName) {
  const raw = String(playerName || "").trim();
  if (!raw) return false;
  if (getStaticPlayerSG(raw)) return true;
  const nl = normalizeGolfName(raw);
  for (const canonical of MAJOR_FIELD_ALWAYS_INCLUDE) {
    if (golfPlayerNamesMatch(raw, canonical)) return true;
  }
  for (const canonical of Object.keys(PGA_PLAYERS)) {
    if (golfPlayerNamesMatch(raw, canonical)) return true;
  }
  return false;
}

/**
 * Build verified field: live leaderboard + rankings + odds field + major fallback.
 * @param {object} golfContext
 * @returns {string[]}
 */
export function buildCombinedVerifiedGolfField(golfContext) {
  const names = [];
  const lb = golfContext?.currentEvent?.leaderboard;
  if (Array.isArray(lb)) {
    for (const row of lb) {
      const n = String(row?.name || row?.player || "").trim();
      if (n) names.push(n);
    }
  }
  for (const r of golfContext?.rankings || []) {
    const n = String(r?.name || "").trim();
    if (n) names.push(n);
  }
  const oddsRows = golfContext?.odds?.outrights;
  if (Array.isArray(oddsRows)) {
    for (const row of oddsRows) {
      const n = String(row?.player || "").trim();
      if (n) names.push(n);
    }
  }
  names.push(...MAJOR_FIELD_ALWAYS_INCLUDE);
  return dedupeGolfFieldNames(names);
}

/**
 * Resolve a golfer name from user text against a field list.
 * @returns {string|null}
 */
export function resolveGolfPlayerInField(queryName, fieldNames) {
  const q = String(queryName || "").trim();
  if (!q) return null;
  const field = Array.isArray(fieldNames) ? fieldNames.filter(Boolean) : [];
  const lastCounts = countGolfLastNames(field);
  for (const n of field) {
    if (golfPlayerNamesMatch(q, n, lastCounts)) return n;
  }
  return null;
}

/** @deprecated — use enrichGolfLeaderboardWithStats via applyGolfBoardStatEnrichment */
function enrichLeaderboardRowsWithStaticSg(rows) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => {
    const label = row?.name || row?.player || "";
    const sg = getStaticPlayerSG(label);
    return {
      ...row,
      sg_total: sg?.sg_total ?? null,
      sg_app: sg?.sg_app ?? null,
      sg_putt: sg?.sg_putt ?? null,
      sg_note: sg ? "season SG (static)" : "SG not available",
      statsSource: sg ? "static_season" : "none",
      statsCoverage: sg ? "full" : "leaderboard_only",
    };
  });
}

/**
 * BDL + static SG enrichment for unified board (call after mergeGolfBoard).
 * @param {object} board
 */
export async function applyGolfBoardStatEnrichment(board) {
  if (!board?.currentEvent) return board;
  const results = Array.isArray(board.recentResults) ? board.recentResults : [];
  const nameToPlayerId = buildNameToBdlPlayerIdMap(results);
  for (const row of board.currentEvent?.leaderboard || []) {
    if (row?.playerId != null) {
      const label = row?.name || row?.player || "";
      if (label) {
        nameToPlayerId.set(normalizePlayerKey(label), row.playerId);
        const last = String(label).split(/\s+/).pop();
        if (last) nameToPlayerId.set(normalizePlayerKey(last), row.playerId);
      }
    }
  }
  const tournamentId = board.tournament?.id ?? null;
  const season =
    board.tournament?.season ??
    (board.currentEvent?.startDate
      ? new Date(board.currentEvent.startDate).getFullYear()
      : new Date().getFullYear());

  const enriched = await enrichGolfLeaderboardWithStats(board.currentEvent.leaderboard || [], {
    tournamentId,
    season,
    nameToPlayerId,
    maxPlayers: 50,
  });

  board.currentEvent = { ...board.currentEvent, leaderboard: enriched };
  board.dataCoverage = buildSportDataCoverage({ sport: "golf", board });
  board.sourceMeta = {
    ...(board.sourceMeta || {}),
    playerStats: enriched.some((r) => String(r?.statsSource || "").startsWith("balldontlie"))
      ? "balldontlie_enriched"
      : board.sourceMeta?.playerStats || "static_or_none",
  };
  return board;
}

function getCourseCoords(courseName) {
  if (!courseName) return null;
  const direct = PGA_COURSE_COORDS[courseName];
  if (direct) return direct;
  const normalizedLookup = normalizeName(courseName);
  for (const [key, coords] of Object.entries(PGA_COURSE_COORDS)) {
    const nk = normalizeName(key);
    if (normalizedLookup.includes(nk) || nk.includes(normalizedLookup)) {
      return coords;
    }
  }
  return null;
}

async function fetchCourseWeather(lat, lon) {
  if (!lat || !lon) return null;
  try {
    const cacheKey = `weather_golf_${lat.toFixed(2)}_${lon.toFixed(2)}`;
    const cached = await getDurableJson(cacheKey);
    if (cached && !cached._empty) return cached;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation_probability,wind_speed_10m&timezone=auto&forecast_days=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const currentHour = new Date().getUTCHours();
    const utcOffsetHours = (data.utc_offset_seconds ?? 0) / 3600;
    const localHour = ((currentHour + utcOffsetHours) % 24 + 24) % 24;

    const windKph =
      data?.current_weather?.windspeed ??
      data?.hourly?.wind_speed_10m?.[Math.floor(localHour)] ??
      null;
    if (windKph === null) return null;

    const windSpeedMph = Math.round(windKph * 0.621371);

    const nowIso = new Date().toISOString().slice(0, 13);
    const hourlyTimes = data?.hourly?.time ?? [];
    const closestIndex = hourlyTimes.findIndex((t) => t.startsWith(nowIso));
    const precipIndex = closestIndex >= 0 ? closestIndex : Math.floor(localHour);
    const precipProbability = data?.hourly?.precipitation_probability?.[precipIndex] ?? 0;

    const result = {
      windSpeedMph,
      precipProbability,
      timestamp: new Date().toISOString(),
    };

    await setDurableJson(cacheKey, result, { ttlSeconds: 300 });
    return result;
  } catch {
    return null;
  }
}

const CACHE_TTL_MS = 3 * 60 * 1000;
/** Max upcoming tournaments in schedule window (BDL + optional ESPN injection); Golf UI shows subset. */
const SCHEDULE_WINDOW_MAX = 10;
const cache = new Map();

function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function setCache(key, value, ttlMs = CACHE_TTL_MS) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function normalizeString(value) {
  return String(value || "").trim().toLowerCase();
}

function slugify(value) {
  return normalizeString(value).replace(/[^a-z0-9]+/g, " ").trim();
}

const BDL_TOURNAMENT_ALIASES = [];

function getBdlTournamentAlias(rawName) {
  const n = slugify(rawName || "");
  return BDL_TOURNAMENT_ALIASES.find((a) => n.includes(a.match)) || null;
}

function parseMonthDayWithSeason(text, season) {
  if (!text) return null;
  const parsed = Date.parse(`${text} ${season}`);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function parseBdlStartTs(value, season) {
  const parsed = Date.parse(value || "");
  if (!Number.isNaN(parsed)) {
    const year = new Date(parsed).getUTCFullYear();
    if (year >= season - 1 && year <= season + 1) return parsed;
  }

  const raw = String(value || "");
  const match = raw.match(/([A-Za-z]{3,9}\s+\d{1,2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const fallback = parseMonthDayWithSeason(match[1], season);
  return fallback == null ? Number.MAX_SAFE_INTEGER : fallback;
}

function parseBdlEndTs(value, season, startTs) {
  const parsed = Date.parse(value || "");
  if (!Number.isNaN(parsed)) {
    const year = new Date(parsed).getUTCFullYear();
    if (year >= season - 1 && year <= season + 1 && parsed >= startTs) {
      if (ymdKeyEastern(parsed) === ymdKeyEastern(startTs)) {
        return startTs + 4 * 24 * 60 * 60 * 1000;
      }
      return parsed;
    }
  }

  const raw = String(value || "");
  const all = [...raw.matchAll(/([A-Za-z]{3,9}\s+\d{1,2})/g)].map((m) => m[1]);
  const endText = all.length > 1 ? all[1] : all[0];
  const fallback = parseMonthDayWithSeason(endText, season);
  if (fallback != null && fallback >= startTs) return fallback;

  // PGA events are typically 4 rounds over 4 days.
  return startTs + 4 * 24 * 60 * 60 * 1000;
}

/** RBC Heritage / Harbour Town — primary field event; never treat Zurich team week as this. */
function eventNameMatchesRbcHeritage(name, shortName) {
  const n = slugify(`${name || ""} ${shortName || ""}`);
  if (n.includes("zurich")) return false;
  if (n.includes("canadian")) return false;
  return (
    n.includes("heritage") ||
    n.includes("harbour town") ||
    n.includes("hilton head") ||
    n.includes("sea pines") ||
    (n.includes("rbc") &&
      (n.includes("heritage") || n.includes("hilton") || n.includes("harbour")))
  );
}

function eventNameLooksZurichOrTeamFormat(name, shortName) {
  const n = slugify(`${name || ""} ${shortName || ""}`);
  if (n.includes("zurich")) return true;
  if (n.includes("new orleans") && n.includes("classic")) return true;
  if (n.includes("two man") || n.includes("two-man")) return true;
  return false;
}

/** Prefer flagship / full-field events when ESPN returns multiple tournaments (e.g. RBC vs Zurich). */
function scorePgaEspnEvent(e) {
  const state = e?.status?.type?.state;
  let score = 0;
  if (state === "in") score += 4000;
  else if (state === "pre") score += 2000;
  else score += 0;

  const n = slugify(e?.name || e?.shortName || "");
  if (n.includes("zurich")) score -= 2500;
  if (n.includes("new orleans")) score -= 800;
  if (n.includes("two man") || n.includes("two-man") || n.includes("team")) score -= 500;

  if (eventNameMatchesRbcHeritage(e?.name, e?.shortName)) score += 3500;
  else if (n.includes("heritage") || n.includes("hilton head") || n.includes("harbour town"))
    score += 800;
  if (n.includes("invitational")) score += 250;
  if (n.includes("memorial")) score += 400;
  if (n.includes("players championship") || n.includes("the players")) score += 400;

  if (tournamentNameLooksMajor(e?.name, e?.shortName)) score += 8000;

  const compCount = e?.competitions?.[0]?.competitors?.length || 0;
  if (compCount > 0) score += Math.min(compCount, 220);

  return score;
}

function isMeaningfulEspnCompetitor(c) {
  const position = String(c?.status?.position?.displayText || "").trim();
  const score = String(c?.score?.displayValue || "").trim();
  const today = String(c?.status?.today?.displayValue || "").trim();
  const thru = String(c?.status?.thru || "").trim();

  if (position && position !== "-" && position !== "--") return true;
  if (thru && thru !== "-" && thru !== "--") return true;
  if (today && today !== "-" && today !== "--") return true;
  if (score && score !== "-" && score !== "--" && score.toUpperCase() !== "E") return true;
  return false;
}

function safeTimeoutSignal(ms) {
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}

async function safeFetchJson(url, options = {}) {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: safeTimeoutSignal(options.timeoutMs || 7000),
      headers: options.headers || {},
    });

    if (!res.ok) {
      let body = null;
      try {
        body = await res.text();
      } catch {
        body = null;
      }

      return {
        ok: false,
        status: res.status,
        data: null,
        error: body || `HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      ok: true,
      status: res.status,
      data,
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err?.message ? String(err.message) : "Something went wrong. Please try again.",
    };
  }
}

async function safeFetchText(url, options = {}) {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: safeTimeoutSignal(options.timeoutMs || 7000),
      headers: options.headers || {},
    });

    if (!res.ok) {
      let body = null;
      try {
        body = await res.text();
      } catch {
        body = null;
      }

      return {
        ok: false,
        status: res.status,
        text: "",
        error: body || `HTTP ${res.status}`,
      };
    }

    const text = await res.text();
    return {
      ok: true,
      status: res.status,
      text,
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      text: "",
      error: "Something went wrong. Please try again.",
    };
  }
}

async function safeBdlFetch(path, params = {}) {
  return bdlFetch(`/pga/v1${path}`, params);
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "TBD";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

/** YYYY-MM-DD in America/New_York (calendar semantics for schedule strings). */
function ymdKeyEastern(dateOrMs) {
  const d = dateOrMs instanceof Date ? dateOrMs : new Date(dateOrMs);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function sameEtYearMonth(a, b) {
  const ka = ymdKeyEastern(a);
  const kb = ymdKeyEastern(b);
  if (!ka || !kb) return false;
  return ka.slice(0, 7) === kb.slice(0, 7);
}

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return "TBD";
  if (startDate && !endDate) return formatDisplayDate(startDate);
  if (!startDate && endDate) return formatDisplayDate(endDate);

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "TBD";
  }

  if (ymdKeyEastern(start) === ymdKeyEastern(end)) {
    const endFallback = new Date(start.getTime() + 4 * 24 * 60 * 60 * 1000);
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "America/New_York",
    })}–${endFallback.toLocaleDateString("en-US", {
      day: "numeric",
      timeZone: "America/New_York",
    })}`;
  }

  const sameMonth = sameEtYearMonth(start, end);

  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "America/New_York",
    })}–${end.toLocaleDateString("en-US", {
      day: "numeric",
      timeZone: "America/New_York",
    })}`;
  }

  return `${formatDisplayDate(startDate)}–${formatDisplayDate(endDate)}`;
}

/** parseBdlStartTs uses MAX_SAFE_INTEGER when the raw date string is unusable for sorting. */
const BDL_SORT_SENTINEL_TS = Number.MAX_SAFE_INTEGER;

function isUsableBdlScheduleTs(ts) {
  return (
    Number.isFinite(ts) &&
    ts > 0 &&
    ts < BDL_SORT_SENTINEL_TS - 24 * 60 * 60 * 1000
  );
}

/**
 * Same visual rules as formatDateRange, using epoch ms (aligns with parseBdlStartTs / parseBdlEndTs).
 * Used when API date strings do not parse with Date() but fuzzy parsers still yield timestamps.
 */
function formatDateRangeFromMillis(startMs, endMs) {
  if (!isUsableBdlScheduleTs(startMs)) return "TBD";

  let end =
    isUsableBdlScheduleTs(endMs) && endMs > startMs
      ? endMs
      : startMs + 4 * 24 * 60 * 60 * 1000;

  const start = new Date(startMs);
  let endDate = new Date(end);

  if (Number.isNaN(start.getTime()) || Number.isNaN(endDate.getTime())) {
    return "TBD";
  }

  if (ymdKeyEastern(start) === ymdKeyEastern(endDate)) {
    endDate = new Date(startMs + 4 * 24 * 60 * 60 * 1000);
  }

  const sameMonth = sameEtYearMonth(start, endDate);

  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "America/New_York",
    })}–${endDate.toLocaleDateString("en-US", {
      day: "numeric",
      timeZone: "America/New_York",
    })}`;
  }

  return `${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  })}–${endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  })}`;
}

/** When BDL schedule row has no parsable display string, copy ESPN week label for the matching event. */
function enrichTourScheduleWithEspn(schedule, espnEvent) {
  if (!Array.isArray(schedule) || schedule.length === 0 || !espnEvent) {
    return schedule;
  }

  let espnDisplay = espnEvent.displayDate;
  if (!espnDisplay || espnDisplay === "TBD") {
    espnDisplay = formatDisplayDate(espnEvent.startDate);
  }
  if (!espnDisplay || espnDisplay === "TBD") return schedule;

  const espnCandidates = [
    slugify(espnEvent.name || ""),
    slugify(espnEvent.shortName || ""),
  ].filter(Boolean);

  return schedule.map((row) => {
    if (row.displayDate && row.displayDate !== "TBD") return row;

    const rowCandidates = [
      slugify(row.name || ""),
      slugify(row.shortName || ""),
    ].filter(Boolean);

    const match = rowCandidates.some((r) =>
      espnCandidates.some((e) => r && e && (r.includes(e) || e.includes(r)))
    );

    if (!match) return row;
    return { ...row, displayDate: espnDisplay };
  });
}

function cleanTournamentStatus(status) {
  const s = normalizeString(status);

  if (!s) return "Upcoming";
  if (s.includes("in_progress") || s === "in") return "Live";
  if (s.includes("final") || s.includes("complete")) return "Final";
  if (s.includes("not_started") || s.includes("scheduled") || s.includes("pre")) {
    return "Upcoming";
  }

  return "Upcoming";
}

function normalizeBdlTournament(tournament) {
  if (!tournament) return null;

  const alias = getBdlTournamentAlias(tournament.name);
  const primaryCourse =
    Array.isArray(tournament.courses) && tournament.courses.length > 0
      ? tournament.courses[0]?.course || null
      : null;

  const city = alias?.canonicalCity || tournament.city || "";
  const state = alias?.canonicalState || tournament.state || "";
  const country = alias?.canonicalCountry || tournament.country || "";
  const name = alias?.canonicalName || tournament.name || "PGA Tour Event";
  const shortName =
    alias?.canonicalShortName || tournament.short_name || tournament.name || "PGA Tour Event";
  const courseName =
    alias?.canonicalCourseName || tournament.course_name || primaryCourse?.name || null;
  const seasonGuess = Number(tournament.season || new Date().getFullYear());
  const startRaw =
    tournament.start_date ?? tournament.startDate ?? null;
  const endRaw = tournament.end_date ?? tournament.endDate ?? null;
  const startTs = parseBdlStartTs(startRaw, seasonGuess);
  const endTs = parseBdlEndTs(endRaw, seasonGuess, startTs);

  const rangeStr = formatDateRange(startRaw, endRaw);
  let displayDate = rangeStr;
  if (rangeStr === "TBD" && isUsableBdlScheduleTs(startTs)) {
    const endForDisplay = isUsableBdlScheduleTs(endTs) ? endTs : startTs + 4 * 24 * 60 * 60 * 1000;
    displayDate = formatDateRangeFromMillis(startTs, endForDisplay);
  }

  return {
    id: tournament.id || null,
    season: tournament.season || null,
    name,
    shortName,
    startDate: startRaw || null,
    endDate: endRaw || null,
    displayDate,
    city,
    state,
    country,
    location: [city, state || country]
      .filter(Boolean)
      .join(", "),
    purse: tournament.purse || null,
    status: cleanTournamentStatus(tournament.status),
    rawStatus: tournament.status || null,
    courseName,
    courseId: primaryCourse?.id || null,
    champion: tournament.champion?.display_name || null,
    aliasApplied: alias?.canonicalName || null,
    startTs: Number.isFinite(startTs) ? startTs : null,
    endTs: Number.isFinite(endTs) ? endTs : null,
    raw: tournament,
  };
}

function normalizeBdlCourse(course) {
  if (!course) return null;

  return {
    id: course.id || null,
    name: course.name || null,
    city: course.city || "",
    state: course.state || "",
    country: course.country || "",
    par: course.par || null,
    yardage: course.yardage || null,
    established: course.established || null,
    architect: course.architect || null,
    fairwayGrass: course.fairway_grass || null,
    roughGrass: course.rough_grass || null,
    greenGrass: course.green_grass || null,
    raw: course,
  };
}

/** PGA tournament round rows — calendar date descending (most recent round first); tie-break by round index. */
function sortPgaRoundRowsDesc(rounds) {
  if (!Array.isArray(rounds) || rounds.length === 0) return [];
  return [...rounds].sort((a, b) => {
    const da =
      Date.parse(String(a?.date ?? a?.round_date ?? "").trim()) ||
      Date.parse(String(a?.played_at ?? "").trim()) ||
      0;
    const db =
      Date.parse(String(b?.date ?? b?.round_date ?? "").trim()) ||
      Date.parse(String(b?.played_at ?? "").trim()) ||
      0;
    if (db !== da) return db - da;
    const na = Number(a?.round_number ?? a?.round ?? 0);
    const nb = Number(b?.round_number ?? b?.round ?? 0);
    return nb - na;
  });
}

function normalizeTournamentResultRow(row) {
  return {
    position: row?.position || null,
    playerId: row?.player?.id || null,
    player: row?.player?.display_name || "",
    country: row?.player?.country_code || row?.player?.country || "",
    score: row?.par_relative_score || null,
    earnings: row?.earnings || null,
    rounds: sortPgaRoundRowsDesc(row?.rounds || []),
    raw: row,
  };
}

function buildBdlLeaderboard(results) {
  if (!Array.isArray(results) || results.length === 0) return [];

  return results
    .map((row, idx) => {
      const rawPos = String(row?.position || "").trim();
      const position = rawPos || String(idx + 1);
      const rawScore = row?.score;
      let score = "E";
      if (rawScore != null && rawScore !== "") {
        const n = Number(rawScore);
        if (!Number.isNaN(n)) {
          score = n === 0 ? "E" : n > 0 ? `+${n}` : `${n}`;
        } else {
          score = String(rawScore);
        }
      }

      return {
        position,
        name: row?.player || "",
        playerId: row?.playerId ?? null,
        country: row?.country || "",
        score,
        today: "—",
        thru: "—",
        round1: "—",
        round2: "—",
        round3: "—",
        round4: "—",
      };
    })
    .filter((r) => r.name);
}

function hasMeaningfulLeaderboardRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  return rows.some((r) => {
    const pos = String(r?.position || "").trim();
    const score = String(r?.score || "").trim().toUpperCase();
    const thru = String(r?.thru || "").trim();
    return (
      (pos && pos !== "-" && pos !== "--") ||
      (thru && thru !== "-" && thru !== "--") ||
      (score && score !== "-" && score !== "--")
    );
  });
}

/** Past finished events stay in ESPN lists; suppress pseudo-current boards immediately after inferred end. */
const GOLF_SCHEDULE_END_GRACE_MS = 0;

function parseScheduleMs(value) {
  if (!value) return NaN;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? NaN : ms;
}

function inferPgaTourEndMsFromStart(startMs) {
  if (!Number.isFinite(startMs)) return NaN;
  // PGA events are generally Thu-Sun (4 days). Keep stale suppression aligned to that window.
  return startMs + 4 * 24 * 60 * 60 * 1000;
}

/** True when tournament row from BDL is clearly over (outside active scoring window). */
function isBdlTournamentScheduleStale(normalizedTournament, nowMs = Date.now()) {
  if (!normalizedTournament) return false;
  const startMs =
    Number.isFinite(normalizedTournament.startTs) && normalizedTournament.startTs > 0
      ? normalizedTournament.startTs
      : parseScheduleMs(normalizedTournament.startDate);
  let endMs =
    Number.isFinite(normalizedTournament.endTs) && normalizedTournament.endTs > 0
      ? normalizedTournament.endTs
      : parseScheduleMs(normalizedTournament.endDate);
  if (!Number.isFinite(endMs) && Number.isFinite(startMs)) {
    endMs = inferPgaTourEndMsFromStart(startMs);
  }
  if (Number.isFinite(endMs) && nowMs > endMs + GOLF_SCHEDULE_END_GRACE_MS) return true;
  const status = String(normalizedTournament.status || "").toLowerCase();
  if (
    status.includes("final") &&
    Number.isFinite(startMs) &&
    nowMs > startMs + 8 * 24 * 60 * 60 * 1000
  ) {
    return true;
  }
  return false;
}

/**
 * Suppress merged currentEvent when ESPN/merge points at a finished week (stale scoreboard fallback).
 */
function shouldSuppressStaleMergedEvent({
  espnEvent,
  tournament,
  mergedCurrentEvent,
  espnLooksFinished,
}) {
  const nowMs = Date.now();
  const tournamentStartMs =
    Number.isFinite(tournament?.startTs) && tournament.startTs > 0
      ? tournament.startTs
      : parseScheduleMs(tournament?.startDate);
  const tournamentEndMs =
    Number.isFinite(tournament?.endTs) && tournament.endTs > 0
      ? tournament.endTs
      : parseScheduleMs(tournament?.endDate);
  const startMs =
    parseScheduleMs(mergedCurrentEvent?.startDate) ||
    tournamentStartMs ||
    parseScheduleMs(espnEvent?.startDate) ||
    NaN;
  let endMs =
    parseScheduleMs(mergedCurrentEvent?.endDate) || tournamentEndMs;
  if (!Number.isFinite(endMs) && Number.isFinite(startMs)) {
    endMs = inferPgaTourEndMsFromStart(startMs);
  }
  if (Number.isFinite(endMs) && nowMs > endMs + GOLF_SCHEDULE_END_GRACE_MS) {
    return true;
  }

  const mergedState = String(mergedCurrentEvent?.state || "").toLowerCase();
  const espnState = String(espnEvent?.state || "").toLowerCase();
  const looksFinished =
    espnLooksFinished ||
    mergedState === "post" ||
    mergedState === "final" ||
    espnState === "post" ||
    espnState === "final";

  if (
    looksFinished &&
    Number.isFinite(startMs) &&
    nowMs > startMs + 7 * 24 * 60 * 60 * 1000
  ) {
    return true;
  }

  return false;
}

/** ESPN fallback can return last week's event as events[0]; skip those for current-event picks. */
function espnScoreboardEventLooksStale(event) {
  if (!event) return true;
  const st = event?.status?.type?.state;
  const dateStr = event?.date || event?.startDate || event?.end?.date || null;
  const startMs = parseScheduleMs(dateStr);
  const endMs = inferPgaTourEndMsFromStart(startMs);
  const nowMs = Date.now();
  if (Number.isFinite(endMs) && nowMs > endMs + GOLF_SCHEDULE_END_GRACE_MS) {
    return true;
  }
  if ((st === "post" || st === "final") && Number.isFinite(endMs)) {
    return nowMs > endMs + GOLF_SCHEDULE_END_GRACE_MS;
  }
  return false;
}

/** ESPN site scoreboard often omits venue in JSON; HTML header still lists the course. */
function parseEspnCourseFromLeaderboardHtml(html) {
  if (!html) return { course: null, location: "" };

  const namedClub =
    html.match(/(Aronimink Golf Club)/i) ||
    html.match(/(Quail Hollow Club)/i) ||
    html.match(/(Valhalla Golf Club)/i) ||
    html.match(/(Southern Hills Country Club)/i) ||
    html.match(/(TPC [A-Za-z0-9' .-]{2,42})/i) ||
    html.match(
      /([A-Z][A-Za-z0-9' .&-]{2,55}(?:Golf Club|Country Club|Golf Links|National Golf Club))/,
    );

  if (!namedClub) return { course: null, location: "" };

  const course = String(namedClub[1] || "").trim();
  const locMatch = html.match(
    new RegExp(
      `${course.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[-–]\\s*([^"<]+)`,
      "i",
    ),
  );
  const location = locMatch?.[1] ? String(locMatch[1]).trim() : "";
  return { course: course || null, location };
}

async function fetchEspnLeaderboardHtml(eventId) {
  if (eventId == null || String(eventId).trim() === "") return null;
  const htmlRes = await safeFetchText(
    `https://www.espn.com/golf/leaderboard/_/tournamentId/${eventId}`,
    { timeoutMs: 9000 },
  );
  return htmlRes.ok ? htmlRes.text : null;
}

async function enrichEspnEventCourseFromHtml(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const existing = String(payload.course || "").trim();
  if (existing && existing !== "TBD") return payload;

  const html = await fetchEspnLeaderboardHtml(payload.id);
  if (!html) return payload;

  const parsed = parseEspnCourseFromLeaderboardHtml(html);
  if (!parsed.course) return payload;

  return {
    ...payload,
    course: parsed.course,
    location: parsed.location || payload.location || "",
    courseSource: "espn_html",
  };
}

function parseEspnLeaderboardFromHtml(html) {
  if (!html) return [];

  const rows = [];
  const seenNames = new Set();
  const rowMatches = html.matchAll(
    /<tr[^>]*class="[^"]*PlayerRow__Overview[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi
  );

  for (const match of rowMatches) {
    const rowHtml = match?.[1] || "";
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      stripHtml(m?.[1] || "")
    );
    if (cells.length < 7) continue;

    const nameMatch = rowHtml.match(
      /leaderboard_player_name[^>]*>([\s\S]*?)<\/a>/i
    );
    const name = stripHtml(nameMatch?.[1] || cells[3] || "");
    if (!name) continue;
    if (seenNames.has(name.toLowerCase())) continue;

    const countryMatch = rowHtml.match(/class="flag[^"]*"[^>]*alt="([^"]+)"/i);
    rows.push({
      position: cells[1] || "—",
      name,
      country: stripHtml(countryMatch?.[1] || ""),
      score: cells[4] || "E",
      today: cells[5] || "—",
      thru: cells[6] || "—",
      round1: cells[7] || "—",
      round2: cells[8] || "—",
      round3: cells[9] || "—",
      round4: cells[10] || "—",
    });
    seenNames.add(name.toLowerCase());
  }

  return rows;
}

function summarizeCourseStats(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const sorted = rows
    .filter((r) => r?.round_number == null)
    .sort((a, b) => {
      const da = Number(a?.difficulty_rank || 999);
      const db = Number(b?.difficulty_rank || 999);
      return da - db;
    });

  return sorted.slice(0, 5).map((r) => ({
    hole: r.hole_number,
    par: r.course?.par || null,
    scoringAverage: r.scoring_average,
    scoringDiff: r.scoring_diff,
    difficultyRank: r.difficulty_rank,
    birdies: r.birdies,
    pars: r.pars,
    bogeys: r.bogeys,
    doubles: r.double_bogeys,
  }));
}

/** Same primary-event pick as `getEspnCurrentEvent` (Zurich filter, scoring, stale guard). */
function selectPrimaryPgaScoreboardEvent(events) {
  if (!Array.isArray(events) || events.length === 0) return null;
  const validEvents = events.filter((e) => !espnScoreboardEventLooksStale(e));
  if (!validEvents.length) return null;

  const activePool = validEvents.filter((e) => {
    const st = e?.status?.type?.state;
    return st === "in" || st === "pre";
  });

  let selectedEvent = null;

  if (activePool.length > 0) {
    const sansZurich = activePool.filter(
      (e) => !eventNameLooksZurichOrTeamFormat(e?.name, e?.shortName)
    );
    const pool = sansZurich.length ? sansZurich : activePool;
    selectedEvent = [...pool].sort(
      (a, b) => scorePgaEspnEvent(b) - scorePgaEspnEvent(a)
    )[0];
  }

  if (!selectedEvent) {
    const upcomingOnly = validEvents.filter((e) => e?.status?.type?.state === "pre");
    if (upcomingOnly.length > 0) {
      const sansZurichUpcoming = upcomingOnly.filter(
        (e) => !eventNameLooksZurichOrTeamFormat(e?.name, e?.shortName)
      );
      const pool = sansZurichUpcoming.length ? sansZurichUpcoming : upcomingOnly;
      selectedEvent = [...pool].sort(
        (a, b) => scorePgaEspnEvent(b) - scorePgaEspnEvent(a)
      )[0];
    }
  }

  if (!selectedEvent) {
    selectedEvent = validEvents[0] || null;
  }

  return selectedEvent;
}

/**
 * ESPN-only tournament field: (1) site scoreboard for current event id/name +
 * scoreboard athlete rows, (2) sports.core competitors list (canonical ordering;
 * `/events/{id}/competitors` often 404s — `/competitions/{compId}/competitors` is used).
 * Cached 60m. No Odds API / BDL field endpoint.
 */
async function fetchEspnGolfField() {
  const cacheKey = "espn_golf_field_v2";
  const cached = getCache(cacheKey);
  if (cached && typeof cached === "object" && Array.isArray(cached.players)) {
    return cached;
  }

  const fail = (reason) => {
    console.warn(`[golf] espn field fetch failed: ${reason}`);
    return null;
  };

  try {
    let scoreRes = await safeFetchJson(
      "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard",
      { timeoutMs: 8000 },
    );
    if (!scoreRes.ok || !scoreRes.data?.events?.length) {
      scoreRes = await safeFetchJson(
        `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?dates=${encodeURIComponent(
          etDateStringToEspnYmd(getTodayEtDateString()),
        )}`,
        { timeoutMs: 8000 },
      );
    }
    if (!scoreRes.ok) {
      return fail(scoreRes.error || `HTTP ${scoreRes.status}`);
    }

    const events = scoreRes.data?.events || [];
    if (!events.length) {
      return fail("no events in scoreboard");
    }

    const ev = selectPrimaryPgaScoreboardEvent(events) || events[0];
    const eventId = ev?.id != null ? String(ev.id) : "";
    const eventName = String(ev?.name || ev?.shortName || "").trim() || null;
    const competitionId =
      ev?.competitions?.[0]?.id != null
        ? String(ev.competitions[0].id)
        : eventId;
    if (!eventId) {
      return fail("missing event id");
    }

    const compRows = ev?.competitions?.[0]?.competitors || [];
    const nameByAthleteId = new Map();
    for (const row of compRows) {
      const aid =
        row?.athlete?.id != null ? String(row.athlete.id) : String(row?.id || "");
      const nm = String(
        row?.athlete?.displayName || row?.athlete?.fullName || "",
      ).trim();
      if (aid && nm) nameByAthleteId.set(aid, nm);
    }

    const eid = encodeURIComponent(eventId);
    const cid = encodeURIComponent(competitionId);
    const coreUrls = [
      `https://sports.core.api.espn.com/v2/sports/golf/leagues/pga/events/${eid}/competitors?limit=200`,
      `https://sports.core.api.espn.com/v2/sports/golf/leagues/pga/events/${eid}/competitions/${cid}/competitors?limit=200`,
    ];

    let items = null;
    for (const url of coreUrls) {
      const cr = await safeFetchJson(url, { timeoutMs: 10000 });
      if (cr.ok && Array.isArray(cr.data?.items) && cr.data.items.length > 0) {
        items = cr.data.items;
        break;
      }
    }

    let players = [];
    if (items && items.length > 0) {
      const seen = new Set();
      for (const it of items) {
        const aid =
          it?.athlete && typeof it.athlete === "object" && it.athlete.id != null
            ? String(it.athlete.id)
            : String(it?.id || "");
        const inline =
          typeof it?.athlete === "object" && it.athlete
            ? String(it.athlete.displayName || it.athlete.fullName || "").trim()
            : "";
        const nm = inline || (aid ? nameByAthleteId.get(aid) : "") || "";
        if (!nm) continue;
        const k = nm.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        players.push(nm);
      }
    }

    if (!players.length) {
      const ordered = [];
      const seen2 = new Set();
      for (const row of compRows) {
        const aid =
          row?.athlete?.id != null ? String(row.athlete.id) : String(row?.id || "");
        const nm = aid ? nameByAthleteId.get(aid) : "";
        if (!nm) continue;
        const k = nm.toLowerCase();
        if (seen2.has(k)) continue;
        seen2.add(k);
        ordered.push(nm);
      }
      players = ordered;
    }

    if (!players.length) {
      return fail("no competitors for event");
    }

    const payload = { eventName, eventId, players };
    console.log(
      `[golf] espn field → ${players.length} players, event: ${eventName || "(unnamed)"}`,
    );
    setCache(cacheKey, payload, 60 * 60 * 1000);
    return payload;
  } catch (err) {
    return fail(String(err?.message || err));
  }
}

function buildGolfOddsFromEspnField(espnField, bdlBundle) {
  const FIELD_UNAVAILABLE =
    "Field unavailable — check back closer to tee time";

  if (
    !espnField ||
    !Array.isArray(espnField.players) ||
    espnField.players.length === 0
  ) {
    return {
      outrights: [],
      topFinish: {},
      makeCut: {},
      eventName: espnField?.eventName || null,
      marketStatus: "unavailable",
      linesUnavailable: true,
      fieldUnavailableMessage: FIELD_UNAVAILABLE,
    };
  }

  const players = espnField.players;
  const bdlResults = Array.isArray(bdlBundle?.results) ? bdlBundle.results : [];
  const byNorm = new Map();
  for (const row of bdlResults) {
    const ply = String(row?.player || "").trim();
    if (!ply) continue;
    byNorm.set(normalizeName(ply), row);
  }

  const bdlKeys = [...byNorm.keys()];
  const outrights = players.map((name) => {
    const nm = normalizeName(name);
    let row = byNorm.get(nm);
    if (!row) {
      for (const [k, v] of byNorm) {
        if (golfPlayerNamesMatch(name, k, countGolfLastNames(bdlKeys))) {
          row = v;
          break;
        }
      }
    }
    const o = {
      player: name,
      odds: null,
      source: "espn_field",
    };
    if (row) {
      if (row.position != null) o.bdlPosition = String(row.position);
      if (row.score != null) o.bdlScore = String(row.score);
    }
    return o;
  });

  return {
    outrights,
    topFinish: {},
    makeCut: {},
    eventName: espnField?.eventName || null,
    marketStatus: players.length ? "field" : "hidden",
    linesUnavailable: true,
    fieldUnavailableMessage: null,
  };
}

async function fetchEspnScoreboardRawEvents(ymdOptional) {
  const ymd = ymdOptional || etDateStringToEspnYmd(getTodayEtDateString());
  const cacheKey = `espn_scoreboard_events_${ymd}`;
  const cached = getCache(cacheKey);
  if (Array.isArray(cached)) return cached;

  let result = await safeFetchJson(
    `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?dates=${encodeURIComponent(ymd)}`,
    { timeoutMs: 7000 },
  );
  if (!result.ok || !(result.data?.events || []).length) {
    result = await safeFetchJson(
      "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard",
      { timeoutMs: 7000 },
    );
  }

  const events = result.ok ? result.data?.events || [] : [];
  setCache(cacheKey, events, 2 * 60 * 1000);
  return events;
}

function pickEspnRawEventForIntent(intent, events) {
  if (!intent || !Array.isArray(events) || events.length === 0) return null;

  const matching = events.filter(
    (e) =>
      golfLabelsMatchIntent(e?.name, e?.shortName, intent) &&
      !espnScoreboardEventLooksStale(e),
  );
  if (!matching.length) return null;

  return [...matching].sort((a, b) => scorePgaEspnEvent(b) - scorePgaEspnEvent(a))[0];
}

function scheduleRowToEspnYmd(row) {
  if (!row || typeof row !== "object") return null;
  const ms =
    Number.isFinite(row.startTs) && row.startTs > 0
      ? row.startTs
      : parseScheduleMs(row.startDate);
  if (!Number.isFinite(ms)) return null;
  const etYmd = new Date(ms).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  return etDateStringToEspnYmd(etYmd);
}

async function normalizeEspnScoreboardEventToPayload(selectedEvent) {
  if (!selectedEvent) return null;

  const comp = selectedEvent?.competitions?.[0] || {};
  const venue = comp?.venue || {};
  const status = selectedEvent?.status?.type || {};
  const competitors = comp?.competitors || [];

  const hasMeaningfulApiLeaderboard = competitors.some(isMeaningfulEspnCompetitor);

  const apiLeaderboard = competitors
    .filter((c) => c?.athlete)
    .map((c) => {
      const stats = c.statistics || [];
      const score = c.score || {};
      return {
        position: c?.status?.position?.displayText || "—",
        name: c?.athlete?.displayName || c?.athlete?.fullName || "",
        country: c?.athlete?.flag?.alt || "",
        score: score?.displayValue || "E",
        today: c?.status?.today?.displayValue || "—",
        thru: c?.status?.thru || "—",
        round1: stats.find((s) => s.name === "round1")?.displayValue || "—",
        round2: stats.find((s) => s.name === "round2")?.displayValue || "—",
        round3: stats.find((s) => s.name === "round3")?.displayValue || "—",
        round4: stats.find((s) => s.name === "round4")?.displayValue || "—",
        linescores: c.linescores || [],
        teeTime: (() => {
          try {
            return c.linescores?.[0]?.statistics?.categories?.[0]?.stats?.[0]?.displayValue || null;
          } catch {
            return null;
          }
        })(),
      };
    });

  let leaderboard = apiLeaderboard;
  let leaderboardSource = hasMeaningfulApiLeaderboard ? "espn_api" : "none";
  let courseLabel = venue?.fullName || venue?.shortName || null;
  let locationLabel = [venue?.city, venue?.state || venue?.country]
    .filter(Boolean)
    .join(", ");

  const needsHtml =
    selectedEvent?.id &&
    (!hasMeaningfulApiLeaderboard ||
      !courseLabel ||
      String(courseLabel).trim() === "TBD");

  if (needsHtml) {
    const html = await fetchEspnLeaderboardHtml(selectedEvent.id);
    if (html) {
      if (!hasMeaningfulApiLeaderboard) {
        const htmlLeaderboard = parseEspnLeaderboardFromHtml(html);
        if (hasMeaningfulLeaderboardRows(htmlLeaderboard)) {
          leaderboard = htmlLeaderboard;
          leaderboardSource = "espn_html";
        }
      }
      if (!courseLabel || String(courseLabel).trim() === "TBD") {
        const parsedCourse = parseEspnCourseFromLeaderboardHtml(html);
        if (parsedCourse.course) {
          courseLabel = parsedCourse.course;
          if (parsedCourse.location) locationLabel = parsedCourse.location;
        }
      }
    }
  }

  const hasMeaningfulLeaderboard = hasMeaningfulLeaderboardRows(leaderboard);

  const rawState = String(status?.state || "pre").toLowerCase();
  const adjustedState = rawState === "in" && !hasMeaningfulLeaderboard ? "pre" : rawState;

  return {
    id: selectedEvent?.id || null,
    name: selectedEvent?.name || selectedEvent?.shortName || "PGA Tour Event",
    shortName:
      selectedEvent?.shortName || selectedEvent?.name || "PGA Tour Event",
    course: courseLabel || "TBD",
    location: locationLabel,
    round: cleanTournamentStatus(adjustedState || status?.description),
    state: adjustedState || "pre",
    par: comp?.format?.par || null,
    startDate: selectedEvent?.date || null,
    displayDate: formatDisplayDate(selectedEvent?.date),
    leaderboard,
    leaderboardSource,
    raw: selectedEvent,
  };
}

async function getEspnCurrentEvent() {
  const cacheKey = "espn_current_event_v5";
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const events = await fetchEspnScoreboardRawEvents();
  if (!events.length) {
    setCache(cacheKey, null, 60 * 1000);
    return null;
  }

  const selectedEvent = selectPrimaryPgaScoreboardEvent(events);
  if (!selectedEvent) {
    setCache(cacheKey, null, 60 * 1000);
    return null;
  }

  const payload = await normalizeEspnScoreboardEventToPayload(selectedEvent);
  setCache(cacheKey, payload, 2 * 60 * 1000);
  return payload;
}

/**
 * When the user names a specific tournament, align currentEvent to that week
 * (ESPN board for that week, else BDL schedule row, else pre-market shell).
 * @param {Record<string, unknown>} board
 * @param {string} question
 */
export async function alignGolfBoardToQuestion(board, question) {
  const intent = extractGolfTournamentIntentFromQuestion(question);
  if (!intent) return board;

  const alreadyAligned =
    golfCurrentEventMatchesIntent(board?.currentEvent, intent) &&
    !golfContextNeedsCourseResolution(board?.currentEvent, intent);
  if (alreadyAligned) return board;

  const previousFeedEvent = board?.currentEvent?.name || null;
  const schedule = Array.isArray(board?.tourSchedule) ? board.tourSchedule : [];
  const row = findBestScheduleRowForIntent(schedule, intent);

  let rawEv = pickEspnRawEventForIntent(intent, await fetchEspnScoreboardRawEvents());
  if (!rawEv && row) {
    const weekYmd = scheduleRowToEspnYmd(row);
    if (weekYmd) {
      rawEv = pickEspnRawEventForIntent(intent, await fetchEspnScoreboardRawEvents(weekYmd));
    }
  }

  let espnPayload = null;
  if (rawEv) {
    espnPayload = await normalizeEspnScoreboardEventToPayload(rawEv);
  }

  let currentEvent;
  let source = "intent_only";

  if (
    espnPayload &&
    golfLabelsMatchIntent(espnPayload.name, espnPayload.shortName, intent)
  ) {
    source = "espn";
    currentEvent = {
      id: espnPayload.id,
      name: espnPayload.name,
      shortName: espnPayload.shortName,
      course: espnPayload.course || row?.courseName || "TBD",
      location: espnPayload.location || row?.location || "",
      round: espnPayload.round,
      state: espnPayload.state,
      par: espnPayload.par,
      startDate: espnPayload.startDate || row?.startDate || null,
      endDate: row?.endDate ?? null,
      displayDate: espnPayload.displayDate || row?.displayDate || null,
      leaderboard: enrichLeaderboardRowsWithStaticSg(espnPayload.leaderboard || []),
    };
  } else if (row) {
    source = "schedule";
    currentEvent = buildCurrentEventFromScheduleRow(row, null);
    currentEvent.leaderboard = enrichLeaderboardRowsWithStaticSg(
      currentEvent.leaderboard || [],
    );
  } else {
    currentEvent = {
      id: null,
      name: intent.label,
      shortName: intent.label,
      course: row?.courseName || "TBD",
      location: row?.location || "",
      round: "Upcoming",
      state: "pre",
      par: null,
      startDate: null,
      endDate: null,
      displayDate: null,
      leaderboard: [],
    };
  }

  if (golfCourseConflictsWithIntent(currentEvent.course, intent)) {
    currentEvent = {
      ...currentEvent,
      course: row?.courseName || "TBD",
      location: row?.location || currentEvent.location || "",
    };
  }

  if (golfContextNeedsCourseResolution(currentEvent, intent) && currentEvent?.id) {
    const enriched = await enrichEspnEventCourseFromHtml(currentEvent);
    currentEvent = { ...currentEvent, ...enriched };
  }

  console.log(
    JSON.stringify({
      tag: "[golfQuestionAlign]",
      requested: intent.label,
      previousFeedEvent,
      alignedTo: currentEvent?.name,
      course: currentEvent?.course,
      source,
    }),
  );

  return {
    ...board,
    currentEvent,
    tournament: row || board.tournament,
    questionEventAlignment: {
      requestedLabel: intent.label,
      requestedSlug: intent.slug,
      previousFeedEvent,
      source,
    },
  };
}

async function getEspnWorldRankings() {
  const cacheKey = "espn_golf_rankings";
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const result = await safeFetchJson(
    "https://site.api.espn.com/apis/site/v2/sports/golf/pga/rankings",
    { timeoutMs: 7000 }
  );

  if (!result.ok) {
    setCache(cacheKey, [], 10 * 60 * 1000);
    return [];
  }

  const entries = result.data?.rankings?.[0]?.ranks || [];
  const rankings = entries.slice(0, 50).map((r) => ({
    rank: r.current,
    name: r.athlete?.displayName || "",
    country: r.athlete?.flag?.alt || "",
    points: r.rankValue || 0,
  }));

  setCache(cacheKey, rankings, 60 * 60 * 1000);
  return rankings;
}

async function getBdlTournamentBundle() {
  const cacheKey = "bdl_tournament_bundle_v8";
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const season = new Date().getFullYear();

  const tournamentsRes = await safeBdlFetch("/tournaments", {
    season,
    per_page: 100,
  });

  const allTournaments = tournamentsRes.ok ? tournamentsRes.data?.data || [] : [];
  const now = Date.now();

  const normalized = allTournaments
    .map((t) => {
      const s = t?.start_date ?? t?.startDate;
      const e = t?.end_date ?? t?.endDate;
      const st = parseBdlStartTs(s, season);
      return {
        ...t,
        _startTs: st,
        _endTs: parseBdlEndTs(e, season, st),
      };
    })
    .sort((a, b) => a._startTs - b._startTs);

  const normalizedSchedule = normalized
    .map((t) => normalizeBdlTournament(t))
    .filter(Boolean)
    .filter((t) => !isBdlTournamentScheduleStale(t))
    .sort((a, b) => Number(a?.startTs || 0) - Number(b?.startTs || 0));

  const scheduleWindow = normalizedSchedule
    .filter((t) => {
      const startTs = Number(t?.startTs || 0);
      const endTs = Number(t?.endTs || 0);
      return (Number.isFinite(endTs) && endTs >= now) || (Number.isFinite(startTs) && startTs >= now);
    })
    .slice(0, SCHEDULE_WINDOW_MAX);

  const inRange = normalized.filter((t) => t._startTs <= now && now <= t._endTs);
  const upcoming = normalized.filter((t) => t._startTs > now);
  const pool = inRange.length > 0 ? inRange : upcoming;

  const isTeamOrZurichWeek = (t) => {
    const n = normalizeString(t?.name || "");
    return (
      n.includes("zurich") ||
      n.includes("two-man") ||
      n.includes("two man") ||
      n.includes("team championship")
    );
  };

  const preferredFromPool = (() => {
    const majorInRange = inRange.find((t) =>
      tournamentNameLooksMajor(t?.name, t?.short_name),
    );
    if (majorInRange) return majorInRange;

    const rbcHeritage = pool.find((t) =>
      eventNameMatchesRbcHeritage(t?.name, t?.short_name)
    );
    if (rbcHeritage) return rbcHeritage;

    const nonTeam = pool.filter((t) => !isTeamOrZurichWeek(t));
    const ordered = [...(nonTeam.length ? nonTeam : pool)].sort(
      (a, b) => Number(b?.purse || 0) - Number(a?.purse || 0)
    );
    return ordered[0] || null;
  })();

  const picked =
    preferredFromPool ||
    normalized.find((t) => t._startTs <= now && now <= t._endTs) ||
    normalized.find((t) => t._startTs > now) ||
    null;

  if (!picked) {
    const empty = {
      tournament: null,
      course: null,
      results: [],
      courseStats: [],
      schedule: scheduleWindow,
      bdlAvailable: tournamentsRes.ok,
    };
    setCache(cacheKey, empty, 60 * 1000);
    return empty;
  }

  const normalizedTournament = normalizeBdlTournament(picked);
  const courseSearchName = normalizedTournament.courseName || null;

  // BDL PGA OpenAPI: /tournament_results supports tournament_ids, season, player_ids, cursor,
  // per_page — no date range params. We scope by picked tournament id only (single-event leaderboard).
  const [courseRes, resultsRes, courseStatsRes] = await Promise.all([
    courseSearchName
      ? safeBdlFetch("/courses", { search: courseSearchName, per_page: 5 })
      : Promise.resolve({ ok: false, data: null }),
    safeBdlFetch("/tournament_results", {
      "tournament_ids[]": picked.id,
      per_page: 200,
    }),
    safeBdlFetch("/tournament_course_stats", {
      "tournament_ids[]": picked.id,
      per_page: 36,
    }),
  ]);

  const matchedCourse =
    (courseRes.ok
      ? (courseRes.data?.data || []).find(
          (c) => slugify(c.name) === slugify(normalizedTournament.courseName)
        )
      : null) ||
    (courseRes.ok ? (courseRes.data?.data || [])[0] : null) ||
    (Array.isArray(picked.courses) && picked.courses.length > 0
      ? picked.courses[0]?.course
      : null) ||
    null;

  const results = resultsRes.ok
    ? (resultsRes.data?.data || []).map(normalizeTournamentResultRow)
    : [];

  const courseStats = courseStatsRes.ok
    ? summarizeCourseStats(courseStatsRes.data?.data || [])
    : [];

  const bundle = {
    tournament: normalizedTournament,
    course: normalizeBdlCourse(matchedCourse),
    results,
    leaderboard: buildBdlLeaderboard(results),
    courseStats,
    schedule: scheduleWindow,
    bdlAvailable: tournamentsRes.ok,
  };

  setCache(cacheKey, bundle, 3 * 60 * 1000);
  return bundle;
}

/**
 * When ESPN's scoreboard week (e.g. PGA Championship) is missing from BDL's upcoming window,
 * slug-match and prepend a synthetic row so the Golf UI schedule still lists the live major.
 */
function tourScheduleAlreadyIncludesEspnEvent(tourSchedule, espnEvent) {
  const espnName = String(espnEvent?.name || "").trim();
  const espnShort = String(espnEvent?.shortName || "").trim();
  if (!espnName && !espnShort) return true;
  const espnSlugs = [slugify(espnName), slugify(espnShort)].filter(Boolean);
  if (espnSlugs.length === 0) return true;

  for (const row of tourSchedule || []) {
    const rowSlugs = [slugify(row?.name), slugify(row?.shortName)].filter(Boolean);
    for (const rs of rowSlugs) {
      if (!rs) continue;
      for (const es of espnSlugs) {
        if (!es) continue;
        if (rs === es || rs.includes(es) || es.includes(rs)) return true;
      }
    }
  }
  return false;
}

function buildSyntheticScheduleRowFromEspn(espnEvent) {
  const name = espnEvent?.name || espnEvent?.shortName || "PGA Tour Event";
  const shortName = espnEvent?.shortName || espnEvent?.name || name;
  const startMs = parseScheduleMs(espnEvent?.startDate);
  const endMs = Number.isFinite(startMs)
    ? inferPgaTourEndMsFromStart(startMs)
    : NaN;
  const displayDate =
    espnEvent?.displayDate && espnEvent.displayDate !== "TBD"
      ? espnEvent.displayDate
      : formatDisplayDate(espnEvent?.startDate);

  return {
    id: espnEvent?.id ?? null,
    season: new Date().getFullYear(),
    name,
    shortName,
    startDate: espnEvent?.startDate || null,
    endDate: null,
    displayDate,
    city: "",
    state: "",
    country: "",
    location: espnEvent?.location || "",
    purse: null,
    status: cleanTournamentStatus(espnEvent?.state || espnEvent?.raw?.status),
    rawStatus: espnEvent?.state || null,
    courseName: espnEvent?.course || null,
    courseId: null,
    champion: null,
    aliasApplied: null,
    startTs: Number.isFinite(startMs) ? startMs : null,
    endTs: Number.isFinite(endMs) ? endMs : null,
    raw: { source: "espn_scoreboard_injected", espn: espnEvent?.raw },
  };
}

function injectEspnIntoTourScheduleIfMissing(tourSchedule, espnEvent) {
  const list = Array.isArray(tourSchedule) ? [...tourSchedule] : [];
  if (!espnEvent || (!espnEvent.name && !espnEvent.shortName)) {
    return list.slice(0, SCHEDULE_WINDOW_MAX);
  }
  if (tourScheduleAlreadyIncludesEspnEvent(list, espnEvent)) {
    return list.slice(0, SCHEDULE_WINDOW_MAX);
  }
  const injected = buildSyntheticScheduleRowFromEspn(espnEvent);
  return [injected, ...list].slice(0, SCHEDULE_WINDOW_MAX);
}

/** Canonical Thu–Sun window for a normalized schedule row. */
function scheduleRowStartEndMs(row) {
  if (!row || typeof row !== "object") return { startMs: NaN, endMs: NaN };
  const startMs =
    Number.isFinite(row.startTs) && row.startTs > 0
      ? row.startTs
      : parseScheduleMs(row.startDate);
  let endMs =
    Number.isFinite(row.endTs) && row.endTs > 0
      ? row.endTs
      : parseScheduleMs(row.endDate);
  if (!Number.isFinite(endMs) && Number.isFinite(startMs)) {
    endMs = inferPgaTourEndMsFromStart(startMs);
  }
  return { startMs, endMs };
}

function slugOverlapsSchedule(a, b) {
  const x = slugify(a || "");
  const y = slugify(b || "");
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

/**
 * Pick the schedule row that should drive Home / header copy (BDL + ESPN-injected list).
 * Prefers ESPN id match, then BDL "picked" tournament id, then name overlap with ESPN,
 * then live / in-window / purse heuristics.
 */
function pickPrimaryScheduleRow(tourScheduleOut, espnEvent, tournament, nowMs = Date.now()) {
  const rows = Array.isArray(tourScheduleOut) ? tourScheduleOut.filter(Boolean) : [];
  if (!rows.length) return null;

  const espnId = espnEvent?.id != null ? String(espnEvent.id).trim() : "";
  const espnLabel = espnEvent?.name || espnEvent?.shortName || "";
  const bdlId = tournament?.id != null ? String(tournament.id).trim() : "";

  const scored = rows.map((r) => {
    const { startMs, endMs } = scheduleRowStartEndMs(r);
    const st = normalizeString(r?.status || "");
    let score = 0;
    if (espnId && String(r?.id || "").trim() === espnId) score += 1_000_000;
    if (bdlId && String(r?.id || "").trim() === bdlId) score += 500_000;
    if (
      espnLabel &&
      (slugOverlapsSchedule(r?.name, espnLabel) || slugOverlapsSchedule(r?.shortName, espnLabel))
    ) {
      score += 250_000;
    }
    if (st.includes("live") || st.includes("progress")) score += 80_000;
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && nowMs >= startMs && nowMs <= endMs) {
      score += 60_000;
    }
    if (Number.isFinite(startMs) && nowMs < startMs && startMs - nowMs <= 72 * 60 * 60 * 1000) {
      score += 25_000;
    }
    const purse = Number(r?.purse || 0);
    score += Math.min(purse / 1e5, 5000);
    return { r, score, startMs };
  });

  scored.sort((a, b) => b.score - a.score || (a.startMs || 0) - (b.startMs || 0));
  return scored[0]?.r || rows[0];
}

function scheduleRowMatchesCurrentEvent(ce, row) {
  if (!ce || !row) return false;
  if (ce.id != null && row.id != null && String(ce.id).trim() === String(row.id).trim()) {
    return true;
  }
  return (
    slugOverlapsSchedule(ce.name, row.name) ||
    slugOverlapsSchedule(ce.shortName, row.shortName) ||
    slugOverlapsSchedule(ce.name, row.shortName) ||
    slugOverlapsSchedule(ce.shortName, row.name)
  );
}

/** Keep ESPN/BDL scoring rows; replace marketing labels only when the schedule row is the same event. */
function overlayCurrentEventDisplayFromSchedule(ce, row) {
  if (!ce || !row) return ce;
  if (!scheduleRowMatchesCurrentEvent(ce, row)) return ce;
  const courseLabel =
    row.courseName ||
    (typeof row.course === "string" ? row.course : null) ||
    ce.course;
  return {
    ...ce,
    name: row.name || ce.name,
    shortName: row.shortName || row.name || ce.shortName,
    displayDate: row.displayDate || ce.displayDate,
    startDate: row.startDate || ce.startDate,
    endDate: row.endDate != null && row.endDate !== "" ? row.endDate : ce.endDate,
    course: courseLabel || ce.course,
    location: row.location || ce.location,
  };
}

function mergeGolfBoard({ espnEvent, bdlBundle, odds, rankings }) {
  const tournament = bdlBundle?.tournament || null;
  const course = bdlBundle?.course || null;
  const tourSchedule = enrichTourScheduleWithEspn(
    Array.isArray(bdlBundle?.schedule) ? bdlBundle.schedule : [],
    espnEvent
  );
  const bdlLeaderboard = Array.isArray(bdlBundle?.leaderboard)
    ? bdlBundle.leaderboard
    : [];
  const bdlHasLeaderboard = hasMeaningfulLeaderboardRows(bdlLeaderboard);

  const espnHasLeaderboard =
    Array.isArray(espnEvent?.leaderboard) && espnEvent.leaderboard.length > 0;

  const espnState = String(espnEvent?.state || "").toLowerCase();
  const espnLooksFinished = espnState === "post" || espnState === "final";

  const espnSlug = slugify(espnEvent?.name);
  const tournamentSlug = slugify(tournament?.name);
  const bdlSlug = tournamentSlug;

  const sameEvent =
    tournament &&
    espnEvent &&
    (
      espnSlug.includes(tournamentSlug) ||
      tournamentSlug.includes(espnSlug)
    );

  const bdlLooksTeamOrZurich =
    bdlSlug.includes("zurich") ||
    bdlSlug.includes("two man") ||
    bdlSlug.includes("two-man") ||
    bdlSlug.includes("team championship");

  const espnIsRbcHeritage = eventNameMatchesRbcHeritage(
    espnEvent?.name,
    espnEvent?.shortName
  );
  const bdlIsRbcHeritage = tournament
    ? eventNameMatchesRbcHeritage(tournament?.name, tournament?.shortName)
    : false;

  const espnIsMajor = tournamentNameLooksMajor(espnEvent?.name, espnEvent?.shortName);
  const bdlIsMajor = tournament
    ? tournamentNameLooksMajor(tournament?.name, tournament?.shortName)
    : false;
  const majorConflict = Boolean(espnEvent && espnIsMajor && !sameEvent && !bdlIsMajor);

  /**
   * Finished tournaments (post/final) must still surface ESPN's final leaderboard when BDL
   * has no standings row — otherwise currentEvent.leaderboard is empty and UR Take invents dates.
   * Live events: keep alignment rules (same event / RBC vs Zurich, etc.).
   */
  const shouldUseEspnLeaderboard =
    !bdlHasLeaderboard &&
    espnHasLeaderboard &&
    (espnLooksFinished ||
      (!espnLooksFinished &&
        (sameEvent ||
          !tournament ||
          bdlLooksTeamOrZurich ||
          (espnIsRbcHeritage && !bdlIsRbcHeritage))));

  const preferEspnDisplay =
    majorConflict ||
    (shouldUseEspnLeaderboard &&
      (!sameEvent || bdlLooksTeamOrZurich || (espnIsRbcHeritage && !bdlIsRbcHeritage))) ||
    (espnIsRbcHeritage && !bdlIsRbcHeritage);
  const bdlEventMismatch = preferEspnDisplay && !sameEvent;
  const oddsTopThree = Array.isArray(odds?.outrights)
    ? odds.outrights.slice(0, 3).map((o, idx) => {
        const posted =
          o?.odds != null && Number.isFinite(Number(o.odds)) ? Number(o.odds) : null;
        const bdl = o?.bdlScore != null && String(o.bdlScore).trim() !== "" ? String(o.bdlScore) : null;
        const scoreCell =
          bdl != null ? bdl : posted != null ? String(posted) : "—";
        return {
          position: String(idx + 1),
          name: o?.player || "",
          country: "",
          score: scoreCell,
          today: "—",
          thru: "—",
          round1: "—",
          round2: "—",
          round3: "—",
          round4: "—",
        };
      }).filter((r) => r.name)
    : [];
  const hasOddsProxy = oddsTopThree.length > 0;
  const useBdlLeaderboard = bdlHasLeaderboard && !majorConflict;
  const useEspnLeaderboard =
    (majorConflict && espnHasLeaderboard) ||
    (!useBdlLeaderboard && shouldUseEspnLeaderboard);
  const useOddsProxyLeaderboard = !useBdlLeaderboard && !useEspnLeaderboard && hasOddsProxy;

  const currentEvent = {
    id: preferEspnDisplay
      ? espnEvent?.id || tournament?.id || null
      : tournament?.id || espnEvent?.id || null,
    name: preferEspnDisplay
      ? espnEvent?.name || tournament?.name || "PGA Tour Event"
      : tournament?.name || espnEvent?.name || "PGA Tour Event",
    shortName: preferEspnDisplay
      ? espnEvent?.shortName || espnEvent?.name || "PGA Tour"
      : tournament?.shortName ||
        tournament?.name ||
        espnEvent?.shortName ||
        "PGA Tour",
    course: preferEspnDisplay
      ? espnEvent?.course ||
        (bdlEventMismatch ? null : tournament?.courseName || course?.name) ||
        "TBD"
      : tournament?.courseName || course?.name || espnEvent?.course || "TBD",
    location: preferEspnDisplay
      ? espnEvent?.location ||
        (bdlEventMismatch
          ? ""
          : tournament?.location ||
            [course?.city, course?.state || course?.country]
              .filter(Boolean)
              .join(", ")) ||
        ""
      : tournament?.location ||
        [course?.city, course?.state || course?.country]
          .filter(Boolean)
          .join(", ") ||
        espnEvent?.location ||
        "",
    round: useBdlLeaderboard
      ? tournament?.status || "Live"
      : useEspnLeaderboard || preferEspnDisplay
      ? espnEvent?.round || tournament?.status || "Upcoming"
      : useOddsProxyLeaderboard
      ? "Pre-Market"
      : tournament?.status || "Upcoming",
    state: useBdlLeaderboard
      ? "in"
      : useEspnLeaderboard || preferEspnDisplay
      ? espnEvent?.state || "pre"
      : useOddsProxyLeaderboard
      ? "pre"
      : tournament?.status === "Live"
      ? "in"
      : "pre",
    par: preferEspnDisplay
      ? espnEvent?.par || (bdlEventMismatch ? null : course?.par) || null
      : course?.par || espnEvent?.par || null,
    startDate: preferEspnDisplay
      ? espnEvent?.startDate || tournament?.startDate || null
      : tournament?.startDate || espnEvent?.startDate || null,
    endDate:
      (preferEspnDisplay ? (bdlEventMismatch ? null : tournament?.endDate) : tournament?.endDate) ||
      null,
    displayDate:
      (preferEspnDisplay
        ? espnEvent?.displayDate ||
          (bdlEventMismatch ? null : tournament?.displayDate)
        : tournament?.displayDate || espnEvent?.displayDate) ||
      formatDisplayDate(
        (preferEspnDisplay ? espnEvent?.startDate : tournament?.startDate) ||
          espnEvent?.startDate
      ),
    leaderboard: enrichLeaderboardRowsWithStaticSg(
      useBdlLeaderboard
        ? bdlLeaderboard
        : useEspnLeaderboard
        ? espnEvent?.leaderboard || []
        : useOddsProxyLeaderboard
        ? oddsTopThree
        : [],
    ),
  };

  const suppressCurrent = shouldSuppressStaleMergedEvent({
    espnEvent,
    tournament,
    mergedCurrentEvent: currentEvent,
    espnLooksFinished,
  });

  let outTournament = tournament;
  if (outTournament && isBdlTournamentScheduleStale(outTournament)) {
    outTournament = null;
  }

  let outCurrent = suppressCurrent ? null : currentEvent;
  if (!outCurrent && tournament && !isBdlTournamentScheduleStale(tournament)) {
    outCurrent = {
      id: tournament.id || null,
      name: tournament.name || "PGA Tour Event",
      shortName: tournament.shortName || tournament.name || "PGA Tour",
      course: tournament.courseName || course?.name || "TBD",
      location: tournament.location || [course?.city, course?.state || course?.country].filter(Boolean).join(", "),
      round: "Upcoming",
      state: "pre",
      par: course?.par || null,
      startDate: tournament.startDate || null,
      endDate: tournament.endDate || null,
      displayDate: tournament.displayDate || null,
      leaderboard: [],
    };
  }

  let tourScheduleOut = tourSchedule;
  if (Array.isArray(tourScheduleOut)) {
    tourScheduleOut = injectEspnIntoTourScheduleIfMissing(tourScheduleOut, espnEvent);
  }

  /**
   * BDL window / suppress logic can drop both tournament and currentEvent while ESPN still
   * shows a live major (e.g. PGA Championship). Re-hydrate from ESPN so Home + slate bundles stay valid.
   */
  if (!outCurrent && !outTournament && espnEvent) {
    const espnState = String(espnEvent.state || "").toLowerCase();
    const stale = espnScoreboardEventLooksStale({
      ...espnEvent,
      date: espnEvent.startDate || espnEvent.date,
    });
    if (!stale && espnState !== "post" && espnState !== "final") {
      outCurrent = {
        id: espnEvent.id ?? null,
        name: espnEvent.name || espnEvent.shortName || "PGA Tour Event",
        shortName: espnEvent.shortName || espnEvent.name || "PGA Tour",
        course: espnEvent.course || "TBD",
        location: espnEvent.location || "",
        round: espnEvent.round || "Live",
        state: espnEvent.state || "pre",
        par: espnEvent.par ?? null,
        startDate: espnEvent.startDate || null,
        endDate: espnEvent.endDate || null,
        displayDate: espnEvent.displayDate || null,
        leaderboard: Array.isArray(espnEvent.leaderboard) ? espnEvent.leaderboard : [],
      };
      if (Array.isArray(tourScheduleOut)) {
        tourScheduleOut = injectEspnIntoTourScheduleIfMissing(tourScheduleOut, espnEvent);
      }
    }
  }

  const schedulePrimary = pickPrimaryScheduleRow(
    tourScheduleOut,
    espnEvent,
    tournament,
    Date.now(),
  );
  if (schedulePrimary) {
    if (outCurrent) {
      outCurrent = overlayCurrentEventDisplayFromSchedule(outCurrent, schedulePrimary);
    }
    const { startMs: spStart, endMs: spEnd } = scheduleRowStartEndMs(schedulePrimary);
    const nowSched = Date.now();
    const inSchedWindow =
      Number.isFinite(spStart) &&
      Number.isFinite(spEnd) &&
      nowSched >= spStart &&
      nowSched <= spEnd;
    const schedLive = normalizeString(schedulePrimary.status || "").includes("live");
    const schedMatchesEspn =
      espnEvent?.id != null &&
      String(schedulePrimary.id || "").trim() === String(espnEvent.id).trim();
    if (schedMatchesEspn || inSchedWindow || schedLive || !outTournament) {
      if (!majorConflict) {
        outTournament = schedulePrimary;
      }
    }
  }

  if (majorConflict && outCurrent && espnEvent) {
    outCurrent = {
      ...outCurrent,
      id: espnEvent.id ?? outCurrent.id,
      name: espnEvent.name || outCurrent.name,
      shortName: espnEvent.shortName || espnEvent.name || outCurrent.shortName,
      course: espnEvent.course || outCurrent.course || "TBD",
      location: espnEvent.location || outCurrent.location || "",
      round: espnEvent.round || outCurrent.round,
      state: espnEvent.state || outCurrent.state,
      displayDate: espnEvent.displayDate || outCurrent.displayDate,
      startDate: espnEvent.startDate || outCurrent.startDate,
      leaderboard: useEspnLeaderboard
        ? enrichLeaderboardRowsWithStaticSg(espnEvent.leaderboard || [])
        : outCurrent.leaderboard,
    };
    outTournament =
      (Array.isArray(tourScheduleOut) &&
        tourScheduleOut.find((row) =>
          slugOverlapsSchedule(row?.name, espnEvent.name || espnEvent.shortName),
        )) ||
      buildSyntheticScheduleRowFromEspn(espnEvent);
    console.log(
      JSON.stringify({
        tag: "[golfMergeConflict]",
        espnEvent: espnEvent.name,
        bdlEvent: tournament?.name ?? null,
        resolution: "espn_major_wins_display",
      }),
    );
  }

  return {
    currentEvent: outCurrent,
    leaderboard: outCurrent?.leaderboard ?? [],
    rankings: Array.isArray(rankings) ? rankings : [],
    odds: odds || {
      outrights: [],
      topFinish: {},
      makeCut: {},
      eventName: null,
      marketStatus: "hidden",
      fieldUnavailableMessage: null,
    },
    tournament: outTournament,
    tourSchedule: tourScheduleOut,
    course,
    recentResults: Array.isArray(bdlBundle?.results) ? bdlBundle.results : [],
    courseStats: Array.isArray(bdlBundle?.courseStats)
      ? bdlBundle.courseStats
      : [],
    sourceMeta: {
      board: useBdlLeaderboard
        ? "balldontlie_live_standings"
        : useEspnLeaderboard
        ? (sameEvent ? "bdl_espn_aligned" : "espn_leaderboard_fallback")
        : useOddsProxyLeaderboard
        ? "espn_field_proxy_lb"
        : preferEspnDisplay
        ? "espn_event_meta_primary"
        : "balldontlie_only",
      tournament: tournament ? "balldontlie" : "none",
      course: course ? "balldontlie" : "none",
      odds:
        odds?.outrights?.length > 0
          ? odds?.linesUnavailable
            ? "espn_field"
            : "odds_api"
          : odds?.fieldUnavailableMessage
            ? "field_unavailable"
            : "none",
      usedFallbackLeaderboard: !useBdlLeaderboard,
      bdlHadLeaderboard: bdlHasLeaderboard,
      espnHadLeaderboard: espnHasLeaderboard,
      espnLeaderboardSource: espnEvent?.leaderboardSource || "none",
      espnLooksFinished,
      fetchedAt: new Date().toISOString(),
      scheduleStaleSuppressed: suppressCurrent || undefined,
      bdlTournamentStaleDropped: tournament && !outTournament ? true : undefined,
    },
  };
}

export async function getUnifiedGolfBoard() {
  const cacheKey = "unified_golf_board_v24";
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const [espnEvent, rankings, espnField, bdlBundle] = await Promise.all([
    getEspnCurrentEvent(),
    getEspnWorldRankings(),
    fetchEspnGolfField(),
    getBdlTournamentBundle(),
  ]);

  const odds = buildGolfOddsFromEspnField(espnField, bdlBundle);

  const merged = mergeGolfBoard({
    espnEvent,
    bdlBundle,
    odds,
    rankings,
  });

  if (merged?.currentEvent?.id) {
    const enriched = await enrichEspnEventCourseFromHtml(merged.currentEvent);
    if (enriched?.course && enriched.course !== merged.currentEvent.course) {
      merged.currentEvent = {
        ...merged.currentEvent,
        course: enriched.course,
        location: enriched.location || merged.currentEvent.location || "",
      };
    }
  }

  let weatherAlert = null;
  let weatherSnapshot = null;
  const courseCandidates = [
    merged.tournament?.courseName,
    merged.course?.name,
    merged.currentEvent?.course,
  ];
  let courseLabelForWeather = "";
  for (const c of courseCandidates) {
    const s = String(c || "").trim();
    if (s && s !== "TBD") {
      courseLabelForWeather = s;
      break;
    }
  }
  const coords = getCourseCoords(courseLabelForWeather);

  if (coords) {
    const weather = await fetchCourseWeather(coords.lat, coords.lon);
    if (weather) {
      weatherSnapshot = {
        windSpeedMph: weather.windSpeedMph,
        precipProbability: weather.precipProbability,
        timestamp: weather.timestamp,
        courseName: courseLabelForWeather || null,
      };
      const windAlert = weather.windSpeedMph >= 15;
      const rainAlert = weather.precipProbability >= 60;
      if (windAlert || rainAlert) {
        weatherAlert = {
          sport: "golf",
          type: windAlert && rainAlert ? "wind_rain" : windAlert ? "wind" : "rain",
          windSpeedMph: weather.windSpeedMph,
          precipProbability: weather.precipProbability,
          courseName: courseLabelForWeather || null,
          timestamp: weather.timestamp,
        };
      }
    }
  }

  const courseAugmented =
    merged.course != null && typeof merged.course === "object"
      ? {
          ...merged.course,
          cutLineFeedNote: GOLF_CUT_LINE_FEED_NOTE,
          weatherAlert: weatherAlert || null,
          weatherSnapshot: weatherSnapshot || null,
        }
      : {
          cutLineFeedNote: GOLF_CUT_LINE_FEED_NOTE,
          weatherAlert: weatherAlert || null,
          weatherSnapshot: weatherSnapshot || null,
        };

  let out = {
    ...merged,
    course: courseAugmented,
    weatherAlert,
    weatherCoordsMatched: Boolean(coords),
    cutLineFeedNote: GOLF_CUT_LINE_FEED_NOTE,
  };

  try {
    out = await applyGolfBoardStatEnrichment(out);
  } catch (err) {
    console.warn("[golf] stat enrichment failed:", err?.message || err);
    out.dataCoverage = buildSportDataCoverage({ sport: "golf", board: out });
  }

  setCache(cacheKey, out, 2 * 60 * 1000);
  return out;
}
