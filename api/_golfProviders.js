import { bdlFetch } from "./_balldontlie.js";

const CACHE_TTL_MS = 3 * 60 * 1000;
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
      error: err.message || "Network error",
    };
  }
}

async function safeBdlFetch(path, params = {}) {
  return bdlFetch(`/pga/v1${path}`, params);
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

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return "TBD";
  if (startDate && !endDate) return formatDisplayDate(startDate);
  if (!startDate && endDate) return formatDisplayDate(endDate);

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "TBD";
  }

  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();

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

  const primaryCourse =
    Array.isArray(tournament.courses) && tournament.courses.length > 0
      ? tournament.courses[0]?.course || null
      : null;

  return {
    id: tournament.id || null,
    season: tournament.season || null,
    name: tournament.name || "PGA Tour Event",
    shortName: tournament.name || "PGA Tour Event",
    startDate: tournament.start_date || null,
    endDate: tournament.end_date || null,
    displayDate: formatDateRange(tournament.start_date, tournament.end_date),
    city: tournament.city || "",
    state: tournament.state || "",
    country: tournament.country || "",
    location: [tournament.city, tournament.state || tournament.country]
      .filter(Boolean)
      .join(", "),
    purse: tournament.purse || null,
    status: cleanTournamentStatus(tournament.status),
    rawStatus: tournament.status || null,
    courseName: tournament.course_name || primaryCourse?.name || null,
    courseId: primaryCourse?.id || null,
    champion: tournament.champion?.display_name || null,
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

function normalizeTournamentResultRow(row) {
  return {
    position: row?.position || null,
    playerId: row?.player?.id || null,
    player: row?.player?.display_name || "",
    country: row?.player?.country_code || row?.player?.country || "",
    score: row?.par_relative_score || null,
    earnings: row?.earnings || null,
    rounds: row?.rounds || [],
    raw: row,
  };
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

async function getEspnCurrentEvent() {
  const cacheKey = "espn_current_event";
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const result = await safeFetchJson(
    "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard",
    { timeoutMs: 7000 }
  );

  if (!result.ok) {
    setCache(cacheKey, null, 60 * 1000);
    return null;
  }

  const events = result.data?.events || [];
  if (!events.length) {
    setCache(cacheKey, null, 60 * 1000);
    return null;
  }

  const selectedEvent =
    events.find((e) => e?.status?.type?.state === "in") ||
    events.find((e) => e?.status?.type?.state === "pre") ||
    null;

  if (!selectedEvent) {
    setCache(cacheKey, null, 60 * 1000);
    return null;
  }

  const comp = selectedEvent?.competitions?.[0] || {};
  const venue = comp?.venue || {};
  const status = selectedEvent?.status?.type || {};
  const competitors = comp?.competitors || [];

  const leaderboard = competitors
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
      };
    })
    .slice(0, 30);

  const payload = {
    id: selectedEvent?.id || null,
    name: selectedEvent?.name || selectedEvent?.shortName || "PGA Tour Event",
    shortName:
      selectedEvent?.shortName || selectedEvent?.name || "PGA Tour Event",
    course: venue?.fullName || venue?.shortName || null,
    location: [venue?.city, venue?.state || venue?.country]
      .filter(Boolean)
      .join(", "),
    round: cleanTournamentStatus(status?.state || status?.description),
    state: status?.state || "pre",
    par: comp?.format?.par || null,
    startDate: selectedEvent?.date || null,
    displayDate: formatDisplayDate(selectedEvent?.date),
    leaderboard,
    raw: selectedEvent,
  };

  setCache(cacheKey, payload, 2 * 60 * 1000);
  return payload;
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

