import { applyCors } from "./_cors.js";
import { getCircuitInfo } from "./f1-circuits.js";

const OPENF1 = "https://api.openf1.org/v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

/** @type {Map<string, { expires: number, payload: unknown }>} */
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

/** Fetch JSON but return a fallback value instead of throwing on any error. */
async function fetchJsonSafe(path, fallback = []) {
  try {
    return await fetchJson(path);
  } catch {
    return fallback;
  }
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
      position: c.position_current,
      points: c.points_current,
      position_start: c.position_start,
      points_start: c.points_start,
      full_name: row.full_name,
      team_name: row.team_name,
      team_colour: row.team_colour,
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

function buildSchedule(meetings) {
  const now = new Date();
  const list = Array.isArray(meetings) ? [...meetings] : [];
  list.sort(
    (a, b) =>
      new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  );

  let nextMeetingKey = null;
  const current = list.find((m) => {
    const s = new Date(m.date_start);
    const e = new Date(m.date_end);
    return s <= now && now <= e;
  });
  if (current) {
    nextMeetingKey = current.meeting_key;
  } else {
    const future = list.find((m) => new Date(m.date_start) > now);
    nextMeetingKey = future ? future.meeting_key : null;
  }

  const races = list.map((m) => ({
    ...m,
    is_next: m.meeting_key === nextMeetingKey,
  }));

  const past = races.filter((m) => new Date(m.date_end) < now);
  const upcoming = races.filter((m) => new Date(m.date_start) > now);
  const currentRaces = races.filter((m) => {
    const s = new Date(m.date_start);
    const e = new Date(m.date_end);
    return s <= now && now <= e;
  });

  return {
    races,
    upcoming,
    past,
    current: currentRaces,
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
  const session = Array.isArray(sessionLatest) ? sessionLatest[0] : sessionLatest;
  const sessions = Array.isArray(meetingSessions) ? meetingSessions : [];
  const sortedSessions = [...sessions].sort(
    (a, b) =>
      new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  );
  const drivers = await fetchJson("/drivers?session_key=latest");
  const data = {
    session: session || null,
    sessions: sortedSessions,
    drivers,
  };
  setCached("session", data);
  return data;
}

async function getConstructorStandingsData() {
  const cached = getCached("constructors");
  if (cached) return cached;
  try {
    const teams = await fetchJson("/championship_teams?session_key=latest");
    const sorted = Array.isArray(teams)
      ? [...teams].sort((a, b) => (a.position_current ?? 999) - (b.position_current ?? 999))
      : [];
    const data = { constructors: sorted };
    setCached("constructors", data);
    return data;
  } catch {
    return { constructors: [] };
  }
}

/**
 * Fetch the last N completed race sessions for the 2026 season.
 * Returns sessions sorted by date ascending.
 */
async function getPastRaceSessions(count = 5) {
  const cached = getCached(`past_races_${count}`);
  if (cached) return cached;
  try {
    const sessions = await fetchJson("/sessions?year=2026&session_name=Race");
    const now = new Date();
    const past = Array.isArray(sessions)
      ? sessions
          .filter(s => s.date_end && new Date(s.date_end) < now)
          .sort((a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime())
          .slice(0, count)
      : [];
    setCached(`past_races_${count}`, past);
    return past;
  } catch {
    return [];
  }
}

/**
 * Fetch final positions for all drivers in a given race session.
 * Returns { driver_number -> { position, driver_number } }
 */
async function getRacePositions(sessionKey) {
  if (!sessionKey) return {};
  try {
    const positions = await fetchJson(`/position?session_key=${sessionKey}`);
    if (!Array.isArray(positions) || !positions.length) return {};
    // Group by driver_number and take the last recorded position entry
    const byDriver = new Map();
    for (const p of positions) {
      const dn = p.driver_number;
      if (!byDriver.has(dn) || new Date(p.date) > new Date(byDriver.get(dn).date)) {
        byDriver.set(dn, p);
      }
    }
    const result = {};
    for (const [dn, p] of byDriver) {
      result[dn] = { position: p.position, driver_number: dn };
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Fetch fastest lap per driver for a given session from lap data.
 * Returns { driver_number -> { fastest_lap_ms, fastest_lap_str } }
 */
async function getSessionFastestLaps(sessionKey) {
  if (!sessionKey) return {};
  try {
    const laps = await fetchJson(`/laps?session_key=${sessionKey}`);
    if (!Array.isArray(laps) || !laps.length) return {};
    const byDriver = new Map();
    for (const lap of laps) {
      const dn = lap.driver_number;
      const lapSec = lap.lap_duration; // seconds (float) in OpenF1
      if (lapSec == null) continue;
      if (!byDriver.has(dn) || lapSec < byDriver.get(dn).fastest_lap_s) {
        byDriver.set(dn, { fastest_lap_s: lapSec, driver_number: dn });
      }
    }
    const result = {};
    for (const [dn, d] of byDriver) {
      const s = d.fastest_lap_s;
      const mins = Math.floor(s / 60);
      const secs = (s % 60).toFixed(3).padStart(6, "0");
      result[dn] = { fastest_lap_s: s, fastest_lap_str: `${mins}:${secs}` };
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Fetch pit stop data for a given session.
 * Returns { driver_number -> { pit_count, avg_pit_duration_s } }
 */
async function getSessionPitStops(sessionKey) {
  if (!sessionKey) return {};
  try {
    const pits = await fetchJson(`/pit?session_key=${sessionKey}`);
    if (!Array.isArray(pits) || !pits.length) return {};
    const byDriver = new Map();
    for (const p of pits) {
      const dn = p.driver_number;
      if (!byDriver.has(dn)) byDriver.set(dn, { count: 0, total_s: 0 });
      const entry = byDriver.get(dn);
      entry.count += 1;
      if (p.pit_duration != null) entry.total_s += p.pit_duration;
    }
    const result = {};
    for (const [dn, d] of byDriver) {
      result[dn] = {
        pit_count: d.count,
        avg_pit_duration_s: d.count > 0 ? Math.round((d.total_s / d.count) * 10) / 10 : null,
      };
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Fetch qualifying session positions (Q3 result, or best available).
 * Returns { driver_number -> { position, q3_time_str } }
 */
async function getQualifyingPositions(meetingKey) {
  if (!meetingKey) return {};
  try {
    // Get all sessions for the meeting and find the latest qualifying session
    const sessions = await fetchJson(`/sessions?meeting_key=${meetingKey}`);
    const qualiSessions = Array.isArray(sessions)
      ? sessions
          .filter(s => {
            const name = String(s.session_name || s.session_type || "").toLowerCase();
            return name.includes("qualif") || name === "q" || name === "q3";
          })
          .sort((a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime())
      : [];
    if (!qualiSessions.length) return {};
    const qualiSessionKey = qualiSessions[0].session_key;

    // Get positions from qualifying session
    const positions = await getRacePositions(qualiSessionKey);

    // Also get fastest laps for time reference
    const fastestLaps = await getSessionFastestLaps(qualiSessionKey);

    const result = {};
    for (const [dn, pos] of Object.entries(positions)) {
      result[dn] = {
        grid_position: pos.position,
        q_best_lap_str: fastestLaps[dn]?.fastest_lap_str || null,
      };
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Build driver form across the last N races.
 * Returns array of { driver_number, full_name, team_name, form: [{race, position, dnf}] }
 */
async function getDriverFormData() {
  const cached = getCached("driver_form");
  if (cached) return cached;
  try {
    const [pastRaces, standingsFull] = await Promise.all([
      getPastRaceSessions(3),
      getStandingsData(),
    ]);

    if (!pastRaces.length) {
      const data = { driverForm: [], pastRaces: [] };
      setCached("driver_form", data);
      return data;
    }

    // Fetch positions for all past races in parallel
    const positionsBySession = await Promise.all(
      pastRaces.map(s => getRacePositions(s.session_key))
    );

    // Build form table per driver
    const driverMap = new Map();
    for (const d of standingsFull.standings || []) {
      driverMap.set(d.driver_number, {
        driver_number: d.driver_number,
        full_name: d.full_name || d.name_acronym || `#${d.driver_number}`,
        team_name: d.team_name || "",
        team_colour: d.team_colour || "",
        position: d.position,
        points: d.points,
        form: [],
        dnf_count: 0,
        podium_count: 0,
        win_count: 0,
        avg_finish: null,
      });
    }

    // Accumulate form for each driver across past races
    for (let i = 0; i < pastRaces.length; i++) {
      const session = pastRaces[i];
      const positions = positionsBySession[i];
      const raceName = session.meeting_name || session.location || `Race ${i + 1}`;
      const raceDate = session.date_start
        ? new Date(session.date_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "";

      for (const [dn, posData] of Object.entries(positions)) {
        const dnNum = Number(dn);
        if (!driverMap.has(dnNum)) {
          driverMap.set(dnNum, {
            driver_number: dnNum,
            full_name: `#${dnNum}`,
            team_name: "",
            team_colour: "",
            position: null,
            points: 0,
            form: [],
            dnf_count: 0,
            podium_count: 0,
            win_count: 0,
            avg_finish: null,
          });
        }
        const driver = driverMap.get(dnNum);
        // Position > 20 typically indicates DNF/DSQ in OpenF1 data
        const isDnf = posData.position == null || posData.position > 20;
        const pos = isDnf ? null : posData.position;
        driver.form.push({ race: raceName, date: raceDate, position: pos, dnf: isDnf });
        if (isDnf) driver.dnf_count += 1;
        if (pos === 1) driver.win_count += 1;
        if (pos != null && pos <= 3) driver.podium_count += 1;
      }
    }

    // Compute avg finish and form string
    for (const driver of driverMap.values()) {
      const finishes = driver.form.filter(f => f.position != null).map(f => f.position);
      driver.avg_finish = finishes.length
        ? Math.round((finishes.reduce((a, b) => a + b, 0) / finishes.length) * 10) / 10
        : null;
      driver.form_str = driver.form.map(f => {
        if (f.dnf) return "DNF";
        if (f.position === 1) return "W";
        if (f.position <= 3) return `P${f.position}`;
        return `P${f.position}`;
      }).join(" / ");
    }

    const driverForm = Array.from(driverMap.values())
      .filter(d => d.form.length > 0)
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

    const data = { driverForm, pastRaces: pastRaces.map(s => ({ meeting_name: s.meeting_name, date_start: s.date_start, session_key: s.session_key })) };
    setCached("driver_form", data);
    return data;
  } catch {
    return { driverForm: [], pastRaces: [] };
  }
}

/**
 * Fetch the latest race results with positions, fastest lap, and pit data.
 */
async function getLatestRaceResults() {
  const cached = getCached("race_results");
  if (cached) return cached;
  try {
    const pastRaces = await getPastRaceSessions(1);
    if (!pastRaces.length) {
      const data = { raceResults: [], raceName: null };
      setCached("race_results", data);
      return data;
    }

    const latestRace = pastRaces[0];
    const sessionKey = latestRace.session_key;

    const [positions, fastestLaps, pitStops, drivers] = await Promise.all([
      getRacePositions(sessionKey),
      getSessionFastestLaps(sessionKey),
      getSessionPitStops(sessionKey),
      fetchJsonSafe(`/drivers?session_key=${sessionKey}`, []),
    ]);

    const driverInfo = new Map();
    for (const d of Array.isArray(drivers) ? drivers : []) {
      driverInfo.set(d.driver_number, d);
    }

    // Find fastest lap overall
    let fastestDriverDn = null;
    let fastestTime = Infinity;
    for (const [dn, fl] of Object.entries(fastestLaps)) {
      if (fl.fastest_lap_s < fastestTime) {
        fastestTime = fl.fastest_lap_s;
        fastestDriverDn = Number(dn);
      }
    }

    // Build sorted results
    const results = Object.entries(positions)
      .map(([dn, pos]) => {
        const dnNum = Number(dn);
        const info = driverInfo.get(dnNum) || {};
        const fl = fastestLaps[dnNum];
        const pit = pitStops[dnNum];
        const isDnf = pos.position == null || pos.position > 20;
        return {
          driver_number: dnNum,
          full_name: info.full_name || info.name_acronym || `#${dnNum}`,
          team_name: info.team_name || "",
          team_colour: info.team_colour || "",
          position: isDnf ? null : pos.position,
          dnf: isDnf,
          fastest_lap_str: fl?.fastest_lap_str || null,
          fastest_lap_s: fl?.fastest_lap_s || null,
          has_fastest_lap: dnNum === fastestDriverDn,
          pit_count: pit?.pit_count ?? null,
          avg_pit_s: pit?.avg_pit_duration_s ?? null,
        };
      })
      .sort((a, b) => {
        if (a.position == null && b.position == null) return 0;
        if (a.position == null) return 1;
        if (b.position == null) return -1;
        return a.position - b.position;
      });

    const data = {
      raceResults: results,
      raceName: latestRace.meeting_name || latestRace.location || "",
      raceDate: latestRace.date_start || "",
      sessionKey,
    };
    setCached("race_results", data);
    return data;
  } catch {
    return { raceResults: [], raceName: null };
  }
}

/**
 * Get qualifying grid positions for the most recent (or upcoming) meeting.
 */
async function getLatestQualifyingData() {
  const cached = getCached("qualifying");
  if (cached) return cached;
  try {
    // Try latest meeting key
    const sessions = await fetchJson("/sessions?meeting_key=latest");
    const sessionArr = Array.isArray(sessions) ? sessions : [];
    const meetingKey = sessionArr[0]?.meeting_key;

    if (!meetingKey) {
      const data = { gridPositions: {}, meetingName: null };
      setCached("qualifying", data);
      return data;
    }

    const meetingName = sessionArr[0]?.meeting_name || sessionArr[0]?.location || "";
    const gridPositions = await getQualifyingPositions(meetingKey);

    // Also get driver info for names
    const drivers = await fetchJson(`/drivers?session_key=latest`);
    const driverInfo = new Map();
    for (const d of Array.isArray(drivers) ? drivers : []) {
      driverInfo.set(d.driver_number, d);
    }

    const enrichedGrid = {};
    for (const [dn, g] of Object.entries(gridPositions)) {
      const dnNum = Number(dn);
      const info = driverInfo.get(dnNum) || {};
      enrichedGrid[dnNum] = {
        ...g,
        full_name: info.full_name || info.name_acronym || `#${dnNum}`,
        team_name: info.team_name || "",
        team_colour: info.team_colour || "",
      };
    }

    const data = { gridPositions: enrichedGrid, meetingName };
    setCached("qualifying", data);
    return data;
  } catch {
    return { gridPositions: {}, meetingName: null };
  }
}

/**
 * Get circuit info for the next race meeting.
 */
async function getNextRaceCircuitData() {
  const cached = getCached("next_circuit");
  if (cached) return cached;
  try {
    const { races } = await getScheduleData();
    const nextRace = races.find(r => r.is_next);
    if (!nextRace) {
      setCached("next_circuit", null);
      return null;
    }
    const circuit = getCircuitInfo(nextRace.circuit_short_name, nextRace.location);
    const data = circuit ? { ...circuit, meeting_name: nextRace.meeting_name, circuit_short_name: nextRace.circuit_short_name } : null;
    setCached("next_circuit", data);
    return data;
  } catch {
    return null;
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
      const { standings } = await getStandingsData();
      return res.status(200).json({ standings });
    }

    if (view === "session") {
      const sessionPayload = await getSessionData();
      return res.status(200).json(sessionPayload);
    }

    if (view === "constructors") {
      const data = await getConstructorStandingsData();
      return res.status(200).json(data);
    }

    if (view === "driverform") {
      const data = await getDriverFormData();
      return res.status(200).json(data);
    }

    if (view === "raceresults") {
      const data = await getLatestRaceResults();
      return res.status(200).json(data);
    }

    if (view === "qualifying") {
      const data = await getLatestQualifyingData();
      return res.status(200).json(data);
    }

    if (view === "circuit") {
      const data = await getNextRaceCircuitData();
      return res.status(200).json(data || { error: "No circuit data found" });
    }

    if (view === "board") {
      const cached = getCached("board");
      if (cached) return res.status(200).json(cached);

      // Use Promise.allSettled so individual OpenF1 failures don't crash the whole response.
      // Core data (schedule, standings, session) are required; enhanced data gracefully degrades.
      const [
        scheduleResult,
        standingsResult,
        sessionResult,
        constructorsResult,
        driverFormResult,
        raceResultsResult,
        nextCircuitResult,
      ] = await Promise.allSettled([
        getScheduleData(),
        getStandingsData(),
        getSessionData(),
        getConstructorStandingsData(),
        getDriverFormData(),
        getLatestRaceResults(),
        getNextRaceCircuitData(),
      ]);

      // Core data — throw if unavailable (caller gets a 500 for true failures)
      if (scheduleResult.status === "rejected") throw scheduleResult.reason;
      if (standingsResult.status === "rejected") throw standingsResult.reason;
      if (sessionResult.status === "rejected") throw sessionResult.reason;

      const scheduleFull = scheduleResult.value;
      const { standings } = standingsResult.value;
      const { session, drivers } = sessionResult.value;

      // Enhanced data — fall back to empty values on failure
      const { constructors = [] } = constructorsResult.status === "fulfilled" ? constructorsResult.value : {};
      const { driverForm = [], pastRaces = [] } = driverFormResult.status === "fulfilled" ? driverFormResult.value : {};
      const { raceResults = [], raceName: lastRaceName = null } = raceResultsResult.status === "fulfilled" ? raceResultsResult.value : {};
      const nextCircuit = nextCircuitResult.status === "fulfilled" ? nextCircuitResult.value : null;

      // Merge form data into standings for easy UI consumption
      const formByDriverNumber = new Map();
      for (const d of driverForm) {
        formByDriverNumber.set(d.driver_number, d);
      }
      const standingsWithForm = standings.map(d => {
        const form = formByDriverNumber.get(d.driver_number);
        return form
          ? { ...d, form: form.form, form_str: form.form_str, dnf_count: form.dnf_count, podium_count: form.podium_count, win_count: form.win_count, avg_finish: form.avg_finish }
          : d;
      });

      const body = {
        schedule: scheduleFull,
        standings: standingsWithForm,
        session,
        drivers,
        constructors,
        driverForm,
        pastRaces,
        lastRaceResults: raceResults,
        lastRaceName,
        nextCircuit,
      };
      setCached("board", body);
      return res.status(200).json(body);
    }

    return res.status(400).json({
      error: "Invalid view",
      allowed: ["board", "schedule", "standings", "session", "constructors", "driverform", "raceresults", "qualifying", "circuit"],
    });
  } catch (err) {
    console.error("F1 OpenF1 proxy error:", err);
    return res.status(500).json({
      error: "Failed to fetch F1 data",
      details: err.message,
    });
  }
}
