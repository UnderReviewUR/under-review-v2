// api/_golfProviders.js

const BDL_BASE = "https://api.balldontlie.io/pga/v1";

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
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
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

async function safeBdlFetch(path, apiKey) {
  if (!apiKey) {
    return { ok: false, status: 0, data: null, error: "Missing BALLDONTLIE_API_KEY" };
  }

  return safeFetchJson(`${BDL_BASE}${path}`, {
    timeoutMs: 7000,
    headers: {
      Authorization: apiKey,
    },
  });
}

function pickPreferredTournament(tournaments) {
  if (!Array.isArray(tournaments) || tournaments.length === 0) return null;

  const now = Date.now();

  const enriched = tournaments.map((t) => {
    const startTs = t?.start_date ? new Date(t.start_date).getTime() : Number.MAX_SAFE_INTEGER;
    return { ...t, _startTs: startTs };
  });

  const inProgress = enriched
    .filter((t) => normalizeString(t.status) === "in_progress")
    .sort((a, b) => a._startTs - b._startTs);

  if (inProgress.length > 0) return inProgress[0];

  const scheduled = enriched
    .filter((t) => normalizeString(t.status) === "scheduled")
    .sort((a, b) => Math.abs(a._startTs - now) - Math.abs(b._startTs - now));

  if (scheduled.length > 0) return scheduled[0];

  return enriched.sort((a, b) => b._startTs - a._startTs)[0];
}

function normalizeBdlTournament(tournament) {
  if (!tournament) return null;

  const primaryCourse = Array.isArray(tournament.courses) && tournament.courses.length > 0
    ? tournament.courses[0]?.course || null
    : null;

  return {
    id: tournament.id || null,
    season: tournament.season || null,
    name: tournament.name || "PGA Tour Event",
    shortName: tournament.name || "PGA Tour Event",
    startDate: tournament.start_date || null,
    endDate: tournament.end_date || null,
    city: tournament.city || "",
    state: tournament.state || "",
    country: tournament.country || "",
    location: [tournament.city, tournament.state || tournament.country].filter(Boolean).join(", "),
    purse: tournament.purse || null,
    status: tournament.status || null,
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

  const liveEvent =
    events.find((e) => e?.status?.type?.state === "in") ||
    events.find((e) => e?.status?.type?.state === "pre") ||
    events[0];

  const comp = liveEvent?.competitions?.[0] || {};
  const venue = comp?.venue || {};
  const status = liveEvent?.status?.type || {};
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
    id: liveEvent?.id || null,
    name: liveEvent?.name || liveEvent?.shortName || "PGA Tour Event",
    shortName: liveEvent?.shortName || liveEvent?.name || "PGA Tour Event",
    course: venue?.fullName || venue?.shortName || null,
    location: [venue?.city, venue?.state || venue?.country].filter(Boolean).join(", "),
    round: status?.shortDetail || status?.description || "In Progress",
    state: status?.state || "pre",
    par: comp?.format?.par || null,
    startDate: liveEvent?.date || null,
    leaderboard,
    raw: liveEvent,
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

  if (!oddsApiKey) {
    const empty = { outrights: [], topFinish: {}, makeCut: {}, eventName: null };
    setCache(cacheKey, empty, 60 * 1000);
    return empty;
  }

  const board = { outrights: [], topFinish: {}, makeCut: {}, eventName: null };

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
      .sort((a, b) => Number(a.odds || 999999) - Number(b.odds || 999999));
  }

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

  setCache(cacheKey, board, 2 * 60 * 1000);
  return board;
}

