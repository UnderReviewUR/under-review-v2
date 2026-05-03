/**
 * Ball Dont Lie ATP API — men's singles only (ALL-STAR+ tier).
 * See https://www.balldontlie.io/openapi/atp.yml
 *
 * Strategy (combined):
 * - `start_date_after` (last ~60 days) filters on BDL's side so we skip months of stale completed rows.
 * - Parallel `is_live` + anchored schedule + tournament list; pull matches by overlapping
 *   tournament IDs (direct draw access).
 * - Cursor drains stay anchored with `start_date_after` (not unbounded season scans).
 * - Wall-clock budget keeps /api/tennis inside Vercel maxDuration.
 */
import { bdlFetch } from "./_balldontlie.js";
import { getEnv } from "./_env.js";

const BDL_MATCH_REQ_MS = 8000;
const TARGET_INGEST_COUNT = 52;
const MAX_CURSOR_PAGES_PER_STREAM = 18;
const MAX_TOURNAMENT_IDS_PER_REQUEST = 15;
const WALL_BUDGET_MS = 38000;

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

function bdlPlayerFullName(player) {
  if (!player || typeof player !== "object") return "";
  const direct = String(player.full_name || "").trim();
  if (direct) return direct;
  const first = String(player.first_name || "").trim();
  const last = String(player.last_name || "").trim();
  const joined = [first, last].filter(Boolean).join(" ").trim();
  if (joined) return joined;
  return String(player.name || "").trim();
}

function bdlScheduledTime(m) {
  if (!m || typeof m !== "object") return null;
  const raw = m.scheduled_time ?? m.scheduled_at ?? m.start_time;
  if (raw == null || raw === "") return null;
  return raw;
}

