import { getNbaFinalsSeriesState, isNbaFinalsGame } from "../../shared/nbaFinalsUtils.js";

/**
 * @param {object | null | undefined} game
 */
function formatQuarterClock(game) {
  const period = Number(game?.period);
  const clock = String(game?.clock || "").trim();
  const status = String(game?.status || "").trim();

  if (Number.isFinite(period) && period >= 1) {
    const q = `Q${period}`;
    if (clock) return `${q} · ${clock} left`;
    return q;
  }

  const ht = /\bhalftime\b/i.test(status);
  if (ht) return "Halftime";

  const m = status.match(/\bQ(\d)\b[^0-9]*(\d{1,2}:\d{2})/i);
  if (m) return `Q${m[1]} · ${m[2]} left`;

  if (/\blive\b/i.test(status)) return status.slice(0, 40);
  return "";
}

/**
 * Live/session label for NBA UI (banner, UR Take context bar).
 * @param {object | null | undefined} game
 * @param {Array<Record<string, unknown>>} [playoffSeries]
 */
export function formatNbaLiveContextLabel(game, playoffSeries = []) {
  if (!game || typeof game !== "object") return null;
  const state = String(game.state || "").toLowerCase();
  if (state !== "in") return null;

  const clockPart = formatQuarterClock(game);
  const away = String(game?.awayTeam?.abbr || "").toUpperCase();
  const home = String(game?.homeTeam?.abbr || "").toUpperCase();

  let seriesPart = null;
  if (isNbaFinalsGame(game) && Array.isArray(playoffSeries)) {
    const st = getNbaFinalsSeriesState({
      awayAbbr: away,
      homeAbbr: home,
      game,
      playoffSeries,
    });
    if (st?.seriesScoreLabel) seriesPart = st.seriesScoreLabel;
  }

  const scorePart =
    game?.awayTeam?.score != null && game?.homeTeam?.score != null
      ? `${away} ${game.awayTeam.score}–${game.homeTeam.score} ${home}`
      : null;

  const parts = [clockPart, scorePart, seriesPart].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Live";
}

/**
 * @param {Array<Record<string, unknown>>} games
 * @param {Array<Record<string, unknown>>} [playoffSeries]
 */
export function pickNbaLiveGameForContext(games, playoffSeries = []) {
  const rows = Array.isArray(games) ? games : [];
  const live = rows.filter((g) => String(g?.state || "").toLowerCase() === "in");
  if (!live.length) return null;
  const finals = live.find((g) => isNbaFinalsGame(g));
  return finals || live[0];
}

/**
 * @param {Array<Record<string, unknown>>} games
 */
export function nbaSlateHasFinalsLiveGame(games) {
  return (Array.isArray(games) ? games : []).some(
    (g) => String(g?.state || "").toLowerCase() === "in" && isNbaFinalsGame(g),
  );
}

/**
 * Poll interval when Finals game is live (15–20s target).
 * @param {Array<Record<string, unknown>>} games
 * @param {number} [defaultLiveMs]
 * @param {number} [defaultIdleMs]
 */
export function nbaBoardPollIntervalMs(
  games,
  defaultLiveMs = 30_000,
  defaultIdleMs = 60_000,
) {
  if (nbaSlateHasFinalsLiveGame(games)) return 18_000;
  const anyLive = (Array.isArray(games) ? games : []).some(
    (g) => String(g?.state || "").toLowerCase() === "in",
  );
  return anyLive ? defaultLiveMs : defaultIdleMs;
}
