import { bdlFetch } from "./_balldontlie.js";
import { etDateStringToEspnYmd, getTodayEtDateString } from "./_espnEtDates.js";

const CACHE_TTL_MS = 3 * 60 * 1000;
const cache = new Map();

function logOddsUnavailable(status, scope) {
  console.warn(
    `[odds] unavailable — running without lines (${scope}${Number.isFinite(status) ? ` status=${status}` : ""})`,
  );
}

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

const BDL_TOURNAMENT_ALIASES = [
  {
    match: "cadillac championship",
    canonicalName: "RBC Heritage",
    canonicalShortName: "RBC Heritage",
    canonicalCourseName: "Harbour Town Golf Links",
    canonicalCity: "Hilton Head Island",
    canonicalState: "South Carolina",
    canonicalCountry: "United States of America",
  },
];

function getBdlTournamentAlias(rawName) {
  const n = slugify(rawName || "");
  return BDL_TOURNAMENT_ALIASES.find((a) => n.includes(a.match)) || null;
}

function parseMonthDayWithSeason(text, season) {
  if (!text) return null;
  const parsed = Date.parse(`${text} ${season}`);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function parseBdlStartTs(value, season) {
  const parsed = Date.parse(value || "");
  if (!Number.isNaN(parsed)) {
    const year = new Date(parsed).getUTCFullYear();
    if (year >= season - 1 && year <= season + 1) return parsed;
  }

  const raw = String(value || "");
  const match = raw.match(/([A-Za-z]{3,9}\s+\d{1,2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const fallback = parseMonthDayWithSeason(match[1], season);
  return fallback == null ? Number.MAX_SAFE_INTEGER : fallback;
}

function parseBdlEndTs(value, season, startTs) {
  const parsed = Date.parse(value || "");
  if (!Number.isNaN(parsed)) {
    const year = new Date(parsed).getUTCFullYear();
    if (year >= season - 1 && year <= season + 1 && parsed >= startTs) return parsed;
  }

  const raw = String(value || "");
  const all = [...raw.matchAll(/([A-Za-z]{3,9}\s+\d{1,2})/g)].map((m) => m[1]);
  const endText = all.length > 1 ? all[1] : all[0];
  const fallback = parseMonthDayWithSeason(endText, season);
  if (fallback != null && fallback >= startTs) return fallback;

  // PGA events are typically 4 rounds over 4 days.
  return startTs + 4 * 24 * 60 * 60 * 1000;
}

/** RBC Heritage / Harbour Town — primary field event; never treat Zurich team week as this. */
function eventNameMatchesRbcHeritage(name, shortName) {
  const n = slugify(`${name || ""} ${shortName || ""}`);
  if (n.includes("zurich")) return false;
  if (n.includes("canadian")) return false;
  return (
    n.includes("heritage") ||
    n.includes("harbour town") ||
    n.includes("hilton head") ||
    n.includes("sea pines") ||
    (n.includes("rbc") &&
      (n.includes("heritage") || n.includes("hilton") || n.includes("harbour")))
  );
}

function eventNameLooksZurichOrTeamFormat(name, shortName) {
  const n = slugify(`${name || ""} ${shortName || ""}`);
  if (n.includes("zurich")) return true;
  if (n.includes("new orleans") && n.includes("classic")) return true;
  if (n.includes("two man") || n.includes("two-man")) return true;
  return false;
}

/** Prefer flagship / full-field events when ESPN returns multiple tournaments (e.g. RBC vs Zurich). */
function scorePgaEspnEvent(e) {
  const state = e?.status?.type?.state;
  let score = 0;
  if (state === "in") score += 4000;
  else if (state === "pre") score += 2000;
  else score += 0;

  const n = slugify(e?.name || e?.shortName || "");
  if (n.includes("zurich")) score -= 2500;
  if (n.includes("new orleans")) score -= 800;
  if (n.includes("two man") || n.includes("two-man") || n.includes("team")) score -= 500;

  if (eventNameMatchesRbcHeritage(e?.name, e?.shortName)) score += 3500;
  else if (n.includes("heritage") || n.includes("hilton head") || n.includes("harbour town"))
    score += 800;
  if (n.includes("invitational")) score += 250;
  if (n.includes("memorial")) score += 400;
  if (n.includes("players championship") || n.includes("the players")) score += 400;

  const compCount = e?.competitions?.[0]?.competitors?.length || 0;
  if (compCount > 0) score += Math.min(compCount, 220);

  return score;
}

function isMeaningfulEspnCompetitor(c) {
  const position = String(c?.status?.position?.displayText || "").trim();
  const score = String(c?.score?.displayValue || "").trim();
  const today = String(c?.status?.today?.displayValue || "").trim();
  const thru = String(c?.status?.thru || "").trim();

  if (position && position !== "-" && position !== "--") return true;
  if (thru && thru !== "-" && thru !== "--") return true;
  if (today && today !== "-" && today !== "--") return true;
  if (score && score !== "-" && score !== "--" && score.toUpperCase() !== "E") return true;
  return false;
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
      error: "Something went wrong. Please try again.",
    };
  }
}

async function safeFetchText(url, options = {}) {
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
        text: "",
        error: body || `HTTP ${res.status}`,
      };
    }

    const text = await res.text();
    return {
      ok: true,
      status: res.status,
      text,
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      text: "",
      error: "Something went wrong. Please try again.",
    };
  }
}

