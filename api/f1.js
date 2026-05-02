import crypto from "crypto";
import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { extractGrandPrixRaceStartFromSessions } from "../shared/f1RaceStart.js";

const DEFAULT_OPENF1_BASE = "https://api.openf1.org/v1";

function resolveOpenF1BaseUrl() {
  const raw = getEnv("OPENF1_BASE_URL") || getEnv("UR_OPENF1_BASE_URL");
  if (!raw || typeof raw !== "string") return DEFAULT_OPENF1_BASE;
  const u = raw.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(u)) {
    console.warn("[f1] OPENF1_BASE_URL must be an absolute http(s) URL; using public OpenF1");
    return DEFAULT_OPENF1_BASE;
  }
  return u;
}

function resolveOpenF1AuthHeaders() {
  const auth = getEnv("OPENF1_AUTHORIZATION");
  if (auth) return { Authorization: auth };
  const apiKey = getEnv("OPENF1_API_KEY");
  if (apiKey) return { Authorization: apiKey };
  return {};
}

const OPENF1_BASE = resolveOpenF1BaseUrl();
const OPENF1_TIMING_SOURCE =
  OPENF1_BASE !== DEFAULT_OPENF1_BASE ? "custom" : "public";

/** Partition in-memory caches when switching OpenF1 backends (public vs self-hosted). */
const OPENF1_CACHE_TAG = crypto.createHash("sha256").update(OPENF1_BASE).digest("hex").slice(0, 10);

function f1CacheKey(name) {
  return `${name}_${OPENF1_CACHE_TAG}`;
}

function openf1TimingUxFields() {
  const base = {
    openf1TimingSource: OPENF1_TIMING_SOURCE,
  };
  if (OPENF1_TIMING_SOURCE !== "custom") return base;
  try {
    return { ...base, openf1TimingHost: new URL(OPENF1_BASE).hostname };
  } catch {
    return base;
  }
}
const ESPN_F1_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard";

/** Approximate circuit centers for Open-Meteo (2026 calendar — extend as needed). */
const CIRCUIT_COORDS_BY_FULL_NAME = {
  "Miami International Autodrome": { lat: 25.9581, lon: -80.2389 },
  "Albert Park Circuit": { lat: -37.8497, lon: 144.968 },
  "Shanghai International Circuit": { lat: 31.3389, lon: 121.2205 },
  "Suzuka International Racing Course": { lat: 34.8431, lon: 136.541 },
  "Bahrain International Circuit": { lat: 26.0325, lon: 50.5106 },
  "Jeddah Corniche Circuit": { lat: 21.6319, lon: 39.1044 },
  "Circuit Gilles Villeneuve": { lat: 45.5, lon: -73.5228 },
  "Circuit de Monaco": { lat: 43.7347, lon: 7.4206 },
};

const CIRCUIT_COORDS_BY_MEETING_NAME = {
  "Miami Grand Prix": { lat: 25.9581, lon: -80.2389 },
  "Australian Grand Prix": { lat: -37.8497, lon: 144.968 },
  "Chinese Grand Prix": { lat: 31.3389, lon: 121.2205 },
  "Japanese Grand Prix": { lat: 34.8431, lon: 136.541 },
  "Bahrain Grand Prix": { lat: 26.0325, lon: 50.5106 },
  "Saudi Arabian Grand Prix": { lat: 21.6319, lon: 39.1044 },
  "Canadian Grand Prix": { lat: 45.5, lon: -73.5228 },
  "Monaco Grand Prix": { lat: 43.7347, lon: 7.4206 },
};

const CACHE_TTL = {
  board: 3 * 60 * 1000,
  schedule: 30 * 60 * 1000,
  session: 60 * 1000,
  drivers: 6 * 60 * 60 * 1000,
};

const cache = new Map();

