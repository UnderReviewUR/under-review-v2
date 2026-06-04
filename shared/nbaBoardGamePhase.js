/**
 * Browser-safe NBA board game phase helpers (no api/ imports).
 */

/** Box score numbers present on the board row (server-trust gate for live/halftime reads). */
export function nbaGameHasVerifiedBoxScore(game) {
  if (!game || typeof game !== "object") return false;
  const hs = game.homeTeam?.score;
  const vs = game.awayTeam?.score;
  if (hs == null || vs == null) return false;
  return Number.isFinite(Number(hs)) && Number.isFinite(Number(vs));
}

/**
 * Classify game phase from API-shaped rows only (no inference from user text).
 * Returns: pregame | live | halftime | final | unknown
 */
export function classifyNbaBoardGamePhase(game) {
  if (!game || typeof game !== "object") return "unknown";
  const state = String(game.state || "").toLowerCase();
  const statusRaw = String(game.status || "");
  const statusLower = statusRaw.toLowerCase();

  if (state === "post" || statusLower.includes("final")) return "final";

  if (state === "pre") return "pregame";

  if (state === "in") {
    if (!nbaGameHasVerifiedBoxScore(game)) return "unknown";

    if (/\bhalftime\b/i.test(statusRaw) || /\bhalf\s*time\b/i.test(statusLower)) {
      return "halftime";
    }

    const period = Number(game.period);
    if (Number.isFinite(period) && period >= 1) {
      return "live";
    }

    return "live";
  }

  return "unknown";
}