async function safeBdlFetch(path, params = {}) {
  return bdlFetch(`/pga/v1${path}`, params);
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
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

  const alias = getBdlTournamentAlias(tournament.name);
  const primaryCourse =
    Array.isArray(tournament.courses) && tournament.courses.length > 0
      ? tournament.courses[0]?.course || null
      : null;

  const city = alias?.canonicalCity || tournament.city || "";
  const state = alias?.canonicalState || tournament.state || "";
  const country = alias?.canonicalCountry || tournament.country || "";
  const name = alias?.canonicalName || tournament.name || "PGA Tour Event";
  const shortName =
    alias?.canonicalShortName || tournament.short_name || tournament.name || "PGA Tour Event";
  const courseName =
    alias?.canonicalCourseName || tournament.course_name || primaryCourse?.name || null;
  const seasonGuess = Number(tournament.season || new Date().getFullYear());
  const startTs = parseBdlStartTs(tournament.start_date, seasonGuess);
  const endTs = parseBdlEndTs(tournament.end_date, seasonGuess, startTs);

  return {
    id: tournament.id || null,
    season: tournament.season || null,
    name,
    shortName,
    startDate: tournament.start_date || null,
    endDate: tournament.end_date || null,
    displayDate: formatDateRange(tournament.start_date, tournament.end_date),
    city,
    state,
    country,
    location: [city, state || country]
      .filter(Boolean)
      .join(", "),
    purse: tournament.purse || null,
    status: cleanTournamentStatus(tournament.status),
    rawStatus: tournament.status || null,
    courseName,
    courseId: primaryCourse?.id || null,
    champion: tournament.champion?.display_name || null,
    aliasApplied: alias?.canonicalName || null,
    startTs: Number.isFinite(startTs) ? startTs : null,
    endTs: Number.isFinite(endTs) ? endTs : null,
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

function buildBdlLeaderboard(results) {
  if (!Array.isArray(results) || results.length === 0) return [];

  return results
    .map((row, idx) => {
      const rawPos = String(row?.position || "").trim();
      const position = rawPos || String(idx + 1);
      const rawScore = row?.score;
      let score = "E";
      if (rawScore != null && rawScore !== "") {
        const n = Number(rawScore);
        if (!Number.isNaN(n)) {
          score = n === 0 ? "E" : n > 0 ? `+${n}` : `${n}`;
        } else {
          score = String(rawScore);
        }
      }

      return {
        position,
        name: row?.player || "",
        country: row?.country || "",
        score,
        today: "—",
        thru: "—",
        round1: "—",
        round2: "—",
        round3: "—",
        round4: "—",
      };
    })
    .filter((r) => r.name);
}

function hasMeaningfulLeaderboardRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  return rows.some((r) => {
    const pos = String(r?.position || "").trim();
    const score = String(r?.score || "").trim().toUpperCase();
    const thru = String(r?.thru || "").trim();
    return (
      (pos && pos !== "-" && pos !== "--") ||
      (thru && thru !== "-" && thru !== "--") ||
      (score && score !== "-" && score !== "--")
    );
  });
}

/** Past finished events stay in ESPN lists; suppress pseudo-current boards after this grace past inferred end. */
const GOLF_SCHEDULE_END_GRACE_MS = 48 * 60 * 60 * 1000;

function parseScheduleMs(value) {
  if (!value) return NaN;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? NaN : ms;
}

function inferPgaTourEndMsFromStart(startMs) {
  if (!Number.isFinite(startMs)) return NaN;
  // PGA events are generally Thu-Sun (4 days). Keep stale suppression aligned to that window.
  return startMs + 4 * 24 * 60 * 60 * 1000;
}

/** True when tournament row from BDL is clearly over (outside active scoring window). */
function isBdlTournamentScheduleStale(normalizedTournament, nowMs = Date.now()) {
  if (!normalizedTournament) return false;
  const startMs =
    Number.isFinite(normalizedTournament.startTs) && normalizedTournament.startTs > 0
      ? normalizedTournament.startTs
      : parseScheduleMs(normalizedTournament.startDate);
  let endMs =
    Number.isFinite(normalizedTournament.endTs) && normalizedTournament.endTs > 0
      ? normalizedTournament.endTs
      : parseScheduleMs(normalizedTournament.endDate);
  if (!Number.isFinite(endMs) && Number.isFinite(startMs)) {
    endMs = inferPgaTourEndMsFromStart(startMs);
  }
  if (Number.isFinite(endMs) && nowMs > endMs + GOLF_SCHEDULE_END_GRACE_MS) return true;
  const status = String(normalizedTournament.status || "").toLowerCase();
  if (
    status.includes("final") &&
    Number.isFinite(startMs) &&
    nowMs > startMs + 8 * 24 * 60 * 60 * 1000
  ) {
    return true;
  }
  return false;
}

/**
 * Suppress merged currentEvent when ESPN/merge points at a finished week (stale scoreboard fallback).
 */
function shouldSuppressStaleMergedEvent({
  espnEvent,
  tournament,
  mergedCurrentEvent,
  espnLooksFinished,
}) {
  const nowMs = Date.now();
  const tournamentStartMs =
    Number.isFinite(tournament?.startTs) && tournament.startTs > 0
      ? tournament.startTs
      : parseScheduleMs(tournament?.startDate);
  const tournamentEndMs =
    Number.isFinite(tournament?.endTs) && tournament.endTs > 0
      ? tournament.endTs
      : parseScheduleMs(tournament?.endDate);
  const startMs =
    parseScheduleMs(mergedCurrentEvent?.startDate) ||
    tournamentStartMs ||
    parseScheduleMs(espnEvent?.startDate) ||
    NaN;
  let endMs =
    parseScheduleMs(mergedCurrentEvent?.endDate) || tournamentEndMs;
  if (!Number.isFinite(endMs) && Number.isFinite(startMs)) {
    endMs = inferPgaTourEndMsFromStart(startMs);
  }
  if (Number.isFinite(endMs) && nowMs > endMs + GOLF_SCHEDULE_END_GRACE_MS) {
    return true;
  }

  const mergedState = String(mergedCurrentEvent?.state || "").toLowerCase();
  const espnState = String(espnEvent?.state || "").toLowerCase();
  const looksFinished =
    espnLooksFinished ||
    mergedState === "post" ||
    mergedState === "final" ||
    espnState === "post" ||
    espnState === "final";

  if (
    looksFinished &&
    Number.isFinite(startMs) &&
    nowMs > startMs + 7 * 24 * 60 * 60 * 1000
  ) {
    return true;
  }

  return false;
}

/** ESPN fallback can return last week's event as events[0]; skip those for current-event picks. */
function espnScoreboardEventLooksStale(event) {
  if (!event) return true;
  const st = event?.status?.type?.state;
  const dateStr = event?.date || event?.end?.date || null;
  const startMs = parseScheduleMs(dateStr);
  const endMs = inferPgaTourEndMsFromStart(startMs);
  const nowMs = Date.now();
  if (Number.isFinite(endMs) && nowMs > endMs + GOLF_SCHEDULE_END_GRACE_MS) {
    return true;
  }
  if ((st === "post" || st === "final") && Number.isFinite(endMs)) {
    return nowMs > endMs + GOLF_SCHEDULE_END_GRACE_MS;
  }
  return false;
}

function parseEspnLeaderboardFromHtml(html) {
  if (!html) return [];

  const rows = [];
  const seenNames = new Set();
  const rowMatches = html.matchAll(
    /<tr[^>]*class="[^"]*PlayerRow__Overview[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi
  );

  for (const match of rowMatches) {
    const rowHtml = match?.[1] || "";
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      stripHtml(m?.[1] || "")
    );
    if (cells.length < 7) continue;

    const nameMatch = rowHtml.match(
      /leaderboard_player_name[^>]*>([\s\S]*?)<\/a>/i
    );
    const name = stripHtml(nameMatch?.[1] || cells[3] || "");
    if (!name) continue;
    if (seenNames.has(name.toLowerCase())) continue;

    const countryMatch = rowHtml.match(/class="flag[^"]*"[^>]*alt="([^"]+)"/i);
    rows.push({
      position: cells[1] || "—",
      name,
      country: stripHtml(countryMatch?.[1] || ""),
      score: cells[4] || "E",
      today: cells[5] || "—",
      thru: cells[6] || "—",
      round1: cells[7] || "—",
      round2: cells[8] || "—",
      round3: cells[9] || "—",
      round4: cells[10] || "—",
    });
    seenNames.add(name.toLowerCase());
  }

  return rows;
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
  const cacheKey = "espn_current_event_v5";
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const golfScoreboardYmd = etDateStringToEspnYmd(getTodayEtDateString());
  const result = await safeFetchJson(
    `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?dates=${encodeURIComponent(golfScoreboardYmd)}`,
    { timeoutMs: 7000 },
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
  const validEvents = events.filter((e) => !espnScoreboardEventLooksStale(e));
  if (!validEvents.length) {
    setCache(cacheKey, null, 60 * 1000);
    return null;
  }

  const activePool = validEvents.filter((e) => {
    const st = e?.status?.type?.state;
    return st === "in" || st === "pre";
  });

  let selectedEvent = null;

  if (activePool.length > 0) {
    const sansZurich = activePool.filter(
      (e) => !eventNameLooksZurichOrTeamFormat(e?.name, e?.shortName)
    );
    const pool = sansZurich.length ? sansZurich : activePool;
    selectedEvent = [...pool].sort(
      (a, b) => scorePgaEspnEvent(b) - scorePgaEspnEvent(a)
    )[0];
  }

  if (!selectedEvent) {
    const upcomingOnly = validEvents.filter((e) => e?.status?.type?.state === "pre");
    if (upcomingOnly.length > 0) {
      const sansZurichUpcoming = upcomingOnly.filter(
        (e) => !eventNameLooksZurichOrTeamFormat(e?.name, e?.shortName)
      );
      const pool = sansZurichUpcoming.length ? sansZurichUpcoming : upcomingOnly;
      selectedEvent = [...pool].sort(
        (a, b) => scorePgaEspnEvent(b) - scorePgaEspnEvent(a)
      )[0];
    }
  }

  if (!selectedEvent) {
    const nonStaleFallback = validEvents;
    selectedEvent = nonStaleFallback[0] || null;
  }

  if (!selectedEvent) {
    setCache(cacheKey, null, 60 * 1000);
    return null;
  }

  const comp = selectedEvent?.competitions?.[0] || {};
  const venue = comp?.venue || {};
  const status = selectedEvent?.status?.type || {};
  const competitors = comp?.competitors || [];

  const hasMeaningfulApiLeaderboard = competitors.some(isMeaningfulEspnCompetitor);

  /* Full field: every competitor ESPN returns (AI + UI need players off the first page too). */
  const apiLeaderboard = competitors
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
    });

  let leaderboard = apiLeaderboard;
  let leaderboardSource = hasMeaningfulApiLeaderboard ? "espn_api" : "none";

  if (!hasMeaningfulApiLeaderboard && selectedEvent?.id) {
    const htmlRes = await safeFetchText(
      `https://www.espn.com/golf/leaderboard/_/tournamentId/${selectedEvent.id}`,
      { timeoutMs: 9000 }
    );

    if (htmlRes.ok) {
      const htmlLeaderboard = parseEspnLeaderboardFromHtml(htmlRes.text);
      if (hasMeaningfulLeaderboardRows(htmlLeaderboard)) {
        leaderboard = htmlLeaderboard;
        leaderboardSource = "espn_html";
      }
    }
  }

  const hasMeaningfulLeaderboard = hasMeaningfulLeaderboardRows(leaderboard);

  const rawState = String(status?.state || "pre").toLowerCase();
  const adjustedState = rawState === "in" && !hasMeaningfulLeaderboard ? "pre" : rawState;

  const payload = {
    id: selectedEvent?.id || null,
    name: selectedEvent?.name || selectedEvent?.shortName || "PGA Tour Event",
    shortName:
      selectedEvent?.shortName || selectedEvent?.name || "PGA Tour Event",
    course: venue?.fullName || venue?.shortName || null,
    location: [venue?.city, venue?.state || venue?.country]
      .filter(Boolean)
      .join(", "),
    round: cleanTournamentStatus(adjustedState || status?.description),
    state: adjustedState || "pre",
    par: comp?.format?.par || null,
    startDate: selectedEvent?.date || null,
    displayDate: formatDisplayDate(selectedEvent?.date),
    leaderboard,
    leaderboardSource,
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
    logOddsUnavailable(null, "golf missing key");
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
    if (!base.ok) logOddsUnavailable(base.status, "golf outrights");
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
    if (!prop.ok) {
      logOddsUnavailable(prop.status, "golf props");
    }
  }

  setCache(cacheKey, board, 2 * 60 * 1000);
  return board;
}

