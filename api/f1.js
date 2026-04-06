import { applyCors } from "./_cors.js";

var OPENF1       = "https://api.openf1.org/v1";
var CACHE_TTL_MS = 5 * 60 * 1000;

var cache = new Map();

// ── 2026 driver grid — verified from formula1.com ────────────────────────────
// Jack Doohan replaced by Franco Colapinto mid-season at Alpine
// Sauber is now Audi
var FALLBACK_STANDINGS = [
  { position: 1,  full_name: "Kimi Antonelli",    team_name: "Mercedes",      points: 62, driver_number: 12 },
  { position: 2,  full_name: "George Russell",    team_name: "Mercedes",      points: 43, driver_number: 63 },
  { position: 3,  full_name: "Charles Leclerc",   team_name: "Ferrari",       points: 30, driver_number: 16 },
  { position: 4,  full_name: "Oscar Piastri",     team_name: "McLaren",       points: 18, driver_number: 81 },
  { position: 5,  full_name: "Lewis Hamilton",    team_name: "Ferrari",       points: 15, driver_number: 44 },
  { position: 6,  full_name: "Lando Norris",      team_name: "McLaren",       points: 12, driver_number: 4  },
  { position: 7,  full_name: "Max Verstappen",    team_name: "Red Bull",      points: 8,  driver_number: 1  },
  { position: 8,  full_name: "Carlos Sainz",      team_name: "Williams",      points: 6,  driver_number: 55 },
  { position: 9,  full_name: "Fernando Alonso",   team_name: "Aston Martin",  points: 4,  driver_number: 14 },
  { position: 10, full_name: "Isack Hadjar",      team_name: "Racing Bulls",  points: 4,  driver_number: 6  },
  { position: 11, full_name: "Alexander Albon",   team_name: "Williams",      points: 2,  driver_number: 23 },
  { position: 12, full_name: "Pierre Gasly",      team_name: "Alpine",        points: 1,  driver_number: 10 },
  { position: 13, full_name: "Franco Colapinto",  team_name: "Alpine",        points: 0,  driver_number: 43 },
  { position: 14, full_name: "Nico Hulkenberg",   team_name: "Audi",          points: 0,  driver_number: 27 },
  { position: 15, full_name: "Gabriel Bortoleto", team_name: "Audi",          points: 0,  driver_number: 5  },
  { position: 16, full_name: "Oliver Bearman",    team_name: "Haas",          points: 0,  driver_number: 87 },
  { position: 17, full_name: "Esteban Ocon",      team_name: "Haas",          points: 0,  driver_number: 31 },
  { position: 18, full_name: "Liam Lawson",       team_name: "Racing Bulls",  points: 0,  driver_number: 30 },
  { position: 19, full_name: "Lance Stroll",      team_name: "Aston Martin",  points: 0,  driver_number: 18 },
  { position: 20, full_name: "Valtteri Bottas",   team_name: "Cadillac",      points: 0,  driver_number: 77 },
];

