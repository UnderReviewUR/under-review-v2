import { applyCors } from "./_cors.js";

const OPENF1 = "https://api.openf1.org/v1";

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

/**
 * OpenF1: use the Grand Prix session only — session_name must be exactly "Race"
 * (case-insensitive). Ignore practice, qualifying, sprint, shakedown, etc.
 */
function extractRaceSessionStart(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  const excluded = ["sprint", "practice", "qualifying", "qualy", "shakedown"];
  const raceSessions = sessions.filter((s) => {
    const raw = String(s?.session_name || "").trim();
    const name = raw.toLowerCase();
    if (name !== "race") return false;
    for (const ex of excluded) {
      if (name.includes(ex)) return false;
    }
    return true;
  });
  if (!raceSessions.length) return null;
  raceSessions.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
  return raceSessions[0]?.date_start || null;
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
  const cached = getCached("f1_schedule_v4");
  if (cached) return cached;

  const result = await safeFetch("/meetings?year=2026", { timeoutMs: 5000 });
  let data = buildSchedule(result.ok ? result.data : null);

  const rows = [
    ...(Array.isArray(data?.upcoming) ? data.upcoming : []),
    ...(Array.isArray(data?.current) ? data.current : []),
  ];
  const meetingKeys = [...new Set(rows.map((r) => r?.meeting_key).filter((k) => k != null))].slice(0, 18);

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

  setCached("f1_schedule_v4", data, CACHE_TTL.schedule);
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

  setCached("f1_session", payload, CACHE_TTL.session);
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
      const cached = getCached("f1_board_v4");
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

      setCached("f1_board_v4", body, CACHE_TTL.board);
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
