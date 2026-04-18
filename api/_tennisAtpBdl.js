/**
 * BallDontLie ATP API — men's singles only (ALL-STAR+ tier).
 * See https://www.balldontlie.io/openapi/atp.yml
 *
 * Strategy: filter on BDL's side with `start_date_after` so we never page
 * through hundreds of completed early-season matches.
 *
 * Previous problem: BDL returns matches in ascending date order. Page 1
 * returned January matches (long completed). At ~100 matches per ATP week,
 * skipping Jan-Apr would take 30+ pages — eating Vercel's function budget.
 *
 * Fix: anchor each request 4 days before today using BDL's start_date_after
 * filter. That returns only currently-relevant matches: live, in-progress
 * tournament, and upcoming events. Common case: 1 page covers the whole board.
 *
 * Request budget: max 3 BDL round-trips, ~6s per request.
 *   Wave 1 (parallel): live + recent/upcoming page 1
 *   Wave 2 (rare):     page 2 if first page filled to per_page max
 *   Wave 3 (fallback): no date filter, in case start_date_after is unsupported
 */
import { bdlFetch } from "./_balldontlie.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  return String(
    player.full_name ||
    (player.first_name && player.last_name
      ? `${player.first_name} ${player.last_name}`
      : "") ||
    player.name ||
    ""
  ).trim();
}

function bdlScheduledTime(m) {
  return m.scheduled_time || m.scheduled_at || m.start_time || null;
}

/** Format a Date as YYYY-MM-DD for BDL date-filter params. */
function isoDateOnly(d) {
  return d.toISOString().slice(0, 10);
}

// ─── Public: fixture shape ───────────────────────────────────────────────────

export function bdlMatchToFixtureShape(m, options = {}) {
  const p1 = bdlPlayerFullName(m.player1);
  const p2 = bdlPlayerFullName(m.player2);

  const rawSchedule = bdlScheduledTime(m);
  const schedule = rawSchedule ? new Date(rawSchedule) : null;
  const valid = schedule && !Number.isNaN(schedule.getTime());

  const fallbackDay =
    options.fallbackDay instanceof Date &&
    !Number.isNaN(options.fallbackDay.getTime())
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
    bdl_scheduled_time: rawSchedule || syntheticCommence,
    commence_iso: rawSchedule || syntheticCommence,
  };
}

// ─── Public: window filter ───────────────────────────────────────────────────

/**
 * Keep matches relevant to a betting board. Live always passes. Otherwise:
 * - If match has a schedule, must fall in window OR be a recent unfinished match
 * - If no schedule, keep when the parent tournament is currently running
 */
export function bdlMatchInBoardWindow(m, windowStartMs, windowEndMs) {
  if (m.is_live) return true;

  const rawSchedule = bdlScheduledTime(m);
  const t = rawSchedule ? new Date(rawSchedule).getTime() : NaN;

  if (Number.isFinite(t)) {
    const now = Date.now();
    const lookaheadMs = 62 * 24 * 60 * 60 * 1000;
    const recentPastMs = 72 * 60 * 60 * 1000;

    if (t >= windowStartMs && t <= windowEndMs) return true;
    if (!isFinishedBdl(m) && t >= now - recentPastMs && t <= now + lookaheadMs)
      return true;

    return false;
  }

  // No scheduled_time — keep if the tournament itself is current
  if (isFinishedBdl(m)) return false;

  const tStart = m.tournament?.start_date
    ? new Date(m.tournament.start_date).getTime()
    : NaN;
  const tEnd = m.tournament?.end_date
    ? new Date(m.tournament.end_date).getTime()
    : NaN;

  if (Number.isFinite(tStart) && Number.isFinite(tEnd)) {
    const now = Date.now();
    return now >= tStart - 7 * 24 * 60 * 60 * 1000 && now <= tEnd + 24 * 60 * 60 * 1000;
  }

  return true;
}

// ─── Public: main board fetch ────────────────────────────────────────────────

export async function fetchBdlAtpFixturesForBoard({ windowStart, windowEnd }) {
  const apiKey = process.env.BALLDONTLIE_API_KEY;
  if (!apiKey) {
    return { ok: false, fixtures: [], reason: "no_bdl_key" };
  }

  const windowStartMs = windowStart.getTime();
  const windowEndMs = windowEnd.getTime();
  const byId = new Map();

  // Anchor BDL's start_date_after at 3 days before the window opens — gives us
  // matches that started recently or are upcoming, skips months of completed history.
  const dateAnchor = new Date(windowStart);
  dateAnchor.setDate(dateAnchor.getDate() - 3);
  const startDateAfter = isoDateOnly(dateAnchor);

  const ingest = (batch) => {
    if (!Array.isArray(batch)) return;
    for (const m of batch) {
      const p1 = bdlPlayerFullName(m.player1);
      const p2 = bdlPlayerFullName(m.player2);
      if (!p1 || !p2) continue;
      if (!bdlMatchInBoardWindow(m, windowStartMs, windowEndMs)) continue;
      byId.set(m.id, m);
    }
  };

  const fetchPage = (params) =>
    bdlFetch(`/atp/v1/matches`, params, { timeoutMs: 6000 });

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

  // ── Wave 1: parallel live + date-anchored page 1 ─────────────────────────
  const [liveRes, page1Res] = await Promise.all([
    fetchPage({ per_page: 100, is_live: true }),
    fetchPage({ per_page: 100, start_date_after: startDateAfter }),
  ]);

  handle(liveRes);
  handle(page1Res);

  const page1Cursor = page1Res.ok
    ? (page1Res.data?.meta?.next_cursor ?? null)
    : null;

  // ── Wave 2: page 2 if board still building ──────────────────────────────
  // With start_date_after, page 1 usually has everything. Only page 2 if it filled.
  const page1Full =
    page1Res.ok && Array.isArray(page1Res.data?.data) &&
    page1Res.data.data.length >= 100;

  if (page1Full && page1Cursor && byId.size < 50) {
    const page2Res = await fetchPage({
      per_page: 100,
      start_date_after: startDateAfter,
      cursor: page1Cursor,
    });
    handle(page2Res);
  }

  // ── Wave 3: fallback if start_date_after isn't supported by BDL ────────
  if (byId.size === 0) {
    const fallbackRes = await fetchPage({ per_page: 100 });
    handle(fallbackRes);
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
