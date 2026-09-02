/**
 * La Liga board date windows — wide enough for early-season results + upcoming fixtures.
 */

/**
 * @param {Date} [now]
 * @param {{ pastDays?: number, futureDays?: number }} [opts]
 * @returns {string[]}
 */
export function laligaBoardDateWindow(now = new Date(), opts = {}) {
  const past = Math.max(1, Number(opts.pastDays) || 21);
  const future = Math.max(1, Number(opts.futureDays) || 14);
  /** @type {string[]} */
  const out = [];
  for (let i = -past; i < future; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * @param {Array<{ startTime?: string|null }>} matches
 * @param {string[]} dates
 */
export function filterLaligaMatchesByDates(matches, dates) {
  if (!Array.isArray(matches) || !dates?.length) return matches || [];
  const set = new Set(dates);
  return matches.filter((m) => {
    const day = String(m?.startTime || "").slice(0, 10);
    return set.has(day);
  });
}

/**
 * @param {Array<{ startTime?: string|null }>} matches
 */
export function sortLaligaBoardMatches(matches) {
  return [...(matches || [])].sort((a, b) => {
    const ta = Date.parse(String(a?.startTime || "")) || 0;
    const tb = Date.parse(String(b?.startTime || "")) || 0;
    return ta - tb;
  });
}
