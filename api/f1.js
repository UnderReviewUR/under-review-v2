import { applyCors } from "./_cors.js";

const OPENF1       = "https://api.openf1.org/v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map();

// ── Hardcoded 2026 driver grid fallback ───────────────────────────────────────
// Ordered by 2026 power unit strength — used when OpenF1 is down.
const FALLBACK_STANDINGS = [
  { position: 1,  full_name: "Kimi Antonelli",        team_name: "Mercedes",        points: 0,  driver_number: 12 },
  { position: 2,  full_name: "George Russell",        team_name: "Mercedes",        points: 0,  driver_number: 63 },
  { position: 3,  full_name: "Charles Leclerc",       team_name: "Ferrari",         points: 0,  driver_number: 16 },
  { position: 4,  full_name: "Lewis Hamilton",        team_name: "Ferrari",         points: 0,  driver_number: 44 },
  { position: 5,  full_name: "Lando Norris",          team_name: "McLaren",         points: 0,  driver_number: 4  },
  { position: 6,  full_name: "Oscar Piastri",         team_name: "McLaren",         points: 0,  driver_number: 81 },
  { position: 7,  full_name: "Max Verstappen",        team_name: "Red Bull Racing", points: 0,  driver_number: 1  },
  { position: 8,  full_name: "Yuki Tsunoda",          team_name: "Red Bull Racing", points: 0,  driver_number: 22 },
  { position: 9,  full_name: "Fernando Alonso",       team_name: "Aston Martin",    points: 0,  driver_number: 14 },
  { position: 10, full_name: "Lance Stroll",          team_name: "Aston Martin",    points: 0,  driver_number: 18 },
  { position: 11, full_name: "Carlos Sainz",          team_name: "Williams",        points: 0,  driver_number: 55 },
  { position: 12, full_name: "Alexander Albon",       team_name: "Williams",        points: 0,  driver_number: 23 },
  { position: 13, full_name: "Pierre Gasly",          team_name: "Alpine",          points: 0,  driver_number: 10 },
  { position: 14, full_name: "Jack Doohan",           team_name: "Alpine",          points: 0,  driver_number: 7  },
  { position: 15, full_name: "Nico Hulkenberg",       team_name: "Sauber",          points: 0,  driver_number: 27 },
  { position: 16, full_name: "Gabriel Bortoleto",     team_name: "Sauber",          points: 0,  driver_number: 5  },
  { position: 17, full_name: "Oliver Bearman",        team_name: "Haas",            points: 0,  driver_number: 87 },
  { position: 18, full_name: "Esteban Ocon",          team_name: "Haas",            points: 0,  driver_number: 31 },
  { position: 19, full_name: "Liam Lawson",           team_name: "Racing Bulls",    points: 0,  driver_number: 30 },
  { position: 20, full_name: "Isack Hadjar",          team_name: "Racing Bulls",    points: 0,  driver_number: 6  },
];