const FALLBACK_STANDINGS = [
  { position: 1, full_name: "Kimi Antonelli", team_name: "Mercedes", points: 62, driver_number: 12 },
  { position: 2, full_name: "George Russell", team_name: "Mercedes", points: 43, driver_number: 63 },
  { position: 3, full_name: "Charles Leclerc", team_name: "Ferrari", points: 30, driver_number: 16 },
  { position: 4, full_name: "Oscar Piastri", team_name: "McLaren", points: 18, driver_number: 81 },
  { position: 5, full_name: "Lewis Hamilton", team_name: "Ferrari", points: 15, driver_number: 44 },
  { position: 6, full_name: "Lando Norris", team_name: "McLaren", points: 12, driver_number: 4 },
  { position: 7, full_name: "Max Verstappen", team_name: "Red Bull", points: 8, driver_number: 1 },
  { position: 8, full_name: "Carlos Sainz", team_name: "Williams", points: 6, driver_number: 55 },
  { position: 9, full_name: "Fernando Alonso", team_name: "Aston Martin", points: 4, driver_number: 14 },
  { position: 10, full_name: "Isack Hadjar", team_name: "Red Bull", points: 4, driver_number: 6 },
  { position: 11, full_name: "Alexander Albon", team_name: "Williams", points: 2, driver_number: 23 },
  { position: 12, full_name: "Pierre Gasly", team_name: "Alpine", points: 1, driver_number: 10 },
  { position: 13, full_name: "Liam Lawson", team_name: "Racing Bulls", points: 0, driver_number: 30 },
  { position: 14, full_name: "Arvid Lindblad", team_name: "Racing Bulls", points: 0, driver_number: 8 },
  { position: 15, full_name: "Lance Stroll", team_name: "Aston Martin", points: 0, driver_number: 18 },
  { position: 16, full_name: "Franco Colapinto", team_name: "Alpine", points: 0, driver_number: 43 },
  { position: 17, full_name: "Nico Hulkenberg", team_name: "Audi", points: 0, driver_number: 27 },
  { position: 18, full_name: "Gabriel Bortoleto", team_name: "Audi", points: 0, driver_number: 5 },
  { position: 19, full_name: "Oliver Bearman", team_name: "Haas", points: 0, driver_number: 87 },
  { position: 20, full_name: "Esteban Ocon", team_name: "Haas", points: 0, driver_number: 31 },
  { position: 21, full_name: "Valtteri Bottas", team_name: "Cadillac", points: 0, driver_number: 77 },
  { position: 22, full_name: "Sergio Perez", team_name: "Cadillac", points: 0, driver_number: 11 },
];

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.payload;
}

function setCached(key, payload, ttlMs) {
  cache.set(key, {
    expires: Date.now() + ttlMs,
    payload,
  });
}

const QUALIFYING_NOT_DONE_NOTE = "Qualifying not yet complete for this event.";

const DRIVER_RACE_HISTORY_FEED_NOTE =
  "Driver race history: not available in current feed. Do not cite specific finishing positions from prior races. Reason from current standings and qualifying position only.";

const STANDINGS_FALLBACK_FEED_NOTE =
  "DATA NOTE: F1 standings are using fallback data. Treat with lower confidence. Do not cite specific championship points as confirmed.";

function findQualifyingSessionKey(sessions) {
  if (!Array.isArray(sessions)) return null;
  const qual = sessions.find((s) => {
    const t = String(s.session_type || "").toLowerCase();
    const n = String(s.session_name || "").toLowerCase();
    return t === "qualifying" || n === "qualifying";
  });
  return qual?.session_key ?? null;
}

function buildDriverLookup(standings, driversRaw) {
  const m = new Map();
  for (const row of standings || []) {
    if (row?.driver_number != null) {
      m.set(row.driver_number, {
        full_name: row.full_name,
        team_name: row.team_name,
      });
    }
  }
  for (const d of driversRaw || []) {
    const num = d?.driver_number;
    if (num != null && !m.has(num)) {
      m.set(num, { full_name: d.full_name, team_name: d.team_name });
    }
  }
  return m;
}

async function fetchQualifyingGridForSession(sessionKey, driverByNumber) {
  if (sessionKey == null) {
    return { qualifyingGrid: null, qualifyingNote: QUALIFYING_NOT_DONE_NOTE };
  }
  const res = await safeFetch(`/starting_grid?session_key=${sessionKey}`, { timeoutMs: 5000 });
  if (!res.ok || !Array.isArray(res.data) || res.data.length === 0) {
    return { qualifyingGrid: null, qualifyingNote: QUALIFYING_NOT_DONE_NOTE };
  }
  const sorted = res.data.slice().sort((a, b) => (a.position || 0) - (b.position || 0));
  const qualifyingGrid = sorted.map((r) => {
    const num = r.driver_number;
    const meta = driverByNumber.get(num) || {};
    const driver = meta.full_name || `Driver #${num}`;
    const team = meta.team_name || "Unknown";
    return { position: r.position, driver, team };
  });
  return { qualifyingGrid, qualifyingNote: null };
}

