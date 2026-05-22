/**
 * Free-tier "last lean" return hook — localStorage only, no backend.
 */

export const UR_LAST_LEAN_KEY = "ur_last_lean";
export const UR_LAST_LEAN_TTL_MS = 86400000;

/**
 * @typedef {object} UrLastLeanRecord
 * @property {string} lean
 * @property {string} sport
 * @property {string} matchup
 * @property {string} question
 * @property {number} ts
 */

/**
 * @param {string} sportHint
 * @returns {string}
 */
export function formatLastLeanSportLabel(sportHint) {
  const raw = String(sportHint || "").trim();
  if (!raw || raw === "generic") return "";
  const map = {
    nba: "NBA",
    nfl: "NFL",
    mlb: "MLB",
    tennis: "Tennis",
    tennis_wta_profile: "Tennis",
    golf: "Golf",
    f1: "F1",
    worldcup: "World Cup",
  };
  const key = raw.toLowerCase();
  if (map[key]) return map[key];
  if (/^[A-Z]{2,6}$/.test(raw)) return raw.toUpperCase();
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * @param {object} params
 * @param {object | null | undefined} params.matchupContext
 * @param {string | null | undefined} params.sportHint
 * @param {string | null | undefined} params.question
 * @param {Array<{ awayTeam?: { abbr?: string }, homeTeam?: { abbr?: string } }> | null | undefined} params.nbaTodaysGames
 * @param {string | null | undefined} params.nbaFocusGameKey
 * @returns {string}
 */
export function resolveMatchupLabelForLastLean({
  matchupContext,
  sportHint,
  question,
  nbaTodaysGames,
  nbaFocusGameKey,
}) {
  const mx = matchupContext && typeof matchupContext === "object" ? matchupContext : null;
  if (mx) {
    const away =
      mx.awayAbbr ||
      mx.awayTeam?.abbr ||
      mx.raw?.awayAbbr ||
      mx.raw?.awayTeam?.abbr ||
      "";
    const home =
      mx.homeAbbr ||
      mx.homeTeam?.abbr ||
      mx.raw?.homeAbbr ||
      mx.raw?.homeTeam?.abbr ||
      "";
    const a = String(away || "").toUpperCase();
    const h = String(home || "").toUpperCase();
    if (a && h) return `${a} @ ${h}`;
    const title = String(mx.title || mx.label || "").trim();
    if (title) return title;
  }

  if (String(sportHint || "").toLowerCase() === "nba") {
    const games = Array.isArray(nbaTodaysGames) ? nbaTodaysGames : [];
    const keyFn = (g) => {
      const a = String(g?.awayTeam?.abbr || "").toUpperCase();
      const h = String(g?.homeTeam?.abbr || "").toUpperCase();
      return a && h ? `${a}@${h}` : "";
    };
    if (nbaFocusGameKey) {
      const hit = games.find((g) => keyFn(g) === String(nbaFocusGameKey).toUpperCase());
      if (hit) {
        const a = String(hit.awayTeam?.abbr || "").toUpperCase();
        const h = String(hit.homeTeam?.abbr || "").toUpperCase();
        if (a && h) return `${a} @ ${h}`;
      }
    }
    const q = String(question || "").toUpperCase();
    for (const g of games) {
      const a = String(g?.awayTeam?.abbr || "").toUpperCase();
      const h = String(g?.homeTeam?.abbr || "").toUpperCase();
      if (!a || !h) continue;
      if (q.includes(a) && q.includes(h)) return `${a} @ ${h}`;
    }
    if (games.length === 1) {
      const g = games[0];
      const a = String(g?.awayTeam?.abbr || "").toUpperCase();
      const h = String(g?.homeTeam?.abbr || "").toUpperCase();
      if (a && h) return `${a} @ ${h}`;
    }
  }

  return "";
}

/**
 * @param {number} ts
 * @returns {string}
 */
export function formatLastLeanTimeAgo(ts) {
  const t = Number(ts);
  if (!Number.isFinite(t) || t <= 0) return "";
  const diff = Math.max(0, Date.now() - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * @param {UrLastLeanRecord | null | undefined} record
 * @returns {UrLastLeanRecord | null}
 */
export function readUrLastLean(record = null) {
  try {
    const raw =
      record != null
        ? record
        : typeof localStorage !== "undefined"
          ? JSON.parse(localStorage.getItem(UR_LAST_LEAN_KEY) || "null")
          : null;
    if (!raw || typeof raw !== "object") return null;
    const lean = String(raw.lean || "").trim();
    const ts = Number(raw.ts);
    if (!lean || !Number.isFinite(ts)) return null;
    if (Date.now() - ts >= UR_LAST_LEAN_TTL_MS) {
      if (record == null && typeof localStorage !== "undefined") {
        localStorage.removeItem(UR_LAST_LEAN_KEY);
      }
      return null;
    }
    return {
      lean: lean.slice(0, 120),
      sport: String(raw.sport || "").trim(),
      matchup: String(raw.matchup || "").trim(),
      question: String(raw.question || "").trim(),
      ts,
    };
  } catch {
    return null;
  }
}

/**
 * Persist last lean for free-tier home return card.
 * @param {object} params
 * @param {string} params.lean
 * @param {string} [params.sport]
 * @param {string} [params.matchup]
 * @param {string} [params.question]
 * @returns {boolean}
 */
export function saveUrLastLean({ lean, sport, matchup, question }) {
  const leanLine = String(lean || "").trim();
  if (!leanLine) return false;
  try {
    const payload = {
      lean: leanLine.slice(0, 120),
      sport: String(sport || "").trim().slice(0, 32),
      matchup: String(matchup || "").trim().slice(0, 48),
      question: String(question || "").trim().slice(0, 400),
      ts: Date.now(),
    };
    localStorage.setItem(UR_LAST_LEAN_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}