// ── Hardcoded 2026 race calendar fallback ─────────────────────────────────────
const FALLBACK_CALENDAR = [
  { meeting_name: "Australian Grand Prix",      location: "Melbourne",   date_start: "2026-03-15T00:00:00", date_end: "2026-03-17T23:59:00" },
  { meeting_name: "Chinese Grand Prix",         location: "Shanghai",    date_start: "2026-03-22T00:00:00", date_end: "2026-03-24T23:59:00" },
  { meeting_name: "Japanese Grand Prix",        location: "Suzuka",      date_start: "2026-04-05T00:00:00", date_end: "2026-04-07T23:59:00" },
  { meeting_name: "Bahrain Grand Prix",         location: "Bahrain",     date_start: "2026-04-19T00:00:00", date_end: "2026-04-21T23:59:00" },
  { meeting_name: "Saudi Arabian Grand Prix",   location: "Jeddah",      date_start: "2026-04-26T00:00:00", date_end: "2026-04-28T23:59:00" },
  { meeting_name: "Miami Grand Prix",           location: "Miami",       date_start: "2026-05-03T00:00:00", date_end: "2026-05-05T23:59:00" },
  { meeting_name: "Emilia Romagna Grand Prix",  location: "Imola",       date_start: "2026-05-17T00:00:00", date_end: "2026-05-19T23:59:00" },
  { meeting_name: "Monaco Grand Prix",          location: "Monaco",      date_start: "2026-05-24T00:00:00", date_end: "2026-05-26T23:59:00" },
  { meeting_name: "Spanish Grand Prix",         location: "Barcelona",   date_start: "2026-06-01T00:00:00", date_end: "2026-06-03T23:59:00" },
  { meeting_name: "Canadian Grand Prix",        location: "Montreal",    date_start: "2026-06-15T00:00:00", date_end: "2026-06-17T23:59:00" },
  { meeting_name: "Austrian Grand Prix",        location: "Spielberg",   date_start: "2026-06-28T00:00:00", date_end: "2026-06-30T23:59:00" },
  { meeting_name: "British Grand Prix",         location: "Silverstone", date_start: "2026-07-05T00:00:00", date_end: "2026-07-07T23:59:00" },
  { meeting_name: "Belgian Grand Prix",         location: "Spa",         date_start: "2026-07-26T00:00:00", date_end: "2026-07-28T23:59:00" },
  { meeting_name: "Hungarian Grand Prix",       location: "Budapest",    date_start: "2026-08-02T00:00:00", date_end: "2026-08-04T23:59:00" },
  { meeting_name: "Dutch Grand Prix",           location: "Zandvoort",   date_start: "2026-08-30T00:00:00", date_end: "2026-09-01T23:59:00" },
  { meeting_name: "Italian Grand Prix",         location: "Monza",       date_start: "2026-09-06T00:00:00", date_end: "2026-09-08T23:59:00" },
  { meeting_name: "Azerbaijan Grand Prix",      location: "Baku",        date_start: "2026-09-20T00:00:00", date_end: "2026-09-22T23:59:00" },
  { meeting_name: "Singapore Grand Prix",       location: "Singapore",   date_start: "2026-10-04T00:00:00", date_end: "2026-10-06T23:59:00" },
  { meeting_name: "United States Grand Prix",   location: "Austin",      date_start: "2026-10-18T00:00:00", date_end: "2026-10-20T23:59:00" },
  { meeting_name: "Mexico City Grand Prix",     location: "Mexico City", date_start: "2026-10-25T00:00:00", date_end: "2026-10-27T23:59:00" },
  { meeting_name: "Sao Paulo Grand Prix",       location: "Sao Paulo",   date_start: "2026-11-08T00:00:00", date_end: "2026-11-10T23:59:00" },
  { meeting_name: "Las Vegas Grand Prix",       location: "Las Vegas",   date_start: "2026-11-21T00:00:00", date_end: "2026-11-23T23:59:00" },
  { meeting_name: "Qatar Grand Prix",           location: "Lusail",      date_start: "2026-11-29T00:00:00", date_end: "2026-12-01T23:59:00" },
  { meeting_name: "Abu Dhabi Grand Prix",       location: "Abu Dhabi",   date_start: "2026-12-06T00:00:00", date_end: "2026-12-08T23:59:00" },
];

// ── Cache helpers ─────────────────────────────────────────────────────────────
function getCached(key) {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expires) return null;
  return entry.payload;
}

function setCached(key, payload) {
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, payload });
}

// ── safeFetch — NEVER throws, returns null on any failure ─────────────────────
async function safeFetch(path) {
  const url = path.startsWith("http") ? path : OPENF1 + path;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn("OpenF1 " + res.status + " — " + url);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn("OpenF1 fetch failed:", url, "-", err.message);
    return null;
  }
}

// ── Schedule builder ──────────────────────────────────────────────────────────
function buildSchedule(meetings) {
  const now  = new Date();
  const list = (Array.isArray(meetings) && meetings.length > 0)
    ? [...meetings]
    : [...FALLBACK_CALENDAR];

  const usingFallback = !Array.isArray(meetings) || meetings.length === 0;

  list.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());

  const inProgress = list.filter((m) => {
    const s = new Date(m.date_start);
    const e = new Date(m.date_end);
    return s <= now && now <= e;
  });

  const upcoming = list.filter((m) => new Date(m.date_start) > now);
  const past     = list.filter((m) => new Date(m.date_end)   < now);
  const nextRace = inProgress[0] || upcoming[0] || null;

  const races = list.map((m) => ({
    ...m,
    is_next: !!(nextRace && m.meeting_name === nextRace.meeting_name),
  }));

  return {
    races,
    upcoming,
    past,
    current: inProgress,
    next_meeting_key: nextRace ? (nextRace.meeting_key || null) : null,
    usingFallback,
  };
}

