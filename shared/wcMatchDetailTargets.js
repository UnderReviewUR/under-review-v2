/**
 * World Cup match-detail scrape target selection (next 3 upcoming + all live).
 */

const LIVE_STATUSES = new Set(["live", "ht", "1h", "2h", "in_progress"]);
const UPCOMING_STATUSES = new Set(["ns", "scheduled", "not started", "upcoming"]);

/**
 * @param {string} status
 */
export function isWcMatchLiveStatus(status) {
  return LIVE_STATUSES.has(String(status || "").toLowerCase());
}

/**
 * @param {string} status
 */
export function isWcMatchUpcomingStatus(status) {
  return UPCOMING_STATUSES.has(String(status || "").toLowerCase());
}

/**
 * @param {string} status
 */
export function isWcMatchFtStatus(status) {
  return String(status || "").toLowerCase() === "ft";
}

/**
 * @typedef {Object} WcMatchDetailScrapeTarget
 * @property {string} eventId
 * @property {number} commenceTs
 * @property {string} status
 * @property {string} homeTeam
 * @property {string} awayTeam
 * @property {string} date
 * @property {"ramp" | "live" | "finalize"} scrapeMode
 */

/**
 * @param {Array<Record<string, unknown>>} matches
 * @param {number} [nowMs]
 * @param {{ finalizedEventIds?: Set<string> }} [opts]
 * @returns {WcMatchDetailScrapeTarget[]}
 */
export function selectWcMatchDetailTargets(matches, nowMs = Date.now(), opts = {}) {
  const finalized = opts.finalizedEventIds || new Set();
  /** @type {Map<string, WcMatchDetailScrapeTarget>} */
  const byId = new Map();
  const rows = Array.isArray(matches) ? matches : [];

  for (const m of rows) {
    const eventId = String(m?.id || "").trim();
    if (!eventId) continue;
    const status = String(m?.status || "").toLowerCase();
    const commenceTs = Number(m?.commenceTs);
    const homeTeam = String(m?.homeTeam || "").toUpperCase();
    const awayTeam = String(m?.awayTeam || "").toUpperCase();
    const date = String(m?.date || "").slice(0, 10);
    const base = {
      eventId,
      commenceTs: Number.isFinite(commenceTs) ? commenceTs : nowMs + 86400000,
      status,
      homeTeam,
      awayTeam,
      date,
    };

    if (isWcMatchLiveStatus(status)) {
      byId.set(eventId, { ...base, scrapeMode: "live" });
      continue;
    }

    if (isWcMatchFtStatus(status) && !finalized.has(eventId)) {
      byId.set(eventId, { ...base, scrapeMode: "finalize" });
    }
  }

  const upcoming = rows
    .filter((m) => {
      const id = String(m?.id || "").trim();
      if (!id || byId.has(id)) return false;
      const status = String(m?.status || "").toLowerCase();
      if (!isWcMatchUpcomingStatus(status)) return false;
      const ts = Number(m?.commenceTs);
      return Number.isFinite(ts) && ts > nowMs;
    })
    .sort((a, b) => Number(a.commenceTs) - Number(b.commenceTs))
    .slice(0, 3);

  for (const m of upcoming) {
    const eventId = String(m.id);
    byId.set(eventId, {
      eventId,
      commenceTs: Number(m.commenceTs),
      status: String(m.status || "NS").toLowerCase(),
      homeTeam: String(m.homeTeam || "").toUpperCase(),
      awayTeam: String(m.awayTeam || "").toUpperCase(),
      date: String(m.date || "").slice(0, 10),
      scrapeMode: "ramp",
    });
  }

  return [...byId.values()];
}

/**
 * Same selection as match detail — used to narrow wc_match_odds polling.
 * @param {Array<Record<string, unknown>>} matches
 * @param {number} [nowMs]
 * @returns {Array<{ eventId: string, commenceTs: number, date: string, homeTeam: string, awayTeam: string }>}
 */
export function selectWcMatchOddsTargets(matches, nowMs = Date.now()) {
  return selectWcMatchDetailTargets(matches, nowMs)
    .filter((t) => t.scrapeMode === "ramp" || t.scrapeMode === "live")
    .map(({ eventId, commenceTs, date, homeTeam, awayTeam }) => ({
      eventId,
      commenceTs,
      date,
      homeTeam,
      awayTeam,
    }));
}