// ── 2026 calendar — verified from formula1.com ────────────────────────────────
// R1 AUS: Russell won | R2 CHN: Antonelli won | R3 JPN: Antonelli won
// NEXT: Miami May 1-3
var FALLBACK_CALENDAR = [
  { meeting_name: "Australian Grand Prix",    location: "Melbourne",   date_start: "2026-03-06T00:00:00", date_end: "2026-03-08T23:59:00", completed: true,  winner: "Russell"   },
  { meeting_name: "Chinese Grand Prix",       location: "Shanghai",    date_start: "2026-03-13T00:00:00", date_end: "2026-03-15T23:59:00", completed: true,  winner: "Antonelli" },
  { meeting_name: "Japanese Grand Prix",      location: "Suzuka",      date_start: "2026-03-27T00:00:00", date_end: "2026-03-29T23:59:00", completed: true,  winner: "Antonelli" },
  { meeting_name: "Miami Grand Prix",         location: "Miami",       date_start: "2026-05-01T00:00:00", date_end: "2026-05-03T23:59:00", completed: false, winner: null        },
  { meeting_name: "Canadian Grand Prix",      location: "Montreal",    date_start: "2026-05-22T00:00:00", date_end: "2026-05-24T23:59:00", completed: false, winner: null        },
  { meeting_name: "Monaco Grand Prix",        location: "Monaco",      date_start: "2026-06-05T00:00:00", date_end: "2026-06-07T23:59:00", completed: false, winner: null        },
  { meeting_name: "Spanish Grand Prix",       location: "Barcelona",   date_start: "2026-06-12T00:00:00", date_end: "2026-06-14T23:59:00", completed: false, winner: null        },
  { meeting_name: "Austrian Grand Prix",      location: "Spielberg",   date_start: "2026-06-26T00:00:00", date_end: "2026-06-28T23:59:00", completed: false, winner: null        },
  { meeting_name: "British Grand Prix",       location: "Silverstone", date_start: "2026-07-03T00:00:00", date_end: "2026-07-05T23:59:00", completed: false, winner: null        },
  { meeting_name: "Belgian Grand Prix",       location: "Spa",         date_start: "2026-07-17T00:00:00", date_end: "2026-07-19T23:59:00", completed: false, winner: null        },
  { meeting_name: "Hungarian Grand Prix",     location: "Budapest",    date_start: "2026-07-24T00:00:00", date_end: "2026-07-26T23:59:00", completed: false, winner: null        },
  { meeting_name: "Dutch Grand Prix",         location: "Zandvoort",   date_start: "2026-08-21T00:00:00", date_end: "2026-08-23T23:59:00", completed: false, winner: null        },
  { meeting_name: "Italian Grand Prix",       location: "Monza",       date_start: "2026-09-04T00:00:00", date_end: "2026-09-06T23:59:00", completed: false, winner: null        },
  { meeting_name: "Spanish Grand Prix (2)",   location: "Madrid",      date_start: "2026-09-11T00:00:00", date_end: "2026-09-13T23:59:00", completed: false, winner: null        },
  { meeting_name: "Azerbaijan Grand Prix",    location: "Baku",        date_start: "2026-09-24T00:00:00", date_end: "2026-09-26T23:59:00", completed: false, winner: null        },
  { meeting_name: "Singapore Grand Prix",     location: "Singapore",   date_start: "2026-10-09T00:00:00", date_end: "2026-10-11T23:59:00", completed: false, winner: null        },
  { meeting_name: "United States Grand Prix", location: "Austin",      date_start: "2026-10-23T00:00:00", date_end: "2026-10-25T23:59:00", completed: false, winner: null        },
  { meeting_name: "Mexico City Grand Prix",   location: "Mexico City", date_start: "2026-10-30T00:00:00", date_end: "2026-11-01T23:59:00", completed: false, winner: null        },
  { meeting_name: "Sao Paulo Grand Prix",     location: "Sao Paulo",   date_start: "2026-11-06T00:00:00", date_end: "2026-11-08T23:59:00", completed: false, winner: null        },
  { meeting_name: "Las Vegas Grand Prix",     location: "Las Vegas",   date_start: "2026-11-19T00:00:00", date_end: "2026-11-21T23:59:00", completed: false, winner: null        },
  { meeting_name: "Qatar Grand Prix",         location: "Lusail",      date_start: "2026-11-27T00:00:00", date_end: "2026-11-29T23:59:00", completed: false, winner: null        },
  { meeting_name: "Abu Dhabi Grand Prix",     location: "Abu Dhabi",   date_start: "2026-12-04T00:00:00", date_end: "2026-12-06T23:59:00", completed: false, winner: null        },
];

function getCached(key) {
  var entry = cache.get(key);
  if (!entry || Date.now() > entry.expires) return null;
  return entry.payload;
}

function setCached(key, payload) {
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, payload: payload });
}

function safeFetch(path) {
  var url = path.startsWith("http") ? path : OPENF1 + path;
  var timeout = new Promise(function(resolve) {
    setTimeout(function() { resolve(null); }, 5000);
  });
  var request = fetch(url).then(function(res) {
    if (!res.ok) { console.warn("OpenF1 " + res.status + " — " + url); return null; }
    return res.json();
  }).catch(function(err) {
    console.warn("OpenF1 fetch failed:", url, "-", err.message);
    return null;
  });
  return Promise.race([request, timeout]);
}

function buildSchedule(meetings) {
  var now  = new Date();
  var list = (Array.isArray(meetings) && meetings.length > 0)
    ? meetings.slice()
    : FALLBACK_CALENDAR.slice();

  var usingFallback = !Array.isArray(meetings) || meetings.length === 0;

  list.sort(function(a, b) {
    return new Date(a.date_start).getTime() - new Date(b.date_start).getTime();
  });

  var inProgress = list.filter(function(m) {
    var s = new Date(m.date_start);
    var e = new Date(m.date_end);
    return s <= now && now <= e;
  });

  var upcoming = list.filter(function(m) {
    return new Date(m.date_start) > now && !m.completed;
  });

  var past = list.filter(function(m) {
    return new Date(m.date_end) < now || m.completed;
  });

  var nextRace = (inProgress.length > 0 ? inProgress[0] : null) ||
                 (upcoming.length   > 0 ? upcoming[0]   : null);

  var races = list.map(function(m) {
    var isNext = !!(nextRace && m.meeting_name === nextRace.meeting_name);
    return Object.assign({}, m, { is_next: isNext });
  });

  return {
    races:            races,
    upcoming:         upcoming,
    past:             past,
    current:          inProgress,
    next_meeting_key: nextRace ? (nextRace.meeting_key || null) : null,
    usingFallback:    usingFallback,
  };
}