// ── Standings builder ─────────────────────────────────────────────────────────
// OpenF1 removed /championship_drivers — it no longer exists.
// We build standings from /drivers (session roster) and overlay onto
// the fallback grid which preserves correct 2026 PU order.
function buildStandings(drivers) {
  if (!Array.isArray(drivers) || drivers.length === 0) {
    return FALLBACK_STANDINGS;
  }

  // Deduplicate by driver_number
  const byNumber = new Map();
  for (const d of drivers) {
    byNumber.set(d.driver_number, d);
  }

  // Overlay live team names onto fallback standings order
  return FALLBACK_STANDINGS.map((fb) => {
    const live = byNumber.get(fb.driver_number);
    return {
      ...fb,
      full_name:   (live && live.full_name)   || fb.full_name,
      team_name:   (live && live.team_name)   || fb.team_name,
      team_colour: (live && live.team_colour) || null,
    };
  });
}

// ── Individual data fetchers ──────────────────────────────────────────────────
async function getScheduleData() {
  const cached = getCached("schedule");
  if (cached) return cached;
  const meetings = await safeFetch("/meetings?year=2026");
  const data = buildSchedule(meetings);
  setCached("schedule", data);
  return data;
}

async function getDriverData() {
  const cached = getCached("drivers");
  if (cached) return cached;
  const drivers   = await safeFetch("/drivers?session_key=latest");
  const standings = buildStandings(drivers);
  const data = { standings, drivers_raw: drivers || [] };
  setCached("drivers", data);
  return data;
}

async function getSessionData() {
  const cached = getCached("session");
  if (cached) return cached;
  const [sessionRaw, meetingSessionsRaw] = await Promise.all([
    safeFetch("/sessions?session_key=latest"),
    safeFetch("/sessions?meeting_key=latest"),
  ]);
  const session  = Array.isArray(sessionRaw) ? sessionRaw[0] : (sessionRaw || null);
  const sessions = Array.isArray(meetingSessionsRaw)
    ? [...meetingSessionsRaw].sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
    : [];
  const data = { session: session || null, sessions };
  setCached("session", data);
  return data;
}

// ── Main handler ──────────────────────────────────────────────────────────────
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
      const { standings } = await getDriverData();
      return res.status(200).json({ standings });
    }

    if (view === "session") {
      const sessionPayload = await getSessionData();
      return res.status(200).json(sessionPayload);
    }

    if (view === "board") {
      const cached = getCached("board");
      if (cached) return res.status(200).json(cached);

      // All three run in parallel — each handles its own failures silently
      const [scheduleFull, driversFull, sessionFull] = await Promise.all([
        getScheduleData(),
        getDriverData(),
        getSessionData(),
      ]);

      const body = {
        schedule:      scheduleFull,
        standings:     driversFull.standings,
        session:       sessionFull.session,
        sessions:      sessionFull.sessions,
        usingFallback: scheduleFull.usingFallback || false,
      };

      setCached("board", body);
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      return res.status(200).json(body);
    }

    return res.status(400).json({
      error:   "Invalid view",
      allowed: ["board", "schedule", "standings", "session"],
    });

  } catch (err) {
    // Absolute last resort — return 200 with fallback data, never a 500
    console.error("F1 handler unhandled error:", err);
    const now      = new Date();
    const upcoming = FALLBACK_CALENDAR.filter((m) => new Date(m.date_start) > now);
    const past     = FALLBACK_CALENDAR.filter((m) => new Date(m.date_end)   < now);
    const current  = FALLBACK_CALENDAR.filter((m) => {
      const s = new Date(m.date_start);
      const e = new Date(m.date_end);
      return s <= now && now <= e;
    });
    return res.status(200).json({
      schedule:      { races: FALLBACK_CALENDAR, upcoming, past, current, usingFallback: true },
      standings:     FALLBACK_STANDINGS,
      session:       null,
      sessions:      [],
      usingFallback: true,
    });
  }
}