async function getBdlTournamentBundle() {
  const cacheKey = "bdl_tournament_bundle_v6";
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
      _startTs: parseBdlStartTs(t?.start_date, season),
      _endTs: parseBdlEndTs(
        t?.end_date,
        season,
        parseBdlStartTs(t?.start_date, season)
      ),
    }))
    .sort((a, b) => a._startTs - b._startTs);

  const inRange = normalized.filter((t) => t._startTs <= now && now <= t._endTs);
  const upcoming = normalized.filter((t) => t._startTs > now);
  const pool = inRange.length > 0 ? inRange : upcoming;

  const isTeamOrZurichWeek = (t) => {
    const n = normalizeString(t?.name || "");
    return (
      n.includes("zurich") ||
      n.includes("two-man") ||
      n.includes("two man") ||
      n.includes("team championship")
    );
  };

  const preferredFromPool = (() => {
    const rbcHeritage = pool.find((t) =>
      eventNameMatchesRbcHeritage(t?.name, t?.short_name)
    );
    if (rbcHeritage) return rbcHeritage;

    const nonTeam = pool.filter((t) => !isTeamOrZurichWeek(t));
    const ordered = [...(nonTeam.length ? nonTeam : pool)].sort(
      (a, b) => Number(b?.purse || 0) - Number(a?.purse || 0)
    );
    return ordered[0] || null;
  })();

  const picked =
    preferredFromPool ||
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
      per_page: 200,
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
    leaderboard: buildBdlLeaderboard(results),
    courseStats,
    bdlAvailable: tournamentsRes.ok,
  };

  setCache(cacheKey, bundle, 3 * 60 * 1000);
  return bundle;
}

