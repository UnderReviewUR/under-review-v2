import { sanitizeDailyTakePreviewPayload } from "./_dailyTakeSanitize.js";
import { condensedPreviewFromUrTakeResponse } from "./_dailyTakeCondensed.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { buildNbaUrTakeBoard } from "./nba.js";
import { getNbaFinalsSeriesState } from "../shared/nbaFinalsUtils.js";

/** Bumped when preview trim/sanitize logic changes — invalidates stale KV copies. */
const STORAGE_PREFIX = "daily_take:v2:";
const PREVIEW_TRIM_VERSION = 4;

export function getEtDateKey(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !day) {
    return d.toISOString().slice(0, 10);
  }
  return `${y}-${m}-${day}`;
}

export function resolveInternalApiOrigin() {
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return process.env.DAILY_TAKE_INTERNAL_ORIGIN || "http://127.0.0.1:3001";
}

function scoreNbaGame(g) {
  const st = String(g?.state || "").toLowerCase();
  let s = 0;
  if (st === "in") s += 120;
  else if (st === "pre") s += 60;
  if (g?.seriesContext) s += 40;
  return s;
}

function scoreMlbGame(g) {
  const st = String(g?.state || "").toLowerCase();
  if (st === "in") return 100;
  if (st === "pre") return 50;
  return 10;
}

function scoreTennisRow(row) {
  let s = 0;
  if (String(row?.live || "") === "1") s += 100;
  const st = String(row?.status || "").toLowerCase();
  if (st.includes("live")) s += 80;
  return s;
}

/**
 * NBA → MLB → Tennis: first sport with a playable slate wins; games ranked by live/postseason proxy.
 * @returns {Promise<{ sportHint: string, question: string, matchupLabel: string } | null>}
 */
export async function pickDailySlateTarget(fetchImpl = fetch) {
  try {
    const board = await buildNbaUrTakeBoard("");
    const games = board?.todaysGames || [];
    const playable = games.filter((g) => {
      const st = String(g?.state || "").toLowerCase();
      return st === "pre" || st === "scheduled" || st === "in";
    });
    if (playable.length) {
      const g = [...playable].sort((a, b) => scoreNbaGame(b) - scoreNbaGame(a))[0];
      const away = g?.awayTeam?.abbr || g?.awayTeam?.name || "Away";
      const home = g?.homeTeam?.abbr || g?.homeTeam?.name || "Home";
      return {
        sportHint: "nba",
        question: `What's your sharpest lean on ${away} @ ${home} tonight — who you like, why, and what line or prop jumps out from the board?`,
        matchupLabel: `${away} @ ${home}`,
      };
    }
  } catch (err) {
    console.warn("[daily-take] NBA slate pick failed:", err?.message || err);
  }

  const origin = resolveInternalApiOrigin();

  try {
    const res = await fetchImpl(`${origin}/api/mlb?view=board`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const board = await res.json();
      const games = board?.games || [];
      const playable = games.filter((g) => String(g?.state || "").toLowerCase() !== "post");
      if (playable.length) {
        const g = [...playable].sort((a, b) => scoreMlbGame(b) - scoreMlbGame(a))[0];
        const away = g?.awayTeam?.abbr || g?.awayTeam?.name || "Away";
        const home = g?.homeTeam?.abbr || g?.homeTeam?.name || "Home";
        return {
          sportHint: "mlb",
          question: `What's your sharpest lean on ${away} @ ${home} today — pitching, bullpen, and the play you'd actually make from the board?`,
          matchupLabel: `${away} @ ${home}`,
        };
      }
    }
  } catch (err) {
    console.warn("[daily-take] MLB slate pick failed:", err?.message || err);
  }

  try {
    const res = await fetchImpl(`${origin}/api/tennis?tour=atp`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      const rows = Array.isArray(data) ? data : [];
      const usable = rows.filter((r) => r?.home_team && r?.away_team);
      if (usable.length) {
        const row = [...usable].sort((a, b) => scoreTennisRow(b) - scoreTennisRow(a))[0];
        const p1 = String(row.home_team || "").trim();
        const p2 = String(row.away_team || "").trim();
        const label = `${p1} vs ${p2}`;
        return {
          sportHint: "tennis",
          question: `Give me the sharpest betting edge for ${label} — market mispricing, form, and the structural angle from today's board.`,
          matchupLabel: label,
        };
      }
    }
  } catch (err) {
    console.warn("[daily-take] Tennis slate pick failed:", err?.message || err);
  }

  return null;
}