async function enrichScheduleWithEspn(schedule) {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(ESPN_F1_SCOREBOARD, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return schedule;
    const data = await res.json();
    const event = data?.events?.[0];
    if (!event) return schedule;

    const circuitName = event?.circuit?.fullName || null;
    const city = event?.circuit?.address?.city || null;
    const raceSession = Array.isArray(event?.competitions)
      ? event.competitions.find((c) => c?.type?.abbreviation === "Race")
      : null;
    const raceStart = raceSession?.startDate || null;

    const nextRace = schedule?.races?.find((r) => r?.is_next);
    if (nextRace && circuitName) {
      nextRace.circuitFullName = circuitName;
      nextRace.circuitCity = city;
      nextRace.espnRaceStart = raceStart;
    }
    return schedule;
  } catch {
    return schedule;
  }
}

async function fetchRaceWeather(lat, lon) {
  if (lat == null || lon == null) return null;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation_probability,wind_speed_10m&timezone=auto&forecast_days=1`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const windKph = data?.current_weather?.windspeed ?? null;
    if (windKph == null) return null;
    const hourlyProb = data?.hourly?.precipitation_probability;
    const precipProbability =
      Array.isArray(hourlyProb) && hourlyProb.length > 0 ? hourlyProb[0] : 0;
    return {
      windSpeedMph: Math.round(windKph * 0.621371),
      precipProbability,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function resolveRaceWeatherCoords(race) {
  if (!race || typeof race !== "object") return null;
  const byFull = race.circuitFullName && CIRCUIT_COORDS_BY_FULL_NAME[race.circuitFullName];
  if (byFull) return byFull;
  const byMeeting = race.meeting_name && CIRCUIT_COORDS_BY_MEETING_NAME[race.meeting_name];
  return byMeeting || null;
}

async function weatherForNextRace(schedule) {
  const nextRace = schedule?.races?.find((r) => r?.is_next);
  if (!nextRace) return null;
  const coords = resolveRaceWeatherCoords(nextRace);
  if (!coords) return null;
  return fetchRaceWeather(coords.lat, coords.lon);
}

async function safeFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${OPENF1_BASE}${path}`;
  const timeoutMs = options.timeoutMs || 5000;
  const authHeaders = resolveOpenF1AuthHeaders();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...authHeaders,
        ...(options.headers && typeof options.headers === "object" ? options.headers : {}),
      },
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`OpenF1 ${res.status} - ${url}`);
      return { ok: false, status: res.status, data: null };
    }

    const data = await res.json();
    return { ok: true, status: res.status, data };
  } catch (err) {
    console.warn(`OpenF1 fetch failed: ${url} - ${err.message}`);
    return { ok: false, status: 0, data: null };
  }
}

const VALID_2026_RACES = new Set([
  "Australian Grand Prix",
  "Chinese Grand Prix",
  "Japanese Grand Prix",
  "Miami Grand Prix",
  "Canadian Grand Prix",
  "Monaco Grand Prix",
  "Spanish Grand Prix",
  "Austrian Grand Prix",
  "British Grand Prix",
  "Belgian Grand Prix",
  "Hungarian Grand Prix",
  "Dutch Grand Prix",
  "Italian Grand Prix",
  "Spanish Grand Prix (Madrid)",
  "Azerbaijan Grand Prix",
  "Singapore Grand Prix",
  "United States Grand Prix",
  "Mexico City Grand Prix",
  "Sao Paulo Grand Prix",
  "Las Vegas Grand Prix",
  "Qatar Grand Prix",
  "Abu Dhabi Grand Prix",
]);