async function getOddsBoard(oddsApiKey) {
  const cacheKey = "golf_odds_board";
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const empty = {
    outrights: [],
    topFinish: {},
    makeCut: {},
    eventName: null,
    marketStatus: "hidden",
  };

  if (!oddsApiKey) {
    setCache(cacheKey, empty, 60 * 1000);
    return empty;
  }

  const board = {
    outrights: [],
    topFinish: {},
    makeCut: {},
    eventName: null,
    marketStatus: "hidden",
  };

  const base = await safeFetchJson(
    `https://api.the-odds-api.com/v4/sports/golf_pga/odds/?apiKey=${oddsApiKey}&regions=us&markets=outrights&oddsFormat=american`,
    { timeoutMs: 8000 }
  );

  if (!base.ok || !Array.isArray(base.data) || base.data.length === 0) {
    setCache(cacheKey, board, 60 * 1000);
    return board;
  }

  const event = base.data[0];
  board.eventName = event?.sport_title || null;

  const book =
    event?.bookmakers?.find((b) => b.key === "draftkings") ||
    event?.bookmakers?.find((b) => b.key === "fanduel") ||
    event?.bookmakers?.[0];

  const outrightMarket = book?.markets?.find((m) => m.key === "outrights");
  if (outrightMarket) {
    board.outrights = (outrightMarket.outcomes || [])
      .map((o) => ({
        player: o.name,
        odds: o.price,
        book: book.key,
      }))
      .filter((o) => o.player && o.odds != null)
      .sort((a, b) => Number(a.odds || 999999) - Number(b.odds || 999999));
  }

  if (board.outrights.length > 0) {
    board.marketStatus = "live";
  }

  if (event?.id) {
    const prop = await safeFetchJson(
      `https://api.the-odds-api.com/v4/sports/golf_pga/events/${event.id}/odds?apiKey=${oddsApiKey}&regions=us&markets=top_10_finish,top_20_finish,make_cut&oddsFormat=american`,
      { timeoutMs: 8000 }
    );

    if (prop.ok) {
      const propBook =
        prop.data?.bookmakers?.find((b) => b.key === "draftkings") ||
        prop.data?.bookmakers?.[0];

      if (propBook) {
        for (const market of propBook.markets || []) {
          for (const o of market.outcomes || []) {
            const key = o.description || o.name;

            if (market.key === "make_cut") {
              if (o.name === "Yes") {
                board.makeCut[key] = o.price;
              }
              continue;
            }

            if (!board.topFinish[key]) board.topFinish[key] = {};
            board.topFinish[key][market.key] = o.price;
          }
        }
      }
    }
  }

  setCache(cacheKey, board, 2 * 60 * 1000);
  return board;
}

