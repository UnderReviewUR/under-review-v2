/**
 * BallDontLie ATP API — men's singles only (ALL-STAR+: matches, race, etc.).
 * See https://www.balldontlie.io/openapi/atp.yml
 *
 * Fetch strategy: parallel-first, timeout-safe.
 *
 * Request budget: max 3 BDL round-trips.
 *   Wave 1 (parallel): live + upcoming page 1    — one wall-clock hop, ~1-2s
 *   Wave 2 (if thin):  upcoming page 2           — only when byId.size < 30
 *   Wave 3 (fallback): unscoped, no season param — only when byId.size === 0
 *
 * Per-request timeout: 6000ms. Total wall-clock common case: ~2-4s.
 * Worst case (all slow + fallback): ~18s — fits Vercel Pro default (60s)
 * and is far more consistent than the previous 35-page sequential design.
 *
 * Optional: add { maxDuration: 30 } to vercel.json for the /api/tennis route
 * if you want extra headroom on Pro.
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

/**
 * BDL payloads vary — full_name may be missing; fall back through known fields.
 */
function bdlPlayerFullName(player) {
  if (!player) return "";
  return String(
    player.full_name ||
    (player.first_name && player.last_name
      ? `${player.first_name} ${player.last_name}`
      : "") ||
    player.name ||
    ""
  ).trim();
}

/**
 * BDL has used scheduled_time, scheduled_at, and start_time across versions.
 * Return whichever is present, or null.
 */
function bdlScheduledTime(m) {
  return m.scheduled_time || m.scheduled_at || m.start_time || null;
}

// ─── Public: fixture shape ───────────────────────────────────────────────────

/** Map BDL match → shared fixture shape consumed by api/tennis.js */
export function bdlMatchToFixtureShape(m, options = {}) {
  const p1 = bdlPlayerFullName(m.player1);
  const p2 = bdlPlayerFullName(m.player2);

  const rawSchedule = bdlScheduledTime(m);
  const schedule = rawSchedule ? new Date(rawSchedule) : null;
  const valid = schedule && !Number.isNaN(schedule.getTime());

  /**
   * Masters draws often ship before scheduled_time is populated — anchor with
   * a synthetic time so the UI can sort and render cards.
   */
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
 * Keep matches relevant to a betting board: live, upcoming in window,
 * or very recent unfinished. Generous lookahead so Masters/Slam draws appear.
 */
export function bdlMatchInBoardWindow(m, windowStartMs, windowEndMs) {
  if (m.is_live) return true;

  const rawSchedule = bdlScheduledTime(m);
  const t = rawSchedule ? new Date(rawSchedule).getTime() : NaN;

  // No schedule + not finished → keep (draw announced, time TBD)
  if (!Number.isFinite(t)) return !isFinishedBdl(m);

  const now = Date.now();
  const lookaheadMs = 62 * 24 * 60 * 60 * 1000;  // 62 days
  const recentPastMs = 72 * 60 * 60 * 1000;        // 72 hours

  if (t >= windowStartMs && t <= windowEndMs) return true;
  if (!isFinishedBdl(m) && t >= now - recentPastMs && t <= now + lookaheadMs)
    return true;

  return false;
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
  const currentYear = new Date().getFullYear();

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

  // ── Wave 1: parallel live + upcoming page 1 (one wall-clock hop) ─────────
  const [liveRes, page1Res] = await Promise.all([
    fetchPage({ per_page: 100, is_live: true, season: currentYear }),
    fetchPage({ per_page: 100, season: currentYear }),
  ]);

  handle(liveRes);
  handle(page1Res);

  const page1Cursor = page1Res.ok
    ? (page1Res.data?.meta?.next_cursor ?? null)
    : null;

  // ── Wave 2: page 2 if board is thin ──────────────────────────────────────
  if (byId.size < 30 && page1Cursor) {
    const page2Res = await fetchPage({
      per_page: 100,
      season: currentYear,
      cursor: page1Cursor,
    });
    handle(page2Res);
  }

  // ── Wave 3: unscoped fallback if board is still empty ────────────────────
  if (byId.size === 0) {
    const fallbackRes = await fetchPage({ per_page: 100 });
    handle(fallbackRes);
  }

  // Return ok:false only when every request failed (BDL error, not empty window)
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