function buildSchedule(meetings) {
  const now = new Date();

  if (!Array.isArray(meetings) || meetings.length === 0) {
    return {
      races: [],
      upcoming: [],
      past: [],
      current: [],
      next_meeting_key: null,
      usingFallback: true,
    };
  }

  const normalized = meetings
    .map((m) => {
      const start = new Date(m.date_start);
      const end = m.date_end
        ? new Date(m.date_end)
        : new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000);
      const raceDateRaw = m.race_date || m.date_end || m.date_start;

      const meetingName =
        m.meeting_name || m.meeting_official_name || "Grand Prix";

      const completed =
        typeof m.completed === "boolean" ? m.completed : end < now;

      return {
        meeting_key: m.meeting_key || null,
        meeting_name: meetingName,
        location: m.location || m.country_name || m.circuit_short_name || "TBD",
        circuit_short_name: m.circuit_short_name || null,
        country_name: m.country_name || null,
        date_start: m.date_start,
        date_end: m.date_end || end.toISOString(),
        race_date: raceDateRaw,
        race_start: null,
        completed,
        winner: m.winner || null,
      };
    })
    .filter((m) => VALID_2026_RACES.has(m.meeting_name))
    .sort((a, b) => new Date(a.race_date || a.date_start).getTime() - new Date(b.race_date || b.date_start).getTime());

  if (normalized.length === 0) {
    return {
      races: [],
      upcoming: [],
      past: [],
      current: [],
      next_meeting_key: null,
      usingFallback: true,
    };
  }

  const current = normalized.filter((m) => {
    const start = new Date(m.date_start);
    const end = new Date(m.date_end);
    return start <= now && now <= end;
  });

  const upcoming = normalized.filter((m) => !m.completed && new Date(m.race_date || m.date_start) > now);
  const past = normalized.filter((m) => m.completed || new Date(m.date_end) < now);

  const nextRace = current[0] || upcoming[0] || null;

  const races = normalized.map((m) => ({
    ...m,
    is_next: !!(nextRace && m.meeting_name === nextRace.meeting_name),
  }));

  return {
    races,
    upcoming,
    past,
    current,
    next_meeting_key: nextRace ? nextRace.meeting_key : null,
    usingFallback: false,
  };
}

function extractRaceSessionStart(sessions) {
  return extractGrandPrixRaceStartFromSessions(sessions);
}

/** Apply OpenF1 race session starts per meeting_key (null = leave race_start unchanged). */
function applyRaceStartsMapToSchedule(schedule, startByMeeting) {
  if (!schedule || !(startByMeeting instanceof Map) || startByMeeting.size === 0) return schedule;
  const patchRace = (r) => {
    const mk = r?.meeting_key;
    if (mk == null) return r;
    const st = startByMeeting.get(mk);
    return st ? { ...r, race_start: st } : r;
  };

  return {
    ...schedule,
    races: Array.isArray(schedule.races) ? schedule.races.map(patchRace) : [],
    upcoming: Array.isArray(schedule.upcoming) ? schedule.upcoming.map(patchRace) : schedule.upcoming,
    past: Array.isArray(schedule.past) ? schedule.past.map(patchRace) : schedule.past,
    current: Array.isArray(schedule.current) ? schedule.current.map(patchRace) : schedule.current,
  };
}

function buildStandings(drivers) {
  if (!Array.isArray(drivers) || drivers.length === 0) {
    return FALLBACK_STANDINGS;
  }

  const byNumber = new Map();
  for (const d of drivers) {
    byNumber.set(d.driver_number, d);
  }

  return FALLBACK_STANDINGS.map((fb) => {
    const live = byNumber.get(fb.driver_number);
    return {
      position: fb.position,
      points: fb.points,
      driver_number: fb.driver_number,
      full_name: (live && live.full_name) || fb.full_name,
      team_name: (live && live.team_name) || fb.team_name,
      team_colour: (live && live.team_colour) || null,
    };
  });
}

