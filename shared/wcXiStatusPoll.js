import { resolveWcXiStatus } from "./wcXiStatus.js";

/**
 * @param {Array<{ id?: string | number, xiStatus?: string, lineupConfirmed?: boolean, lastUpdated?: number }>} matches
 * @returns {Map<string, string>}
 */
export function buildWcXiStatusMap(matches) {
  const map = new Map();
  const rows = Array.isArray(matches) ? matches : [];
  for (const m of rows) {
    const id = m?.id != null ? String(m.id).trim() : "";
    if (!id) continue;
    map.set(id, resolveWcXiStatus(m));
  }
  return map;
}

/**
 * @param {Map<string, string> | null | undefined} prevMap
 * @param {Array<Record<string, unknown>>} matches
 * @returns {Array<{ eventId: string, homeTeam: string, awayTeam: string }>}
 */
export function detectXiConfirmedTransitions(prevMap, matches) {
  const prev = prevMap instanceof Map ? prevMap : new Map();
  const nextMap = buildWcXiStatusMap(matches);
  /** @type {Array<{ eventId: string, homeTeam: string, awayTeam: string }>} */
  const out = [];
  for (const m of Array.isArray(matches) ? matches : []) {
    const eventId = m?.id != null ? String(m.id).trim() : "";
    if (!eventId) continue;
    const was = prev.get(eventId);
    const now = nextMap.get(eventId);
    if (was === "pending" && now === "confirmed") {
      out.push({
        eventId,
        homeTeam: String(m.homeTeam || "").trim(),
        awayTeam: String(m.awayTeam || "").trim(),
      });
    }
  }
  return out;
}