function bdlScheduledDate(m) {
  const raw = bdlScheduledTime(m);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isoDateOnly(d) {
  return d.toISOString().slice(0, 10);
}

function ymdStartUtcMs(ymd) {
  if (!ymd || typeof ymd !== "string") return NaN;
  const d = new Date(`${ymd.trim().slice(0, 10)}T00:00:00.000Z`);
  const t = d.getTime();
  return Number.isFinite(t) ? t : NaN;
}

function ymdEndUtcMs(ymd) {
  if (!ymd || typeof ymd !== "string") return NaN;
  const d = new Date(`${ymd.trim().slice(0, 10)}T23:59:59.999Z`);
  const t = d.getTime();
  return Number.isFinite(t) ? t : NaN;
}

function tournamentRowOverlaps(row, windowStartMs, windowEndMs) {
  if (!row || typeof row !== "object") return false;
  const sd = ymdStartUtcMs(row.start_date);
  const ed = ymdEndUtcMs(row.end_date);
  if (!Number.isFinite(sd) || !Number.isFinite(ed)) return false;
  return sd <= windowEndMs && ed >= windowStartMs;
}

export function bdlMatchToFixtureShape(m, options = {}) {
  const p1 = bdlPlayerFullName(m.player1);
  const p2 = bdlPlayerFullName(m.player2);

  const schedule = bdlScheduledDate(m);
  const valid = !!schedule;

  const fallbackDay =
    options.fallbackDay instanceof Date && !Number.isNaN(options.fallbackDay.getTime())
      ? options.fallbackDay
      : new Date();

  const syntheticNeeded = !valid && !isFinishedBdl(m);
  const isoDay = syntheticNeeded ? fallbackDay.toISOString().slice(0, 10) : "";
  const event_date = valid ? schedule.toISOString().slice(0, 10) : isoDay;
  const pad = (n) => String(n).padStart(2, "0");
  const event_time = valid
    ? `${pad(schedule.getUTCHours())}:${pad(schedule.getUTCMinutes())}`
    : "15:00";
  const syntheticCommence =
    syntheticNeeded && event_date ? `${event_date}T15:00:00.000Z` : null;

  const rawSched = bdlScheduledTime(m);

  const statusLc = String(m.match_status || "").trim().toLowerCase();
  const inProgress = statusLc === "in_progress";
  const readsLive = !!m.is_live || inProgress;

  return {
    event_first_player: p1,
    event_second_player: p2,
    tournament_name: String(m.tournament?.name || "ATP Tour").trim(),
    tournament_round: String(m.round || "").trim(),
    event_date,
    event_time,
    event_status: String(m.match_status || "").trim(),
    event_live: readsLive ? "1" : "0",
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
    bdl_scheduled_time: rawSched || syntheticCommence,
    commence_iso: rawSched || syntheticCommence,
  };
}

export function bdlMatchInBoardWindow(m, windowStartMs, windowEndMs) {
  const st = String(m.match_status || "").toLowerCase();
  if (m.is_live || st === "in_progress") return true;

  const tr = m.tournament;
  if (tr && tournamentRowOverlaps(tr, windowStartMs, windowEndMs)) {
    if (!isFinishedBdl(m)) return true;
    const mt = bdlScheduledDate(m)?.getTime();
    if (
      Number.isFinite(mt) &&
      mt >= windowStartMs - 10 * 24 * 60 * 60 * 1000 &&
      mt <= windowEndMs + 24 * 60 * 60 * 1000
    ) {
      return true;
    }
    return false;
  }

  const t = bdlScheduledDate(m)?.getTime() ?? NaN;

  if (Number.isFinite(t)) {
    const now = Date.now();
    const lookaheadMs = 62 * 24 * 60 * 60 * 1000;
    const recentPastMs = 72 * 60 * 60 * 1000;

    if (t >= windowStartMs && t <= windowEndMs) return true;
    if (!isFinishedBdl(m) && t >= now - recentPastMs && t <= now + lookaheadMs)
      return true;

    return false;
  }

  if (isFinishedBdl(m)) return false;

  const tStart = m.tournament?.start_date
    ? new Date(m.tournament.start_date).getTime()
    : NaN;
  const tEnd = m.tournament?.end_date
    ? new Date(m.tournament.end_date).getTime()
    : NaN;

  if (Number.isFinite(tStart) && Number.isFinite(tEnd)) {
    const now = Date.now();
    return (
      now >= tStart - 7 * 24 * 60 * 60 * 1000 &&
      now <= tEnd + 24 * 60 * 60 * 1000
    );
  }

  return true;
}

export async function fetchBdlAtpFixturesForBoard({ windowStart, windowEnd }) {
  const wallStart = Date.now();
  const overWall = () => Date.now() - wallStart > WALL_BUDGET_MS;

  const apiKey = getEnv("BALLDONTLIE_API_KEY");
  if (!apiKey) {
    return { ok: false, fixtures: [], reason: "no_bdl_key" };
  }

  const windowStartMs = windowStart.getTime();
  const windowEndMs = windowEnd.getTime();
  const byId = new Map();
  const currentYear = new Date().getFullYear();

  const dateAnchor = new Date();
  dateAnchor.setDate(dateAnchor.getDate() - 60);
  const startDateAfter = isoDateOnly(dateAnchor);

  const ingest = (batch) => {
    if (!Array.isArray(batch)) return;
    for (const m of batch) {
      if (!bdlPlayerFullName(m.player1) || !bdlPlayerFullName(m.player2)) continue;
      if (!bdlMatchInBoardWindow(m, windowStartMs, windowEndMs)) continue;
      byId.set(m.id, m);
    }
  };

  const fetchPage = (params) =>
    bdlFetch(`/atp/v1/matches`, params, { timeoutMs: BDL_MATCH_REQ_MS });

  let anyOk = false;
  let lastError = null;

  const handle = (res) => {
    if (res.ok) {
      anyOk = true;
      ingest(res.data?.data);
    } else {
      lastError = { reason: res.error || "bdl_request_failed", status: res.status };
    }
    return res;
  };

  const drainCursorChain = async (firstCursor, baseParams) => {
    let cursor = firstCursor;
    let pages = 0;
    while (
      cursor &&
      byId.size < TARGET_INGEST_COUNT &&
      pages < MAX_CURSOR_PAGES_PER_STREAM &&
      !overWall()
    ) {
      const res = await fetchPage({ ...baseParams, cursor });
      handle(res);
      if (!res.ok) break;
      cursor = res.data?.meta?.next_cursor ?? null;
      pages += 1;
    }
    return pages;
  };

  const [liveRes, page1Res, tournamentsRes] = await Promise.all([
    fetchPage({ per_page: 100, is_live: true, start_date_after: startDateAfter }),
    fetchPage({ per_page: 100, start_date_after: startDateAfter }),
    bdlFetch(
      `/atp/v1/tournaments`,
      { season: currentYear, per_page: 100 },
      { timeoutMs: BDL_MATCH_REQ_MS },
    ),
  ]);

  handle(liveRes);
  handle(page1Res);

  if (tournamentsRes.ok && Array.isArray(tournamentsRes.data?.data)) {
    const ids = tournamentsRes.data.data
      .filter((row) => tournamentRowOverlaps(row, windowStartMs, windowEndMs))
      .map((row) => row.id)
      .filter((id) => id != null);

    for (
      let i = 0;
      i < ids.length && byId.size < TARGET_INGEST_COUNT && !overWall();
      i += MAX_TOURNAMENT_IDS_PER_REQUEST
    ) {
      const chunk = ids.slice(i, i + MAX_TOURNAMENT_IDS_PER_REQUEST);
      const tr = await fetchPage({
        per_page: 100,
        tournament_ids: chunk,
        start_date_after: startDateAfter,
      });
      handle(tr);
    }
  }

  const page1Cursor = page1Res.ok ? (page1Res.data?.meta?.next_cursor ?? null) : null;

  const page1Full =
    page1Res.ok &&
    Array.isArray(page1Res.data?.data) &&
    page1Res.data.data.length >= 100;

  if (page1Full && page1Cursor && byId.size < TARGET_INGEST_COUNT && !overWall()) {
    const page2Res = await fetchPage({
      per_page: 100,
      start_date_after: startDateAfter,
      cursor: page1Cursor,
    });
    handle(page2Res);
    const nextCur = page2Res.ok ? (page2Res.data?.meta?.next_cursor ?? null) : null;
    await drainCursorChain(nextCur, {
      per_page: 100,
      start_date_after: startDateAfter,
    });
  } else {
    await drainCursorChain(page1Cursor, {
      per_page: 100,
      start_date_after: startDateAfter,
    });
  }

  if (byId.size === 0) {
    const fallbackRes = await fetchPage({
      per_page: 100,
      start_date_after: startDateAfter,
    });
    handle(fallbackRes);
    const fbCur = fallbackRes.ok ? (fallbackRes.data?.meta?.next_cursor ?? null) : null;
    await drainCursorChain(fbCur, {
      per_page: 100,
      start_date_after: startDateAfter,
    });
  }

  if (byId.size === 0 && !anyOk && lastError) {
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