async function getBdlTournamentBundle() {
  const cacheKey = "bdl_tournament_bundle";
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
    .map((t) => ({
      ...t,
      _startTs: t?.start_date
        ? new Date(t.start_date).getTime()
        : Number.MAX_SAFE_INTEGER,
      _endTs: t?.end_date
        ? new Date(t.end_date).getTime()
        : Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a._startTs - b._startTs);

  const picked =
    normalized.find((t) => t._startTs <= now && now <= t._endTs) ||
    normalized.find((t) => t._startTs > now) ||
    null;

  if (!picked) {
    const empty = {
      tournament: null,
      course: null,
      results: [],
      courseStats: [],
      bdlAvailable: tournamentsRes.ok,
    };
    setCache(cacheKey, empty, 60 * 1000);
    return empty;
  }

  const normalizedTournament = normalizeBdlTournament(picked);
  const courseSearchName = normalizedTournament.courseName || null;

  const [courseRes, resultsRes, courseStatsRes] = await Promise.all([
    courseSearchName
      ? safeBdlFetch("/courses", { search: courseSearchName, per_page: 5 })
      : Promise.resolve({ ok: false, data: null }),
    safeBdlFetch("/tournament_results", {
      "tournament_ids[]": picked.id,
      per_page: 12,
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
    courseStats,
    bdlAvailable: tournamentsRes.ok,
  };

  setCache(cacheKey, bundle, 3 * 60 * 1000);
  return bundle;
}

function mergeGolfBoard({ espnEvent, bdlBundle, odds, rankings }) {
  const tournament = bdlBundle?.tournament || null;
  const course = bdlBundle?.course || null;

  const espnHasLeaderboard =
    Array.isArray(espnEvent?.leaderboard) && espnEvent.leaderboard.length > 0;

  const espnState = String(espnEvent?.state || "").toLowerCase();
  const espnLooksFinished = espnState === "post" || espnState === "final";

  const espnSlug = slugify(espnEvent?.name);
  const tournamentSlug = slugify(tournament?.name);

  const sameEvent =
    tournament &&
    espnEvent &&
    (
      espnSlug.includes(tournamentSlug) ||
      tournamentSlug.includes(espnSlug)
    );

  const shouldUseEspnLeaderboard =
    sameEvent && espnHasLeaderboard && !espnLooksFinished;

  const currentEvent = {
    id: tournament?.id || espnEvent?.id || null,
    name: tournament?.name || espnEvent?.name || "PGA Tour Event",
    shortName:
      tournament?.shortName ||
      tournament?.name ||
      espnEvent?.shortName ||
      "PGA Tour",
    course: tournament?.courseName || course?.name || espnEvent?.course || "TBD",
    location:
      tournament?.location ||
      [course?.city, course?.state || course?.country]
        .filter(Boolean)
        .join(", ") ||
      espnEvent?.location ||
      "",
    round: shouldUseEspnLeaderboard
      ? espnEvent?.round || tournament?.status || "Live"
      : tournament?.status || "Upcoming",
    state: shouldUseEspnLeaderboard
      ? espnEvent?.state || "in"
      : tournament?.status === "Live"
      ? "in"
      : "pre",
    par: course?.par || espnEvent?.par || null,
    startDate: tournament?.startDate || espnEvent?.startDate || null,
    endDate: tournament?.endDate || null,
    displayDate:
      tournament?.displayDate ||
      espnEvent?.displayDate ||
      formatDisplayDate(tournament?.startDate || espnEvent?.startDate),
    leaderboard: shouldUseEspnLeaderboard ? espnEvent?.leaderboard || [] : [],
  };

  return {
    currentEvent,
    leaderboard: currentEvent.leaderboard,
    rankings: Array.isArray(rankings) ? rankings : [],
    odds: odds || {
      outrights: [],
      topFinish: {},
      makeCut: {},
      eventName: null,
      marketStatus: "hidden",
    },
    tournament,
    course,
    recentResults: Array.isArray(bdlBundle?.results) ? bdlBundle.results : [],
    courseStats: Array.isArray(bdlBundle?.courseStats)
      ? bdlBundle.courseStats
      : [],
    sourceMeta: {
      board: shouldUseEspnLeaderboard
        ? "balldontlie_event_with_espn_leaderboard"
        : "balldontlie",
      tournament: tournament ? "balldontlie" : "none",
      course: course ? "balldontlie" : "none",
      odds: odds?.outrights?.length ? "odds_api" : "none",
      usedFallbackLeaderboard: !shouldUseEspnLeaderboard,
      espnHadLeaderboard: espnHasLeaderboard,
      espnLooksFinished,
      fetchedAt: new Date().toISOString(),
    },
  };
}

export async function getUnifiedGolfBoard({ oddsApiKey }) {
  const cacheKey = "unified_golf_board_v2";
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const [espnEvent, rankings, odds, bdlBundle] = await Promise.all([
    getEspnCurrentEvent(),
    getEspnWorldRankings(),
    getOddsBoard(oddsApiKey),
    getBdlTournamentBundle(),
  ]);

  const merged = mergeGolfBoard({
    espnEvent,
    bdlBundle,
    odds,
    rankings,
  });

  setCache(cacheKey, merged, 2 * 60 * 1000);
  return merged;
}