function mergeGolfBoard({ espnEvent, bdlBundle, odds, rankings }) {
  const tournament = bdlBundle?.tournament || null;
  const course = bdlBundle?.course || null;
  const bdlLeaderboard = Array.isArray(bdlBundle?.leaderboard)
    ? bdlBundle.leaderboard
    : [];
  const bdlHasLeaderboard = hasMeaningfulLeaderboardRows(bdlLeaderboard);

  const espnHasLeaderboard =
    Array.isArray(espnEvent?.leaderboard) && espnEvent.leaderboard.length > 0;

  const espnState = String(espnEvent?.state || "").toLowerCase();
  const espnLooksFinished = espnState === "post" || espnState === "final";

  const espnSlug = slugify(espnEvent?.name);
  const tournamentSlug = slugify(tournament?.name);
  const bdlSlug = tournamentSlug;

  const sameEvent =
    tournament &&
    espnEvent &&
    (
      espnSlug.includes(tournamentSlug) ||
      tournamentSlug.includes(espnSlug)
    );

  const bdlLooksTeamOrZurich =
    bdlSlug.includes("zurich") ||
    bdlSlug.includes("two man") ||
    bdlSlug.includes("two-man") ||
    bdlSlug.includes("team championship");

  const espnIsRbcHeritage = eventNameMatchesRbcHeritage(
    espnEvent?.name,
    espnEvent?.shortName
  );
  const bdlIsRbcHeritage = tournament
    ? eventNameMatchesRbcHeritage(tournament?.name, tournament?.shortName)
    : false;

  /**
   * Finished tournaments (post/final) must still surface ESPN's final leaderboard when BDL
   * has no standings row — otherwise currentEvent.leaderboard is empty and UR Take invents dates.
   * Live events: keep alignment rules (same event / RBC vs Zurich, etc.).
   */
  const shouldUseEspnLeaderboard =
    !bdlHasLeaderboard &&
    espnHasLeaderboard &&
    (espnLooksFinished ||
      (!espnLooksFinished &&
        (sameEvent ||
          !tournament ||
          bdlLooksTeamOrZurich ||
          (espnIsRbcHeritage && !bdlIsRbcHeritage))));

  const preferEspnDisplay =
    (shouldUseEspnLeaderboard &&
      (!sameEvent || bdlLooksTeamOrZurich || (espnIsRbcHeritage && !bdlIsRbcHeritage))) ||
    (espnIsRbcHeritage && !bdlIsRbcHeritage);
  const bdlEventMismatch = preferEspnDisplay && !sameEvent;
  const oddsTopThree = Array.isArray(odds?.outrights)
    ? odds.outrights.slice(0, 3).map((o, idx) => ({
        position: String(idx + 1),
        name: o?.player || "",
        country: "",
        score: "MKT",
        today: "—",
        thru: "—",
        round1: "—",
        round2: "—",
        round3: "—",
        round4: "—",
      })).filter((r) => r.name)
    : [];
  const hasOddsProxy = oddsTopThree.length > 0;
  const useBdlLeaderboard = bdlHasLeaderboard;
  const useEspnLeaderboard = !useBdlLeaderboard && shouldUseEspnLeaderboard;
  const useOddsProxyLeaderboard = !useBdlLeaderboard && !useEspnLeaderboard && hasOddsProxy;

  const currentEvent = {
    id: preferEspnDisplay
      ? espnEvent?.id || tournament?.id || null
      : tournament?.id || espnEvent?.id || null,
    name: preferEspnDisplay
      ? espnEvent?.name || tournament?.name || "PGA Tour Event"
      : tournament?.name || espnEvent?.name || "PGA Tour Event",
    shortName: preferEspnDisplay
      ? espnEvent?.shortName || espnEvent?.name || "PGA Tour"
      : tournament?.shortName ||
        tournament?.name ||
        espnEvent?.shortName ||
        "PGA Tour",
    course: preferEspnDisplay
      ? espnEvent?.course ||
        (bdlEventMismatch ? null : tournament?.courseName || course?.name) ||
        "TBD"
      : tournament?.courseName || course?.name || espnEvent?.course || "TBD",
    location: preferEspnDisplay
      ? espnEvent?.location ||
        (bdlEventMismatch
          ? ""
          : tournament?.location ||
            [course?.city, course?.state || course?.country]
              .filter(Boolean)
              .join(", ")) ||
        ""
      : tournament?.location ||
        [course?.city, course?.state || course?.country]
          .filter(Boolean)
          .join(", ") ||
        espnEvent?.location ||
        "",
    round: useBdlLeaderboard
      ? tournament?.status || "Live"
      : useEspnLeaderboard || preferEspnDisplay
      ? espnEvent?.round || tournament?.status || "Upcoming"
      : useOddsProxyLeaderboard
      ? "Pre-Market"
      : tournament?.status || "Upcoming",
    state: useBdlLeaderboard
      ? "in"
      : useEspnLeaderboard || preferEspnDisplay
      ? espnEvent?.state || "pre"
      : useOddsProxyLeaderboard
      ? "pre"
      : tournament?.status === "Live"
      ? "in"
      : "pre",
    par: preferEspnDisplay
      ? espnEvent?.par || (bdlEventMismatch ? null : course?.par) || null
      : course?.par || espnEvent?.par || null,
    startDate: preferEspnDisplay
      ? espnEvent?.startDate || tournament?.startDate || null
      : tournament?.startDate || espnEvent?.startDate || null,
    endDate:
      (preferEspnDisplay ? (bdlEventMismatch ? null : tournament?.endDate) : tournament?.endDate) ||
      null,
    displayDate:
      (preferEspnDisplay
        ? espnEvent?.displayDate ||
          (bdlEventMismatch ? null : tournament?.displayDate)
        : tournament?.displayDate || espnEvent?.displayDate) ||
      formatDisplayDate(
        (preferEspnDisplay ? espnEvent?.startDate : tournament?.startDate) ||
          espnEvent?.startDate
      ),
    leaderboard: useBdlLeaderboard
      ? bdlLeaderboard
      : useEspnLeaderboard
      ? espnEvent?.leaderboard || []
      : useOddsProxyLeaderboard
      ? oddsTopThree
      : [],
  };

  const suppressCurrent = shouldSuppressStaleMergedEvent({
    espnEvent,
    tournament,
    mergedCurrentEvent: currentEvent,
    espnLooksFinished,
  });

  let outTournament = tournament;
  if (outTournament && isBdlTournamentScheduleStale(outTournament)) {
    outTournament = null;
  }

  const outCurrent = suppressCurrent ? null : currentEvent;

  return {
    currentEvent: outCurrent,
    leaderboard: outCurrent?.leaderboard ?? [],
    rankings: Array.isArray(rankings) ? rankings : [],
    odds: odds || {
      outrights: [],
      topFinish: {},
      makeCut: {},
      eventName: null,
      marketStatus: "hidden",
    },
    tournament: outTournament,
    course,
    recentResults: Array.isArray(bdlBundle?.results) ? bdlBundle.results : [],
    courseStats: Array.isArray(bdlBundle?.courseStats)
      ? bdlBundle.courseStats
      : [],
    sourceMeta: {
      board: useBdlLeaderboard
        ? "balldontlie_live_standings"
        : useEspnLeaderboard
        ? (sameEvent ? "bdl_espn_aligned" : "espn_leaderboard_fallback")
        : useOddsProxyLeaderboard
        ? "odds_market_fallback"
        : preferEspnDisplay
        ? "espn_event_meta_primary"
        : "balldontlie_only",
      tournament: tournament ? "balldontlie" : "none",
      course: course ? "balldontlie" : "none",
      odds: odds?.outrights?.length ? "odds_api" : "none",
      usedFallbackLeaderboard: !useBdlLeaderboard,
      bdlHadLeaderboard: bdlHasLeaderboard,
      espnHadLeaderboard: espnHasLeaderboard,
      espnLeaderboardSource: espnEvent?.leaderboardSource || "none",
      espnLooksFinished,
      fetchedAt: new Date().toISOString(),
      scheduleStaleSuppressed: suppressCurrent || undefined,
      bdlTournamentStaleDropped: tournament && !outTournament ? true : undefined,
    },
  };
}

export async function getUnifiedGolfBoard({ oddsApiKey }) {
  const cacheKey = "unified_golf_board_v11";
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