async function getBdlTournamentBundle(apiKey) {
  const cacheKey = "bdl_tournament_bundle";
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const season = new Date().getFullYear();

  const [inProgressRes, scheduledRes] = await Promise.all([
    safeBdlFetch(`/tournaments?season=${season}&status=IN_PROGRESS&per_page=25`, apiKey),
    safeBdlFetch(`/tournaments?season=${season}&status=SCHEDULED&per_page=25`, apiKey),
  ]);

  const tournaments = [
    ...(inProgressRes.ok ? inProgressRes.data?.data || [] : []),
    ...(scheduledRes.ok ? scheduledRes.data?.data || [] : []),
  ];

  const picked = pickPreferredTournament(tournaments);
  if (!picked) {
    const empty = {
      tournament: null,
      course: null,
      results: [],
      courseStats: [],
      bdlAvailable: inProgressRes.ok || scheduledRes.ok,
    };
    setCache(cacheKey, empty, 60 * 1000);
    return empty;
  }

  const normalizedTournament = normalizeBdlTournament(picked);

  const courseSearchName = normalizedTournament.courseName
    ? encodeURIComponent(normalizedTournament.courseName)
    : null;

  const [courseRes, resultsRes, courseStatsRes] = await Promise.all([
    courseSearchName
      ? safeBdlFetch(`/courses?search=${courseSearchName}&per_page=5`, apiKey)
      : Promise.resolve({ ok: false, data: null }),
    safeBdlFetch(`/tournament_results?tournament_ids[]=${picked.id}&per_page=12`, apiKey),
    safeBdlFetch(`/tournament_course_stats?tournament_ids[]=${picked.id}&per_page=36`, apiKey),
  ]);

  const matchedCourse =
    (courseRes.ok ? (courseRes.data?.data || []).find((c) => slugify(c.name) === slugify(normalizedTournament.courseName)) : null) ||
    (courseRes.ok ? (courseRes.data?.data || [])[0] : null) ||
    (Array.isArray(picked.courses) && picked.courses.length > 0 ? picked.courses[0]?.course : null) ||
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
    bdlAvailable: true,
  };

  setCache(cacheKey, bundle, 3 * 60 * 1000);
  return bundle;
}

function mergeGolfBoard({ espnEvent, bdlBundle, odds, rankings }) {
  const tournament = bdlBundle?.tournament || null;
  const course = bdlBundle?.course || null;

  const currentEvent = {
    id: tournament?.id || espnEvent?.id || null,
    name: espnEvent?.name || tournament?.name || "PGA Tour Event",
    shortName: espnEvent?.shortName || tournament?.shortName || tournament?.name || "PGA Tour",
    course: espnEvent?.course || course?.name || tournament?.courseName || "TBD",
    location: espnEvent?.location || tournament?.location || [course?.city, course?.state || course?.country].filter(Boolean).join(", "),
    round: espnEvent?.round || tournament?.status || "Upcoming",
    state: espnEvent?.state || (normalizeString(tournament?.status) === "in_progress" ? "in" : "pre"),
    par: espnEvent?.par || course?.par || null,
    startDate: espnEvent?.startDate || tournament?.startDate || null,
    leaderboard: Array.isArray(espnEvent?.leaderboard) ? espnEvent.leaderboard : [],
  };

  return {
    currentEvent,
    leaderboard: currentEvent.leaderboard,
    rankings: Array.isArray(rankings) ? rankings : [],
    odds: odds || { outrights: [], topFinish: {}, makeCut: {}, eventName: null },
    tournament,
    course,
    recentResults: Array.isArray(bdlBundle?.results) ? bdlBundle.results : [],
    courseStats: Array.isArray(bdlBundle?.courseStats) ? bdlBundle.courseStats : [],
    sourceMeta: {
      board: espnEvent ? "espn" : "none",
      tournament: tournament ? "balldontlie" : "none",
      course: course ? "balldontlie" : "none",
      odds: odds?.outrights?.length ? "odds_api" : "none",
      usedFallbackLeaderboard: !!espnEvent,
      fetchedAt: new Date().toISOString(),
    },
  };
}

export async function getUnifiedGolfBoard({ ballDontLieApiKey, oddsApiKey }) {
  const cacheKey = "unified_golf_board_v1";
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const [espnEvent, rankings, odds, bdlBundle] = await Promise.all([
    getEspnCurrentEvent(),
    getEspnWorldRankings(),
    getOddsBoard(oddsApiKey),
    getBdlTournamentBundle(ballDontLieApiKey),
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
