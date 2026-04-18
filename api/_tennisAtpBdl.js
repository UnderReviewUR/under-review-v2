/**
 * BallDontLie ATP API — DIAGNOSTIC VERSION
 * Logs raw BDL responses to Vercel console so we can see why fixtures aren't ingesting.
 * Replace with normal version once we identify the issue.
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

export function bdlMatchInBoardWindow(m, windowStartMs, windowEndMs) {
  if (m.is_live) return true;

  const rawSchedule = bdlScheduledTime(m);
  const t = rawSchedule ? new Date(rawSchedule).getTime() : NaN;

  if (!Number.isFinite(t)) return !isFinishedBdl(m);

  const now = Date.now();
  const lookaheadMs = 62 * 24 * 60 * 60 * 1000;
  const recentPastMs = 72 * 60 * 60 * 1000;

  if (t >= windowStartMs && t <= windowEndMs) return true;
  if (!isFinishedBdl(m) && t >= now - recentPastMs && t <= now + lookaheadMs)
    return true;

  return false;
}

export async function fetchBdlAtpFixturesForBoard({ windowStart, windowEnd }) {
  const apiKey = process.env.BALLDONTLIE_API_KEY;
  if (!apiKey) {
    console.log("[BDL DIAG] No API key");
    return { ok: false, fixtures: [], reason: "no_bdl_key" };
  }

  const windowStartMs = windowStart.getTime();
  const windowEndMs = windowEnd.getTime();
  const byId = new Map();
  const currentYear = new Date().getFullYear();

  console.log("[BDL DIAG] Window:", {
    start: windowStart.toISOString(),
    end: windowEnd.toISOString(),
    currentYear,
  });

  // Diagnostic counters
  const stats = {
    totalRowsReceived: 0,
    rejectedNoPlayerNames: 0,
    rejectedOutOfWindow: 0,
    accepted: 0,
    sampleRows: [],
  };

  const ingest = (batch, source) => {
    if (!Array.isArray(batch)) {
      console.log(`[BDL DIAG] ${source}: batch is not array`, typeof batch);
      return;
    }
    console.log(`[BDL DIAG] ${source}: received ${batch.length} rows`);
    stats.totalRowsReceived += batch.length;

    for (const m of batch) {
      // Capture first 3 raw rows for inspection
      if (stats.sampleRows.length < 3) {
        stats.sampleRows.push({
          id: m.id,
          player1: m.player1,
          player2: m.player2,
          scheduled_time: m.scheduled_time,
          scheduled_at: m.scheduled_at,
          start_time: m.start_time,
          is_live: m.is_live,
          match_status: m.match_status,
          tournament: m.tournament,
          round: m.round,
        });
      }

      const p1 = bdlPlayerFullName(m.player1);
      const p2 = bdlPlayerFullName(m.player2);
      if (!p1 || !p2) {
        stats.rejectedNoPlayerNames++;
        continue;
      }
      if (!bdlMatchInBoardWindow(m, windowStartMs, windowEndMs)) {
        stats.rejectedOutOfWindow++;
        continue;
      }
      byId.set(m.id, m);
      stats.accepted++;
    }
  };

  const fetchPage = (params) =>
    bdlFetch(`/atp/v1/matches`, params, { timeoutMs: 6000 });

  let anyOk = false;
  let lastError = null;

  const handle = (res, label) => {
    if (res.ok) {
      anyOk = true;
      ingest(res.data?.data, label);
    } else {
      console.log(`[BDL DIAG] ${label} FAILED:`, res.status, res.error);
      lastError = { reason: res.error || "bdl_request_failed", status: res.status };
    }
    return res;
  };

  // Wave 1
  const [liveRes, page1Res] = await Promise.all([
    fetchPage({ per_page: 100, is_live: true, season: currentYear }),
    fetchPage({ per_page: 100, season: currentYear }),
  ]);

  handle(liveRes, "WAVE1_LIVE");
  handle(page1Res, "WAVE1_PAGE1");

  const page1Cursor = page1Res.ok
    ? (page1Res.data?.meta?.next_cursor ?? null)
    : null;

  // Wave 2
  if (byId.size < 30 && page1Cursor) {
    const page2Res = await fetchPage({
      per_page: 100,
      season: currentYear,
      cursor: page1Cursor,
    });
    handle(page2Res, "WAVE2_PAGE2");
  }

  // Wave 3
  if (byId.size === 0) {
    console.log("[BDL DIAG] Empty board after waves 1+2, trying unscoped fallback");
    const fallbackRes = await fetchPage({ per_page: 100 });
    handle(fallbackRes, "WAVE3_UNSCOPED");
  }

  // Final diagnostic dump
  console.log("[BDL DIAG] FINAL STATS:", JSON.stringify(stats, null, 2));
  console.log("[BDL DIAG] Final byId.size:", byId.size);

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
