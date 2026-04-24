/**
 * Single authority for ballgame start instants (NBA/MLB) and UTC calendar tokens
 * used in dedupe keys. Consumers: eventValidity, liveSnapshotFilters, normalize, homeEventDedup.
 */

/**
 * @param {unknown} value
 * @returns {number} unix ms or NaN
 */
export function parseEventStartMs(value) {
  if (Number.isFinite(value)) return Number(value);
  const ms = Date.parse(String(value || ""));
  return Number.isNaN(ms) ? NaN : ms;
}

/**
 * BallDontLie primary: startTimeUtc when startTimeSource is bdl_start_time; else first parseable UTC field.
 * @param {object|null|undefined} game
 * @returns {number}
 */
export function canonicalNbaStartUtcMs(game) {
  if (!game || typeof game !== "object") return NaN;
  const src = String(game.startTimeSource || "").toLowerCase();
  const primary = String(game.startTimeUtc || "").trim();
  if (primary && (src === "bdl_start_time" || src === "")) {
    const ms = Date.parse(primary);
    if (!Number.isNaN(ms)) return ms;
  }
  return parseEventStartMs(
    game.startTimeUtc || game.date || game.commenceTime || game.commenceDate,
  );
}

/**
 * @param {object|null|undefined} game
 * @returns {number}
 */
export function canonicalMlbStartUtcMs(game) {
  if (!game || typeof game !== "object") return NaN;
  return parseEventStartMs(
    game.date || game.startTime || game.commenceTime || game.startTimeUtc || game.commenceDate,
  );
}

/**
 * @param {number} ms
 * @returns {string} YYYY-MM-DD in UTC, or "" if not finite
 */
export function utcCalendarDateKeyFromMs(ms) {
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Stable calendar fragment for NBA fallback keys when no numeric game id exists.
 * @param {object|null|undefined} game
 * @returns {string}
 */
export function nbaDedupeCalendarToken(game) {
  const ms = canonicalNbaStartUtcMs(game);
  if (Number.isFinite(ms)) return utcCalendarDateKeyFromMs(ms);
  return String(game?.startTimeUtc || game?.date || game?.commence_time || "")
    .trim()
    .slice(0, 10);
}

/**
 * @param {object|null|undefined} game
 * @returns {string}
 */
export function mlbDedupeCalendarToken(game) {
  const ms = canonicalMlbStartUtcMs(game);
  if (Number.isFinite(ms)) return utcCalendarDateKeyFromMs(ms);
  return String(game?.date || game?.startTimeUtc || "").trim().slice(0, 10);
}
