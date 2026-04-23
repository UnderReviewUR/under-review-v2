/**
 * Live Snapshot inclusion: live games, starts within 2h, next major (F1/NFL handled in plan).
 */

export const LIVE_SNAPSHOT_PRE_WINDOW_MS = 2 * 60 * 60 * 1000;
export const MAX_LIVE_SNAPSHOT_TILES = 5;

function parseMs(value) {
  if (Number.isFinite(value)) return Number(value);
  const ms = Date.parse(String(value || ""));
  return Number.isNaN(ms) ? NaN : ms;
}

export function getNbaMlbStartMs(game) {
  if (!game || typeof game !== "object") return NaN;
  return parseMs(
    game.startTimeUtc || game.date || game.startTime || game.commenceTime || game.commenceDate,
  );
}

/** NBA/MLB: live, or pre/scheduled with kickoff/first pitch within the snapshot window. */
export function isNbaMlbIncludedInLiveSnapshot(game, nowMs = Date.now()) {
  if (!game || typeof game !== "object") return false;
  const state = String(game.state || "").toLowerCase();
  if (state === "in" || state === "live") return true;
  if (state === "pre" || state === "scheduled") {
    const startMs = getNbaMlbStartMs(game);
    if (!Number.isFinite(startMs)) return false;
    const delta = startMs - nowMs;
    return delta >= 0 && delta <= LIVE_SNAPSHOT_PRE_WINDOW_MS;
  }
  return false;
}

export function filterAndOrderNbaMlbGames(games, nowMs = Date.now()) {
  const eligible = (games || []).filter((g) => isNbaMlbIncludedInLiveSnapshot(g, nowMs));
  const live = eligible.filter((g) => {
    const s = String(g.state || "").toLowerCase();
    return s === "in" || s === "live";
  });
  const pre = eligible
    .filter((g) => {
      const s = String(g.state || "").toLowerCase();
      return s === "pre" || s === "scheduled";
    })
    .sort((a, b) => getNbaMlbStartMs(a) - getNbaMlbStartMs(b));
  return [...live, ...pre];
}

/**
 * Tennis: live matches, or upcoming with a real start time within 2h (drops placeholder / unknown commence).
 */
export function isTennisIncludedInLiveSnapshot(match, nowMs = Date.now()) {
  if (!match || typeof match !== "object") return false;
  if (String(match?.raw?.live || "0") === "1") return true;
  const ts = match.commenceTs;
  if (!Number.isFinite(ts)) return false;
  if (ts >= Number.MAX_SAFE_INTEGER / 2) return false;
  const delta = ts - nowMs;
  return delta >= 0 && delta <= LIVE_SNAPSHOT_PRE_WINDOW_MS;
}

export function filterTennisMatchesForSnapshot(matches, nowMs = Date.now()) {
  return (matches || []).filter((m) => isTennisIncludedInLiveSnapshot(m, nowMs));
}
