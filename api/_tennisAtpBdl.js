/**
 * BallDontLie ATP API — men's singles only (ALL-STAR+: matches, race, etc.).
 * See https://www.balldontlie.io/openapi/atp.yml
 */
import { bdlFetch } from "./_balldontlie.js";

function isFinishedBdl(match) {
  const s = String(match?.match_status || "").toLowerCase();
  return (
    s === "finished" ||
    s === "completed" ||
    s === "final" ||
    s === "retired" ||
    s === "walkover" ||
    s === "defaulted"
  );
}

/** Map BDL match → shared fixture shape consumed by api/tennis.js */
export function bdlMatchToFixtureShape(m, options = {}) {
  const p1 = String(m.player1?.full_name || "").trim();
  const p2 = String(m.player2?.full_name || "").trim();
  const schedule = m.scheduled_time ? new Date(m.scheduled_time) : null;
  const valid = schedule && !Number.isNaN(schedule.getTime());

  /** Masters draws often ship before `scheduled_time` is populated — anchor so /api/tennis + UI can sort and show cards. */
  const fallbackDay =
    options.fallbackDay instanceof Date && !Number.isNaN(options.fallbackDay.getTime())
      ? options.fallbackDay
      : new Date();
  const syntheticNeeded = !valid && !isFinishedBdl(m);
  const isoDay = syntheticNeeded ? fallbackDay.toISOString().slice(0, 10) : "";
  const event_date = valid ? schedule.toISOString().slice(0, 10) : isoDay;
  const pad = (n) => String(n).padStart(2, "0");
  const event_time = valid ? `${pad(schedule.getUTCHours())}:${pad(schedule.getUTCMinutes())}` : "15:00";
  const syntheticCommence =
    syntheticNeeded && event_date ? `${event_date}T15:00:00.000Z` : null;

  return {
    event_first_player: p1,
    event_second_player: p2,
    tournament_name: String(m.tournament?.name || "ATP Tour").trim(),
    tournament_round: String(m.round || "").trim(),
    event_date,
    event_time,
    event_status: String(m.match_status || "").trim(),
    event_live: m.is_live ? "1" : "0",
    event_final_result: String(m.score || "").trim(),
    event_game_result: String(m.score || "").trim(),
    league_name: "ATP",
    event_type_type: "ATP Singles",
    odd_1: null,
    odd_2: null,
    source: "balldontlie_atp",
    bdl_match_id: m.id,
    bdl_tournament_surface: m.tournament?.surface || "",
    bdl_tournament_category: m.tournament?.category || "",
    bdl_scheduled_time: m.scheduled_time || syntheticCommence,
    commence_iso: m.scheduled_time || syntheticCommence,
  };
}

/**
 * Keep matches relevant to a betting board: live, or upcoming in window, or very recent unfinished.
 * Includes a generous future lookahead so Masters / Slam draws still appear.
 */
export function bdlMatchInBoardWindow(m, windowStartMs, windowEndMs) {
  if (m.is_live) return true;
  const t = m.scheduled_time ? new Date(m.scheduled_time).getTime() : NaN;
  if (!Number.isFinite(t)) return !isFinishedBdl(m);

  const now = Date.now();
  const lookaheadMs = 62 * 24 * 60 * 60 * 1000;
  const recentPastMs = 72 * 60 * 60 * 1000;

  if (t >= windowStartMs && t <= windowEndMs) return true;

  if (!isFinishedBdl(m) && t >= now - recentPastMs && t <= now + lookaheadMs) return true;

  return false;
}

function candidateSeasonYears(windowStart, windowEnd) {
  const y0 = windowStart.getFullYear();
  const y1 = windowEnd.getFullYear();
  const yNow = new Date().getFullYear();
  const lo = Math.min(y0, y1, yNow);
  const hi = Math.max(y0, y1, yNow);
  const out = new Set();
  for (let y = lo - 1; y <= hi + 1; y++) out.add(y);
  return [...out].sort((a, b) => a - b);
}

/** Query current year first — fastest path; expand only if the board is still thin. */
function seasonsQueryOrder(windowStart, windowEnd) {
  const years = candidateSeasonYears(windowStart, windowEnd);
  const yNow = new Date().getFullYear();
  const primary = years.includes(yNow) ? yNow : years[Math.floor(years.length / 2)];
  const rest = years.filter((y) => y !== primary);
  return [primary, ...rest];
}

/**
 * Paginate /atp/v1/matches — tries multiple season years + unscoped fallback.
 * BDL's `season` filter can omit rows if their season field differs from the calendar year we guess.
 */
export async function fetchBdlAtpFixturesForBoard({ windowStart, windowEnd }) {
  const apiKey = process.env.BALLDONTLIE_API_KEY;
  if (!apiKey) {
    return { ok: false, fixtures: [], reason: "no_bdl_key" };
  }

  const windowStartMs = windowStart.getTime();
  const windowEndMs = windowEnd.getTime();
  const byId = new Map();

  const ingest = (batch) => {
    for (const m of batch) {
      if (!m?.player1?.full_name || !m?.player2?.full_name) continue;
      if (!bdlMatchInBoardWindow(m, windowStartMs, windowEndMs)) continue;
      byId.set(m.id, m);
    }
  };

  const fetchPage = async (params) =>
    bdlFetch(`/atp/v1/matches`, params, { timeoutMs: 20000 });

  let lastError = null;

  const runLiveForSeason = async (season) => {
    const params = { per_page: 100, is_live: true };
    if (season != null) params.season = season;
    const liveRes = await fetchPage(params);
    if (!liveRes.ok) {
      lastError = { reason: liveRes.error || "bdl_live_failed", status: liveRes.status };
      return;
    }
    if (Array.isArray(liveRes.data?.data)) ingest(liveRes.data.data);
  };

  const paginateSeason = async (season, maxPages) => {
    let cursor = null;
    for (let page = 0; page < maxPages; page++) {
      const params = { per_page: 100 };
      if (season != null) params.season = season;
      if (cursor != null) params.cursor = cursor;

      const res = await fetchPage(params);

      if (!res.ok) {
        lastError = { reason: res.error || "bdl_matches_failed", status: res.status };
        break;
      }

      const batch = Array.isArray(res.data?.data) ? res.data.data : [];
      const meta = res.data?.meta || {};

      ingest(batch);

      const next = meta.next_cursor;
      if (!next || batch.length === 0) break;
      cursor = next;

      if (byId.size >= 160) break;
    }
  };

  const seasons = seasonsQueryOrder(windowStart, windowEnd);

  for (const season of seasons) {
    await runLiveForSeason(season);
    await paginateSeason(season, 35);
    if (byId.size >= 140) break;
  }

  // Last resort: omit `season` so BDL returns the full cursor stream (still capped).
  if (byId.size === 0) {
    lastError = null;
    await runLiveForSeason(undefined);
    await paginateSeason(undefined, 30);
  }

  if (byId.size === 0 && lastError) {
    return {
      ok: false,
      fixtures: [],
      reason: lastError.reason,
      status: lastError.status,
    };
  }

  const fixtures = [...byId.values()].map((row) =>
    bdlMatchToFixtureShape(row, { fallbackDay: new Date() }),
  );

  return { ok: true, fixtures };
}
