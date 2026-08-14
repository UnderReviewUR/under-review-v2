/**
 * Pregame vs live vs final — from the board status, not the model's guess.
 */

const LIVE_STATUS = new Set(["inprogress", "in", "live", "halftime", "ht", "q1", "q2", "q3", "q4", "ot"]);
const FINAL_STATUS = new Set(["final", "closed", "complete", "completed", "final/ot"]);

/**
 * @param {Record<string, unknown>} game
 * @param {number} [nowMs]
 * @returns {"pregame"|"live"|"final"}
 */
export function classifyNflGamePhase(game, nowMs = Date.now()) {
  const status = String(game?.status || "").toLowerCase().trim();
  if (FINAL_STATUS.has(status) || status.includes("final")) return "final";
  if (LIVE_STATUS.has(status) || status.includes("progress")) return "live";
  void nowMs;
  return "pregame";
}

/**
 * Short kickoff for pregame rows.
 * @param {number | null | undefined} tipoffMs
 */
export function formatNflKickoffShort(tipoffMs) {
  if (tipoffMs == null || !Number.isFinite(Number(tipoffMs))) return "";
  try {
    return new Date(Number(tipoffMs)).toLocaleString("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * One clause for prompts and cards: "pregame · Sun 1:00 PM" | "LIVE" | "final".
 * @param {Record<string, unknown>} game
 * @param {number} [nowMs]
 */
export function formatNflGameStateLine(game, nowMs = Date.now()) {
  const phase = classifyNflGamePhase(game, nowMs);
  if (phase === "live") return "LIVE";
  if (phase === "final") return "final";
  const kick = formatNflKickoffShort(game?.tipoffMs);
  return kick ? `pregame · ${kick} ET` : "pregame";
}

/**
 * @param {string | null | undefined} clock
 */
export function formatNflClock(clock) {
  const s = String(clock || "").trim();
  if (!s || s === "00:00" || s === "0:00") return "";
  return s.replace(/^0(\d:)/, "$1");
}

/**
 * Q1–Q4 / OT / HT from period + clock + status.
 * @param {Record<string, unknown>} game
 */
export function formatNflLiveClockLine(game) {
  const status = String(game?.status || "").toLowerCase();
  const display = String(game?.statusDisplay || "");
  if (/\bhalf/i.test(status) || /\bhalf/i.test(display)) return "HT";
  const period = Number(game?.period);
  const clock = formatNflClock(game?.clock);
  if (!Number.isFinite(period) || period < 1) {
    return display && !/^live$/i.test(display) ? display : "LIVE";
  }
  if (!clock && period === 2) return "HT";
  const q = period >= 5 ? (period === 5 ? "OT" : `${period - 4}OT`) : `Q${period}`;
  return clock ? `${q} ${clock}` : q;
}

/**
 * @param {string | null | undefined} network
 */
export function formatNflChannel(network) {
  const n = String(network || "").trim();
  if (!n) return "";
  if (/^nfl network$/i.test(n)) return "NFLN";
  return n;
}

/**
 * Pregame meta: Fri 7:00 PM · NBC
 * @param {Record<string, unknown>} game
 */
export function formatNflPregameMeta(game) {
  const kick = formatNflKickoffShort(game?.tipoffMs);
  const ch = formatNflChannel(game?.network);
  if (kick && ch) return `${kick} ET · ${ch}`;
  if (kick) return `${kick} ET`;
  return ch;
}

const HOME_SCORE_LIMIT = 6;
const FAST_POLL_WINDOW_MS = 10 * 60 * 1000;

/**
 * Faster scoreboard poll when a game is live or within 10 minutes of kickoff.
 * @param {Array<Record<string, unknown>>} games
 * @param {number} [nowMs]
 */
export function nflScoreboardNeedsFastPoll(games, nowMs = Date.now()) {
  const list = Array.isArray(games) ? games : [];
  return list.some((g) => {
    if (classifyNflGamePhase(g, nowMs) === "live") return true;
    const t = Number(g.tipoffMs);
    return Number.isFinite(t) && Math.abs(t - nowMs) <= FAST_POLL_WINDOW_MS;
  });
}

/**
 * Home strip rows: live first (matchup + score + quarter), then upcoming (matchup + time + channel).
 * @param {Array<Record<string, unknown>>} games
 * @param {{ nowMs?: number, limit?: number }} [opts]
 */
export function buildNflHomeScoreRows(games, opts = {}) {
  const nowMs = opts.nowMs ?? Date.now();
  const limit = opts.limit ?? HOME_SCORE_LIMIT;
  const list = Array.isArray(games) ? games.filter((g) => g && (g.awayAbbr || g.homeAbbr)) : [];
  const live = [];
  const pre = [];
  const fin = [];
  for (const g of list) {
    const phase = classifyNflGamePhase(g, nowMs);
    if (phase === "live") live.push(g);
    else if (phase === "final") fin.push(g);
    else pre.push(g);
  }
  pre.sort((a, b) => Number(a.tipoffMs || 0) - Number(b.tipoffMs || 0));
  live.sort((a, b) => Number(a.tipoffMs || 0) - Number(b.tipoffMs || 0));
  fin.sort((a, b) => Number(b.tipoffMs || 0) - Number(a.tipoffMs || 0));

  const picked = [...live, ...pre].slice(0, limit);
  const pool = picked.length ? picked : fin.slice(0, Math.min(4, limit));

  return pool.map((g) => {
    const phase = classifyNflGamePhase(g, nowMs);
    const away = String(g.awayAbbr || "AWAY");
    const home = String(g.homeAbbr || "HOME");
    const awayScore = Number.isFinite(Number(g.awayScore)) ? Number(g.awayScore) : null;
    const homeScore = Number.isFinite(Number(g.homeScore)) ? Number(g.homeScore) : null;
    const hasScore = awayScore != null && homeScore != null;
    let matchup = `${away} @ ${home}`;
    let meta = formatNflPregameMeta(g);
    if (phase === "live") {
      matchup = hasScore ? `${away} ${awayScore}–${homeScore} ${home}` : matchup;
      meta = formatNflLiveClockLine(g);
    } else if (phase === "final") {
      matchup = hasScore ? `${away} ${awayScore}–${homeScore} ${home}` : matchup;
      meta = "Final";
    }
    return {
      key: String(g.providerGameId || matchup),
      phase,
      matchup,
      meta,
      awayAbbr: away,
      homeAbbr: home,
      question: `${away} @ ${home} — side, total, or pass?`,
    };
  });
}
