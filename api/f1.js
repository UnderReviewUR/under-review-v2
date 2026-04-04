import { applyCors } from "./_cors.js";

const OPENF1 = "https://api.openf1.org/v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expires) return null;
  return entry.payload;
}

function setCached(key, payload) {
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, payload });
}

async function fetchJson(path) {
  const url = path.startsWith("http") ? path : `${OPENF1}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenF1 ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function mergeDriversAndStandings(drivers, championship) {
  const byNumber = new Map();
  for (const d of drivers || []) {
    byNumber.set(d.driver_number, { ...d });
  }
  for (const c of championship || []) {
    const row = byNumber.get(c.driver_number) || { driver_number: c.driver_number };
    byNumber.set(c.driver_number, {
      ...row,
      ...c,
      position:       c.position_current,
      points:         c.points_current,
      position_start: c.position_start,
      points_start:   c.points_start,
      full_name:      row.full_name,
      team_name:      row.team_name,
      team_colour:    row.team_colour,
    });
  }
  const merged = Array.from(byNumber.values());
  merged.sort((a, b) => {
    const pa = a.position ?? a.position_current ?? 999;
    const pb = b.position ?? b.position_current ?? 999;
    return pa - pb;
  });
  return merged;
}

// FIX: renamed internal variables to avoid duplicate 'const current' in same scope
function buildSchedule(meetings) {
  const now  = new Date();
  const list = Array.isArray(meetings) ? [...meetings] : [];
  list.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());

  let nextMeetingKey = null;

  // Use 'activeRace' instead of 'current' to avoid duplicate declaration
  const activeRace = list.find((m) => {
    const s = new Date(m.date_start);
    const e = new Date(m.date_end);
    return s <= now && now <= e;
  });

  if (activeRace) {
    nextMeetingKey = activeRace.meeting_key;
  } else {
    const future = list.find((m) => new Date(m.date_start) > now);
    nextMeetingKey = future ? future.meeting_key : null;
  }

  const races = list.map((m) => ({ ...m, is_next: m.meeting_key === nextMeetingKey }));

  const past = races.filter((m) => new Date(m.date_end) < now);

  const upcoming = races.filter((m) => new Date(m.date_start) > now);

  // Use 'inProgress' instead of 'current' to avoid duplicate declaration
  const inProgress = races.filter((m) => {
    const s = new Date(m.date_start);
    const e = new Date(m.date_end);
    return s <= now && now <= e;
  });

  return {
    races,
    upcoming,
    past,
    current: inProgress,          // keep the return key as 'current' so App.jsx is unchanged
    next_meeting_key: nextMeetingKey,
  };
}

async function getScheduleData() {
  const cached = getCached("schedule");
  if (cached) return cached;
  const meetings = await fetchJson("/meetings?year=2026");
  const data = buildSchedule(meetings);
  setCached("schedule", data);
  return data;
}

async function getStandingsData() {
  const cached = getCached("standings");
  if (cached) return cached;
  const [drivers, championship] = await Promise.all([
    fetchJson("/drivers?session_key=latest"),
    fetchJson("/championship_drivers?session_key=latest"),
  ]);
  const standings = mergeDriversAndStandings(drivers, championship);
  const data = { standings, drivers_raw: drivers, championship_raw: championship };
  setCached("standings", data);
  return data;
}

async function getSessionData() {
  const cached = getCached("session");
  if (cached) return cached;
  const [sessionLatest, meetingSessions] = await Promise.all([
    fetchJson("/sessions?session_key=latest"),
    fetchJson("/sessions?meeting_key=latest"),
  ]);
  const session  = Array.isArray(sessionLatest) ? sessionLatest[0] : sessionLatest;
  const sessions = Array.isArray(meetingSessions) ? meetingSessions : [];
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  );
  const drivers = await fetchJson("/drivers?session_key=latest");
  const data = { session: session || null, sessions: sortedSessions, drivers };
  setCached("session", data);
  return data;
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
      const { standings } = await getStandingsData();
      return res.status(200).json({ standings });
    }

    if (view === "session") {
      const sessionPayload = await getSessionData();
      return res.status(200).json(sessionPayload);
    }

    if (view === "board") {
      const cached = getCached("board");
      if (cached) return res.status(200).json(cached);

      const [scheduleFull, standingsFull, sessionFull] = await Promise.all([
        getScheduleData(),
        getStandingsData(),
        getSessionData(),
      ]);

      const { standings }        = standingsFull;
      const { session, drivers } = sessionFull;

      const body = { schedule: scheduleFull, standings, session, drivers };
      setCached("board", body);
      return res.status(200).json(body);
    }

    return res.status(400).json({
      error:   "Invalid view",
      allowed: ["board", "schedule", "standings", "session"],
    });
  } catch (err) {
    console.error("F1 OpenF1 proxy error:", err);
    return res.status(500).json({ error: "Failed to fetch F1 data", details: err.message });
  }
}
