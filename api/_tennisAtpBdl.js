/**
 * BallDontLie ATP API — men's singles only (ALL-STAR+: matches, race, etc.).
 * See https://www.balldontlie.io/openapi/atp.yml
 *
 * Fetch strategy: parallel-first, timeout-safe.
 *
 * Request budget: max 3 wall-clock waves, up to 4 HTTP calls total.
 *   Wave 1 (parallel): live + upcoming page 1 — one wall-clock hop
 *   Wave 2 (if thin):  upcoming page 2 — only when byId.size < 30
 *   Wave 3 (fallback): unscoped, no season param — only when byId.size === 0
 *
 * Per-request timeout: 6000ms. Common case ~2–4s wall-clock.
 * Worst case sequential waves: ~18s — OK for Vercel Pro defaults; Hobby (10s) may
 * still edge-case timeout if every hop is slow — consider maxDuration or shorter REQ_MS.
 *
 * Optional: add { maxDuration: 30 } to vercel.json for /api/tennis on Pro.
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

/**
 * BDL payloads vary — full_name may be missing; fall back through known fields.
 */
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

/**
 * BDL has used scheduled_time, scheduled_at, and start_time across versions.
 */
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

/** Map BDL match → shared fixture shape consumed by api/tennis.js */
export function bdlMatchToFixtureShape(m, options = {}) {
  const p1 = bdlPlayerFullName(m.player1);
  const p2 = bdlPlayerFullName(m.player2);

  const schedule = bdlScheduledDate(m);
  const valid = !!schedule;

  /**
   * Masters draws often ship before scheduled_time is populated — anchor so
   * /api/tennis + UI can sort and show cards.
   */
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

/**
 * Keep matches relevant to a betting board: live, upcoming in window,
 * or very recent unfinished. Generous lookahead so Masters / Slam draws appear.
 */
export function bdlMatchInBoardWindow(m, windowStartMs, windowEndMs) {
  const st = String(m.match_status || "").toLowerCase();
  if (m.is_live || st === "in_progress") return true;

  const t = bdlScheduledDate(m)?.getTime() ?? NaN;

  if (!Number.isFinite(t)) return !isFinishedBdl(m);

  const now = Date.now();
  const lookaheadMs = 62 * 24 * 60 * 60 * 1000;
  const recentPastMs = 72 * 60 * 60 * 1000;

  if (t >= windowStartMs && t <= windowEndMs) return true;
  if (!isFinishedBdl(m) && t >= now - recentPastMs && t <= now + lookaheadMs) return true;

  return false;
}

const BDL_MATCH_REQ_MS = 6000;

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

  const prevYear = currentYear - 1;

  /**
   * Live feed: do NOT scope by season — ATP rows can carry the prior calendar year deep into Q1.
   * Schedule pages: pull both years so early-season tournaments are never missing from the board.
   */
  const [liveRes, page1Res, page1PrevRes] = await Promise.all([
    fetchPage({ per_page: 100, is_live: true }),
    fetchPage({ per_page: 100, season: currentYear }),
    fetchPage({ per_page: 100, season: prevYear }),
  ]);

  handle(liveRes);
  handle(page1Res);
  handle(page1PrevRes);

  const page1Cursor = page1Res.ok ? (page1Res.data?.meta?.next_cursor ?? null) : null;

  if (byId.size < 30 && page1Cursor) {
    const page2Res = await fetchPage({
      per_page: 100,
      season: currentYear,
      cursor: page1Cursor,
    });
    handle(page2Res);
  }

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