async function callUrTakePipeline(origin, target, fetchImpl) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn("[daily-take] CRON_SECRET missing — cannot invoke /api/ur-take internally");
    return null;
  }

  const res = await fetchImpl(`${origin}/api/ur-take`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cronSecret}`,
      "x-daily-take-internal": "1",
      "x-ur-take-structured": "1",
    },
    body: JSON.stringify({
      question: target.question,
      sportHint: target.sportHint,
      structured: true,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.warn("[daily-take] ur-take HTTP", res.status, t.slice(0, 400));
    return null;
  }

  return res.json();
}

const DAY_TTL_SECONDS = 26 * 60 * 60;

/**
 * @param {Record<string, unknown> | null | undefined} board
 */
export function nbaSeriesFingerprintFromBoard(board) {
  const games = Array.isArray(board?.todaysGames) ? board.todaysGames : [];
  const playoffSeries = Array.isArray(board?.playoffSeries) ? board.playoffSeries : [];
  const game =
    games.find((g) => String(g?.state || "").toLowerCase() === "in") ||
    games.find((g) => String(g?.state || "").toLowerCase() === "pre") ||
    games[0] ||
    null;
  const state = getNbaFinalsSeriesState({ game, playoffSeries });
  if (!state?.isFinals) return null;
  return `${state.awayAbbr}|${state.homeAbbr}|${state.awayWins}-${state.homeWins}|g${state.gameNumber ?? 0}`;
}

/**
 * Regenerate when Finals series score / game number drift vs cached preview.
 * @param {Record<string, unknown> | null | undefined} cached
 */
export async function dailyTakeSeriesFingerprintStale(cached) {
  if (!cached?.ok || cached.sportHint !== "nba") return false;
  try {
    const board = await buildNbaUrTakeBoard("");
    const fp = nbaSeriesFingerprintFromBoard(board);
    if (!fp) return false;
    return cached.seriesFingerprint !== fp;
  } catch (err) {
    console.warn("[daily-take] series fingerprint check failed:", err?.message || err);
    return false;
  }
}

/**
 * @returns {Promise<object | null>}
 */
export async function generateDailyTakePreview(fetchImpl = fetch) {
  const dateKey = getEtDateKey();
  const key = `${STORAGE_PREFIX}${dateKey}`;
  const origin = resolveInternalApiOrigin();

  const target = await pickDailySlateTarget(fetchImpl);
  if (!target) {
    const payload = {
      ok: false,
      dateKey,
      error: "no_slate",
      generatedAt: new Date().toISOString(),
    };
    await setDurableJson(key, payload, { ttlSeconds: DAY_TTL_SECONDS });
    return payload;
  }

  const json = await callUrTakePipeline(origin, target, fetchImpl);
  if (!json) {
    const payload = {
      ok: false,
      dateKey,
      error: "ur_take_failed",
      generatedAt: new Date().toISOString(),
    };
    await setDurableJson(key, payload, { ttlSeconds: DAY_TTL_SECONDS });
    return payload;
  }

  const responseText = String(json.response ?? json.take ?? "").trim();
  const condensed = condensedPreviewFromUrTakeResponse(responseText);

  let seriesFingerprint = null;
  if (target.sportHint === "nba") {
    try {
      const board = await buildNbaUrTakeBoard(target.question);
      seriesFingerprint = nbaSeriesFingerprintFromBoard(board);
    } catch (err) {
      console.warn("[daily-take] series fingerprint capture failed:", err?.message || err);
    }
  }

  const payload = sanitizeDailyTakePreviewPayload({
    ok: true,
    dateKey,
    previewTrimVersion: PREVIEW_TRIM_VERSION,
    generatedAt: new Date().toISOString(),
    sportHint: target.sportHint,
    question: target.question,
    matchupLabel: target.matchupLabel,
    sport: json.sport || target.sportHint,
    confidence: json.confidence || null,
    headline: condensed.headline,
    bodyChunk: condensed.bodyChunk,
    closing: condensed.closing,
    seriesFingerprint,
  });

  if (!payload?.ok) {
    await setDurableJson(
      key,
      {
        ok: false,
        dateKey,
        error: payload?.error || "preview_blocked_irrelevant_player",
        generatedAt: new Date().toISOString(),
      },
      { ttlSeconds: DAY_TTL_SECONDS },
    );
    return payload;
  }

  await setDurableJson(key, payload, { ttlSeconds: DAY_TTL_SECONDS });
  return payload;
}

export async function readStoredDailyTake(dateKey) {
  return getDurableJson(`${STORAGE_PREFIX}${dateKey}`);
}
