/**
 * Minimal client-side saved takes (process / learning). No server sync in v1.
 */

const KEY = "ur_saved_takes_v1";
const MAX = 24;

/**
 * @typedef {{ id: string, savedAt: number, sport?: string, headlineSnippet: string, takeId?: string, msgId?: string }} SavedTake
 */

/** @returns {SavedTake[]} */
export function readSavedTakes() {
  try {
    const raw = localStorage.getItem(KEY) || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => x && typeof x.id === "string") : [];
  } catch {
    return [];
  }
}

/** @param {SavedTake[]} list */
function writeAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* ignore */
  }
}

/**
 * @param {Omit<SavedTake, "id" | "savedAt"> & { id?: string }} partial
 * @returns {SavedTake | null}
 */
export function pushSavedTake(partial) {
  const headlineSnippet = String(partial.headlineSnippet || "").trim().slice(0, 120);
  if (!headlineSnippet) return null;
  const id =
    partial.id ||
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `sv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  const entry = {
    id,
    savedAt: Date.now(),
    sport: partial.sport ? String(partial.sport).slice(0, 32) : undefined,
    headlineSnippet,
    takeId: partial.takeId ? String(partial.takeId).slice(0, 64) : undefined,
    msgId: partial.msgId ? String(partial.msgId).slice(0, 64) : undefined,
  };
  const prev = readSavedTakes().filter((t) => t.id !== entry.id);
  writeAll([entry, ...prev]);
  return entry;
}

/** @param {string} id */
export function removeSavedTake(id) {
  const next = readSavedTakes().filter((t) => t.id !== id);
  writeAll(next);
}
