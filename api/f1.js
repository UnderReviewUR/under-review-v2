import { applyCors } from "./_cors.js";
import { extractGrandPrixRaceStartFromSessions } from "../shared/f1RaceStart.js";

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
  const cached = getCached("f1_schedule_v4");
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
    qualifyingGrid: null,
    qualifyingNote: QUALIFYING_NOT_DONE_NOTE,
    raceHistoryFeedNote: DRIVER_RACE_HISTORY_FEED_NOTE,
    standingsFallbackFeedNote: STANDINGS_FALLBACK_FEED_NOTE,
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
      const cached = getCached("f1_board_v5");
      if (cached) {
        res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
        return res.status(200).json(cached);
      }

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

      const body = {
        schedule,
        standings: driverResult.standings,
        session: sessionPayload.session,
        sessions: sessionPayload.sessions,
        usingFallback,
        qualifyingGrid: qualPayload.qualifyingGrid,
        qualifyingNote: qualPayload.qualifyingNote,
        raceHistoryFeedNote: DRIVER_RACE_HISTORY_FEED_NOTE,
        standingsFallbackFeedNote: usingFallback ? STANDINGS_FALLBACK_FEED_NOTE : null,
      };

      setCached("f1_board_v5", body, CACHE_TTL.board);
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
