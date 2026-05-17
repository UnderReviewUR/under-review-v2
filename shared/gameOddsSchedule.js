/** Hours before tip-off when we capture a spread snapshot. */
export const GAME_ODDS_REFRESH_OFFSETS_HOURS = [12, 6, 3, 1];

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * @param {string|number|Date} commenceTimeUtc
 * @param {Date} [now]
 */
export function tipMs(commenceTimeUtc, now = new Date()) {
  const t = Date.parse(String(commenceTimeUtc || ""));
  return Number.isFinite(t) ? t : NaN;
}

/**
 * Which refresh offsets are due now (within window) and not yet captured.
 * @param {string} commenceTimeUtc
 * @param {number[]} capturedOffsets — offsetHours already stored
 * @param {Date} [now]
 * @returns {number[]}
 */
export function computeDueRefreshOffsets(commenceTimeUtc, capturedOffsets = [], now = new Date()) {
  const tip = tipMs(commenceTimeUtc, now);
  if (!Number.isFinite(tip)) return [];

  const nowMs = now.getTime();
  if (nowMs >= tip) return [];

  const captured = new Set(
    (Array.isArray(capturedOffsets) ? capturedOffsets : [])
      .map((h) => Number(h))
      .filter((h) => Number.isFinite(h)),
  );

  const due = [];
  for (const offsetHours of GAME_ODDS_REFRESH_OFFSETS_HOURS) {
    if (captured.has(offsetHours)) continue;
    const targetMs = tip - offsetHours * MS_PER_HOUR;
    const windowMs = 20 * 60 * 1000;
    if (nowMs >= targetMs - windowMs && nowMs < tip) {
      due.push(offsetHours);
    }
  }
  return due;
}

/**
 * @param {"nba"|"mlb"} sport
 * @param {string} gameKey — e.g. "CLE @ DET"
 * @param {string} commenceTimeUtc
 */
export function buildGameOddsKvKey(sport, gameKey, commenceTimeUtc) {
  const sk = String(sport || "nba").toLowerCase();
  const gk = String(gameKey || "")
    .replace(/[^A-Za-z0-9@ ]+/g, "")
    .trim()
    .replace(/\s+/g, "_");
  const day = String(commenceTimeUtc || "").slice(0, 10);
  return `game_odds_v1:${sk}:${gk}:${day}`;
}
