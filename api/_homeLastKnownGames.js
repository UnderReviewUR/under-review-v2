import { getDurableJson, setDurableJson } from "./_durableStore.js";

export const HOME_LAST_KNOWN_NBA_KEY = "home_last_known_nba_games";
export const HOME_LAST_KNOWN_MLB_KEY = "home_last_known_mlb_games";

const TWO_HOURS_SEC = 2 * 60 * 60;

/**
 * @param {object[]} games
 */
export async function persistLastKnownHomeNbaGames(games) {
  if (!Array.isArray(games) || games.length === 0) return;
  const payload = { savedAt: new Date().toISOString(), games };
  await setDurableJson(HOME_LAST_KNOWN_NBA_KEY, payload, { ttlSeconds: TWO_HOURS_SEC });
}

/** @returns {{ games: object[], lastUpdated: string|null }|null} */
export async function recoverLastKnownHomeNbaGames() {
  const row = await getDurableJson(HOME_LAST_KNOWN_NBA_KEY);
  if (!row || typeof row !== "object" || !Array.isArray(row.games) || row.games.length === 0) {
    return null;
  }
  return { games: row.games, lastUpdated: row.savedAt ? String(row.savedAt) : null };
}

/**
 * @param {object[]} games
 */
export async function persistLastKnownHomeMlbGames(games) {
  if (!Array.isArray(games) || games.length === 0) return;
  const payload = { savedAt: new Date().toISOString(), games };
  await setDurableJson(HOME_LAST_KNOWN_MLB_KEY, payload, { ttlSeconds: TWO_HOURS_SEC });
}

/** @returns {{ games: object[], lastUpdated: string|null }|null} */
export async function recoverLastKnownHomeMlbGames() {
  const row = await getDurableJson(HOME_LAST_KNOWN_MLB_KEY);
  if (!row || typeof row !== "object" || !Array.isArray(row.games) || row.games.length === 0) {
    return null;
  }
  return { games: row.games, lastUpdated: row.savedAt ? String(row.savedAt) : null };
}
