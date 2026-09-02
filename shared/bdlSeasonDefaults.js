/**
 * BallDontLie season year defaults for NFL and La Liga.
 * NFL: season year = calendar year of fall kickoff (Jan–Feb still prior year).
 * La Liga: season param = European campaign start year (Aug–Jul).
 */

/**
 * @param {Date} [now]
 * @returns {number}
 */
export function inferNflSeasonYear(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  return m >= 3 ? y : y - 1;
}

/**
 * @param {Date} [now]
 * @returns {number}
 */
export function inferLaligaSeasonStartYear(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  return m >= 8 ? y : y - 1;
}

/** Human label for logs / prompts (e.g. "2025-26"). */
export function formatLaligaSeasonLabel(startYear) {
  const y = Number(startYear);
  if (!Number.isFinite(y)) return "";
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}