async function getScheduleData() {
  const cached = getCached(f1CacheKey("f1_schedule_v5"));
  if (cached) return cached;

  const result = await safeFetch("/meetings?year=2026", { timeoutMs: 5000 });
  let data = buildSchedule(result.ok ? result.data : null);

  const rows = [
    ...(Array.isArray(data?.upcoming) ? data.upcoming : []),
    ...(Array.isArray(data?.current) ? data.current : []),
  ];
  const meetingKeySet = new Set(rows.map((r) => r?.meeting_key).filter((k) => k != null));
  if (data?.next_meeting_key != null) meetingKeySet.add(data.next_meeting_key);
  const meetingKeys = [...meetingKeySet];

  const startByMeeting = new Map();
  await Promise.all(
    meetingKeys.map(async (mk) => {
      const sessionsRes = await safeFetch(`/sessions?meeting_key=${mk}`, { timeoutMs: 5000 });
      const raceStart = extractRaceSessionStart(
        sessionsRes.ok && Array.isArray(sessionsRes.data) ? sessionsRes.data : [],
      );
      if (!raceStart) {
        console.warn(`[f1] No OpenF1 session with session_name "Race" for meeting_key=${mk}`);
      } else {
        startByMeeting.set(mk, raceStart);
      }
    }),
  );

  data = applyRaceStartsMapToSchedule(data, startByMeeting);
  data = await enrichScheduleWithEspn(data);

  setCached(f1CacheKey("f1_schedule_v5"), data, CACHE_TTL.schedule);
  return data;
}

async function getDriverData() {
  const cached = getCached(f1CacheKey("f1_drivers"));
  if (cached) return cached;

  const result = await safeFetch("/drivers?session_key=latest", { timeoutMs: 4000 });

  const payload = {
    standings: buildStandings(result.ok ? result.data : null),
    drivers_raw: result.ok && Array.isArray(result.data) ? result.data : [],
    usingFallbackDrivers: !result.ok,
  };

  setCached(f1CacheKey("f1_drivers"), payload, CACHE_TTL.drivers);
  return payload;
}

async function getSessionData() {
  const cached = getCached(f1CacheKey("f1_session"));
  if (cached) return cached;

  const latestSessionRes = await safeFetch("/sessions?session_key=latest", { timeoutMs: 3500 });

  const latestSession =
    latestSessionRes.ok && Array.isArray(latestSessionRes.data)
      ? latestSessionRes.data[0] || null
      : null;

  let meetingSessionsRes = { ok: false, status: 0, data: null };

  if (latestSession?.meeting_key) {
    meetingSessionsRes = await safeFetch(`/sessions?meeting_key=${latestSession.meeting_key}`, { timeoutMs: 3500 });
  }

  const sessions =
    meetingSessionsRes.ok && Array.isArray(meetingSessionsRes.data)
      ? meetingSessionsRes.data
          .slice()
          .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
      : [];

  const payload = {
    session: latestSession,
    sessions,
    usingFallbackSession: !latestSession,
  };

  setCached(f1CacheKey("f1_session"), payload, CACHE_TTL.session);
  return payload;
}

function buildFallbackBoard() {
  return {
    schedule: {
      races: [],
      upcoming: [],
      past: [],
      current: [],
      next_meeting_key: null,
      usingFallback: true,
    },
    standings: FALLBACK_STANDINGS,
    session: null,
    sessions: [],
    usingFallback: true,
    qualifyingGrid: null,
    qualifyingNote: QUALIFYING_NOT_DONE_NOTE,
    raceHistoryFeedNote: DRIVER_RACE_HISTORY_FEED_NOTE,
    standingsFallbackFeedNote: STANDINGS_FALLBACK_FEED_NOTE,
    weather: null,
    ...openf1TimingUxFields(),
  };
}

/**
 * Focus schedule row from user wording (e.g. Miami Grand Prix) for UR Take.
 * @param {object} body
 * @param {string} question
 */
function enrichF1ContextForQuery(body, question) {
  const q = String(question || "").toLowerCase();
  const races = body?.schedule?.races || [];
  let focusedRace =
    races.find((r) => {
      const mn = String(r.meeting_name || "").toLowerCase();
      if (!mn) return false;
      const shortTok = mn.replace(/\s+grand\s+prix$/i, "").trim();
      const tokens = shortTok.split(/\s+/).filter((w) => w.length > 2);
      return tokens.some((t) => q.includes(t));
    }) || null;
  if (!focusedRace && q.includes("miami")) {
    focusedRace = races.find((r) => /miami/i.test(String(r.meeting_name || ""))) || null;
  }
  if (!focusedRace) {
    focusedRace = races.find((r) => r.is_next) || races[0] || null;
  }

  return {
    ...body,
    queryFocus: focusedRace
      ? {
          meeting_name: focusedRace.meeting_name,
          circuit_short_name: focusedRace.circuit_short_name,
          location: focusedRace.location,
          race_start: focusedRace.race_start || null,
          race_date: focusedRace.race_date || focusedRace.date_start || null,
          is_next_on_calendar: !!focusedRace.is_next,
        }
      : null,
    raceOnlyMarketMenu: [
      "Race winner (outright)",
      "Podium (top 3)",
      "Points finish (top 6/8/10 — book-dependent)",
      "Head-to-head / driver matchup",
      "Fastest lap",
      "Safety car yes/no (if listed)",
    ],
    urTakeGuidance: {
      whenOddsThin:
        "If live odds/grid are thin, favor driver matchup or points-finish framing over naked outright/podium — still give a monitoring plan. Never ask the user to paste F1 data.",
    },
  };
}