function buildStandings(drivers) {
  if (!Array.isArray(drivers) || drivers.length === 0) {
    return FALLBACK_STANDINGS;
  }
  var byNumber = new Map();
  for (var i = 0; i < drivers.length; i++) {
    byNumber.set(drivers[i].driver_number, drivers[i]);
  }
  return FALLBACK_STANDINGS.map(function(fb) {
    var live = byNumber.get(fb.driver_number);
    return {
      position:      fb.position,
      points:        fb.points,
      driver_number: fb.driver_number,
      full_name:     (live && live.full_name)   || fb.full_name,
      team_name:     (live && live.team_name)   || fb.team_name,
      team_colour:   (live && live.team_colour) || null,
    };
  });
}

function getScheduleData() {
  var cached = getCached("schedule");
  if (cached) return Promise.resolve(cached);
  return safeFetch("/meetings?year=2026").then(function(meetings) {
    var data = buildSchedule(meetings);
    setCached("schedule", data);
    return data;
  });
}

function getDriverData() {
  var cached = getCached("drivers");
  if (cached) return Promise.resolve(cached);
  return safeFetch("/drivers?session_key=latest").then(function(drivers) {
    var standings = buildStandings(drivers);
    var data = { standings: standings, drivers_raw: drivers || [] };
    setCached("drivers", data);
    return data;
  });
}

function getSessionData() {
  var cached = getCached("session");
  if (cached) return Promise.resolve(cached);
  return Promise.all([
    safeFetch("/sessions?session_key=latest"),
    safeFetch("/sessions?meeting_key=latest"),
  ]).then(function(results) {
    var sessionRaw         = results[0];
    var meetingSessionsRaw = results[1];
    var session  = Array.isArray(sessionRaw) ? sessionRaw[0] : (sessionRaw || null);
    var sessions = Array.isArray(meetingSessionsRaw)
      ? meetingSessionsRaw.slice().sort(function(a, b) {
          return new Date(a.date_start).getTime() - new Date(b.date_start).getTime();
        })
      : [];
    var data = { session: session || null, sessions: sessions };
    setCached("session", data);
    return data;
  });
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  var view = String(req.query.view || "board").toLowerCase();

  try {
    if (view === "schedule") {
      var schedule = await getScheduleData();
      return res.status(200).json(schedule);
    }
    if (view === "standings") {
      var driverResult = await getDriverData();
      return res.status(200).json({ standings: driverResult.standings });
    }
    if (view === "session") {
      var sessionPayload = await getSessionData();
      return res.status(200).json(sessionPayload);
    }
    if (view === "board") {
      var cached = getCached("board");
      if (cached) return res.status(200).json(cached);

      var results = await Promise.all([
        getScheduleData(),
        getDriverData(),
        getSessionData(),
      ]);

      var body = {
        schedule:      results[0],
        standings:     results[1].standings,
        session:       results[2].session,
        sessions:      results[2].sessions,
        usingFallback: results[0].usingFallback || false,
      };

      setCached("board", body);
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      return res.status(200).json(body);
    }

    return res.status(400).json({ error: "Invalid view", allowed: ["board","schedule","standings","session"] });

  } catch (err) {
    console.error("F1 handler error:", err);
    var now      = new Date();
    var upcoming = FALLBACK_CALENDAR.filter(function(m) { return new Date(m.date_start) > now && !m.completed; });
    var past     = FALLBACK_CALENDAR.filter(function(m) { return new Date(m.date_end) < now || m.completed; });
    var current  = FALLBACK_CALENDAR.filter(function(m) {
      var s = new Date(m.date_start); var e = new Date(m.date_end);
      return s <= now && now <= e;
    });
    return res.status(200).json({
      schedule:  { races: FALLBACK_CALENDAR, upcoming: upcoming, past: past, current: current, usingFallback: true },
      standings: FALLBACK_STANDINGS,
      session:   null, sessions: [], usingFallback: true,
    });
  }
}
