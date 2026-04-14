import { applyCors } from "./_cors.js";

const OPENF1 = "https://api.openf1.org/v1";

// Longer cache windows to reduce rate-limit pressure
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

// Miami is intentionally next in fallback
const FALLBACK_CALENDAR = [
  { meeting_name: "Australian Grand Prix", location: "Melbourne", date_start: "2026-03-06T00:00:00", date_end: "2026-03-08T23:59:00", completed: true, winner: "Russell" },
  { meeting_name: "Chinese Grand Prix", location: "Shanghai", date_start: "2026-03-13T00:00:00", date_end: "2026-03-15T23:59:00", completed: true, winner: "Antonelli" },
  { meeting_name: "Japanese Grand Prix", location: "Suzuka", date_start: "2026-03-27T00:00:00", date_end: "2026-03-29T23:59:00", completed: true, winner: "Antonelli" },
  { meeting_name: "Miami Grand Prix", location: "Miami", date_start: "2026-05-01T00:00:00", date_end: "2026-05-03T23:59:00", completed: false, winner: null },
  { meeting_name: "Canadian Grand Prix", location: "Montreal", date_start: "2026-05-22T00:00:00", date_end: "2026-05-24T23:59:00", completed: false, winner: null },
  { meeting_name: "Monaco Grand Prix", location: "Monaco", date_start: "2026-06-05T00:00:00", date_end: "2026-06-07T23:59:00", completed: false, winner: null },
  { meeting_name: "Spanish Grand Prix", location: "Barcelona", date_start: "2026-06-12T00:00:00", date_end: "2026-06-14T23:59:00", completed: false, winner: null },
  { meeting_name: "Austrian Grand Prix", location: "Spielberg", date_start: "2026-06-26T00:00:00", date_end: "2026-06-28T23:59:00", completed: false, winner: null },
  { meeting_name: "British Grand Prix", location: "Silverstone", date_start: "2026-07-03T00:00:00", date_end: "2026-07-05T23:59:00", completed: false, winner: null },
  { meeting_name: "Belgian Grand Prix", location: "Spa", date_start: "2026-07-17T00:00:00", date_end: "2026-07-19T23:59:00", completed: false, winner: null },
  { meeting_name: "Hungarian Grand Prix", location: "Budapest", date_start: "2026-07-24T00:00:00", date_end: "2026-07-26T23:59:00", completed: false, winner: null },
  { meeting_name: "Dutch Grand Prix", location: "Zandvoort", date_start: "2026-08-21T00:00:00", date_end: "2026-08-23T23:59:00", completed: false, winner: null },
  { meeting_name: "Italian Grand Prix", location: "Monza", date_start: "2026-09-04T00:00:00", date_end: "2026-09-06T23:59:00", completed: false, winner: null },
  { meeting_name: "Spanish Grand Prix (Madrid)", location: "Madrid", date_start: "2026-09-11T00:00:00", date_end: "2026-09-13T23:59:00", completed: false, winner: null },
  { meeting_name: "Azerbaijan Grand Prix", location: "Baku", date_start: "2026-09-24T00:00:00", date_end: "2026-09-26T23:59:00", completed: false, winner: null },
  { meeting_name: "Singapore Grand Prix", location: "Singapore", date_start: "2026-10-09T00:00:00", date_end: "2026-10-11T23:59:00", completed: false, winner: null },
  { meeting_name: "United States Grand Prix", location: "Austin", date_start: "2026-10-23T00:00:00", date_end: "2026-10-25T23:59:00", completed: false, winner: null },
  { meeting_name: "Mexico City Grand Prix", location: "Mexico City", date_start: "2026-10-30T00:00:00", date_end: "2026-11-01T23:59:00", completed: false, winner: null },
  { meeting_name: "Sao Paulo Grand Prix", location: "Sao Paulo", date_start: "2026-11-06T00:00:00", date_end: "2026-11-08T23:59:00", completed: false, winner: null },
  { meeting_name: "Las Vegas Grand Prix", location: "Las Vegas", date_start: "2026-11-19T00:00:00", date_end: "2026-11-21T23:59:00", completed: false, winner: null },
  { meeting_name: "Qatar Grand Prix", location: "Lusail", date_start: "2026-11-27T00:00:00", date_end: "2026-11-29T23:59:00", completed: false, winner: null },
  { meeting_name: "Abu Dhabi Grand Prix", location: "Abu Dhabi", date_start: "2026-12-04T00:00:00", date_end: "2026-12-06T23:59:00", completed: false, winner: null },
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

async function safeFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${OPENF1}${path}`;
  const timeoutMs = options.timeoutMs || 5000;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`OpenF1 ${res.status} - ${url}`);
      return {
        ok: false,
        status: res.status,
        data: null,
      };
    }

    const data = await res.json();
    return {
      ok: true,
      status: res.status,
      data,
    };
  } catch (err) {
    console.warn(`OpenF1 fetch failed: ${url} - ${err.message}`);
    return {
      ok: false,
      status: 0,
      data: null,
    };
  }
}

function buildSchedule(meetings) {
  const now = new Date();
  const list = Array.isArray(meetings) && meetings.length > 0
    ? meetings.slice()
    : FALLBACK_CALENDAR.slice();

  const usingFallback = !Array.isArray(meetings) || meetings.length === 0;

  list.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());

  const normalized = list.map((m) => {
    const start = new Date(m.date_start);
    const end = m.date_end ? new Date(m.date_end) : new Date(start.getTime() + (3 * 24 * 60 * 60 * 1000));
    const completed = typeof m.completed === "boolean" ? m.completed : end < now;

    return {
      meeting_key: m.meeting_key || null,
      meeting_name: m.meeting_name || m.meeting_official_name || "Grand Prix",
      location: m.location || m.country_name || m.circuit_short_name || "TBD",
      circuit_short_name: m.circuit_short_name || null,
      country_name: m.country_name || null,
      date_start: m.date_start,
      date_end: m.date_end || end.toISOString(),
      completed,
      winner: m.winner || null,
    };
  });

  const current = normalized.filter((m) => {
    const start = new Date(m.date_start);
    const end = new Date(m.date_end);
    return start <= now && now <= end;
  });

  const upcoming = normalized.filter((m) => !m.completed && new Date(m.date_start) > now);
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
    usingFallback,
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
  const cached = getCached("f1_schedule");
  if (cached) return cached;

  const result = await safeFetch("/meetings?year=2026", { timeoutMs: 5000 });
  const data = buildSchedule(result.ok ? result.data : null);

  setCached("f1_schedule", data, CACHE_TTL.schedule);
  return data;
}

async function getDriverData() {
  const cached = getCached("f1_drivers");
  if (cached) return cached;

  const result = await safeFetch("/drivers?session_key=latest", { timeoutMs: 4000 });

  const payload = {
    standings: buildStandings(result.ok ? result.data : null),
    drivers_raw: result.ok && Array.isArray(result.data) ? result.data : [],
    usingFallbackDrivers: !result.ok,
  };

  setCached("f1_drivers", payload, CACHE_TTL.drivers);
  return payload;
}

async function getSessionData() {
  const cached = getCached("f1_session");
  if (cached) return cached;

  const [latestSessionRes, meetingSessionsRes] = await Promise.all([
    safeFetch("/sessions?session_key=latest", { timeoutMs: 3500 }),
    safeFetch("/sessions?meeting_key=latest", { timeoutMs: 3500 }),
  ]);

  const latestSession = latestSessionRes.ok && Array.isArray(latestSessionRes.data)
    ? latestSessionRes.data[0] || null
    : null;

  const sessions = meetingSessionsRes.ok && Array.isArray(meetingSessionsRes.data)
    ? meetingSessionsRes.data
        .slice()
        .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
    : [];

  const payload = {
    session: latestSession,
    sessions,
    usingFallbackSession: !latestSessionRes.ok && !meetingSessionsRes.ok,
  };

  setCached("f1_session", payload, CACHE_TTL.session);
  return payload;
}

function buildFallbackBoard() {
  const schedule = buildSchedule(null);
  return {
    schedule,
    standings: FALLBACK_STANDINGS,
    session: null,
    sessions: [],
    usingFallback: true,
  };
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
      const cached = getCached("f1_board");
      if (cached) {
        res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
        return res.status(200).json(cached);
      }

      const [schedule, driverResult, sessionPayload] = await Promise.all([
        getScheduleData(),
        getDriverData(),
        getSessionData(),
      ]);

      const body = {
        schedule,
        standings: driverResult.standings,
        session: sessionPayload.session,
        sessions: sessionPayload.sessions,
        usingFallback:
          !!schedule.usingFallback ||
          !!driverResult.usingFallbackDrivers ||
          !!sessionPayload.usingFallbackSession,
      };

      setCached("f1_board", body, CACHE_TTL.board);
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