async function assembleF1BoardBody() {
  const [schedule, driverResult, sessionPayload] = await Promise.all([
    getScheduleData(),
    getDriverData(),
    getSessionData(),
  ]);

  const driverByNumber = buildDriverLookup(driverResult.standings, driverResult.drivers_raw);
  const qualSessionKey = findQualifyingSessionKey(sessionPayload.sessions);
  const qualPayload = await fetchQualifyingGridForSession(qualSessionKey, driverByNumber);

  const usingFallback =
    !!schedule.usingFallback ||
    !!driverResult.usingFallbackDrivers ||
    !!sessionPayload.usingFallbackSession;

  const weather = await weatherForNextRace(schedule);

  return {
    schedule,
    standings: driverResult.standings,
    session: sessionPayload.session,
    sessions: sessionPayload.sessions,
    usingFallback,
    qualifyingGrid: qualPayload.qualifyingGrid,
    qualifyingNote: qualPayload.qualifyingNote,
    raceHistoryFeedNote: DRIVER_RACE_HISTORY_FEED_NOTE,
    standingsFallbackFeedNote: usingFallback ? STANDINGS_FALLBACK_FEED_NOTE : null,
    weather,
    ...openf1TimingUxFields(),
  };
}

/**
 * Server-side F1 payload for UR Take — same sources as GET ?view=board, plus query-focused race metadata.
 * @param {{ question?: string }} [opts]
 */
export async function buildF1UrTakeContext(opts = {}) {
  const question = String(opts?.question || "");
  try {
    const cached = getCached(f1CacheKey("f1_board_v7"));
    if (cached) {
      return enrichF1ContextForQuery(
        {
          ...cached,
          urTakeAssembly: {
            sources: ["cached_openf1_board"],
            assembledAt: new Date().toISOString(),
          },
        },
        question,
      );
    }

    const body = await assembleF1BoardBody();
    sources.push("openf1_live_assembly");
    const full = {
      ...body,
      urTakeAssembly: {
        sources,
        assembledAt: new Date().toISOString(),
      },
    };
    return enrichF1ContextForQuery(full, question);
  } catch (err) {
    console.error("[f1] buildF1UrTakeContext:", err?.message || err);
    return enrichF1ContextForQuery(
      {
        ...buildFallbackBoard(),
        urTakeAssembly: { sources: ["fallback_board"], error: String(err?.message || err), assembledAt: new Date().toISOString() },
      },
      question,
    );
  }
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const view = String(req.query.view || "board").toLowerCase();

  try {
    if (view === "schedule") {
      const schedule = await getScheduleData();
      return res.status(200).json(schedule);
    }

    if (view === "standings") {
      const driverResult = await getDriverData();
      return res.status(200).json({
        standings: driverResult.standings,
        usingFallback: driverResult.usingFallbackDrivers || false,
      });
    }

    if (view === "session") {
      const sessionPayload = await getSessionData();
      return res.status(200).json(sessionPayload);
    }

    if (view === "board") {
      const cached = getCached(f1CacheKey("f1_board_v7"));
      if (cached) {
        res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
        return res.status(200).json(cached);
      }

      const body = await assembleF1BoardBody();

      setCached(f1CacheKey("f1_board_v7"), body, CACHE_TTL.board);
      res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
      return res.status(200).json(body);
    }

    return res.status(400).json({
      error: "Invalid view",
      allowed: ["board", "schedule", "standings", "session"],
    });
  } catch (err) {
    console.error("F1 handler error:", err);
    return res.status(200).json(buildFallbackBoard());
  }
}
