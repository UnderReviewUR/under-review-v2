/**
 * NBA prop sanity: implausible under vs season average (shared by ur-take + output QA).
 * Avoid importing api/ur-take.js from QA modules (circular dependency).
 */

/**
 * @param {string} question
 * @returns {{ market: string | null, line: number | null }}
 */
export function parseNbaRequestedMarket(question) {
  const q = String(question || "").toLowerCase();
  const lineMatch = q.match(/\b(\d{1,3}(?:\.\d+)?)\b/);
  const requestedLine = lineMatch ? Number(lineMatch[1]) : null;
  let market = null;
  if (/\bpra\b|\bpoints?\s+rebounds?\s+assists?\b/.test(q)) market = "points rebounds assists";
  else if (/\bassists?\b/.test(q)) market = "assists";
  else if (/\brebounds?\b/.test(q)) market = "rebounds";
  else if (/\bpoints?\b/.test(q)) market = "points";
  return { market, line: Number.isFinite(requestedLine) ? requestedLine : null };
}

/**
 * @param {string} question
 * @returns {"under" | "over" | null}
 */
export function inferNbaPropDirection(question) {
  const q = String(question || "").toLowerCase();
  const hasUnder = /\bunder\b/.test(q);
  const hasOver = /\bover\b/.test(q);
  if (hasUnder && !hasOver) return "under";
  if (hasOver && !hasUnder) return "over";
  return null;
}

/**
 * Match question text to a playerStats row (last-name overlap, same spirit as assist QA).
 * @param {string} question
 * @param {object[]} playerStats
 * @returns {object | null}
 */
export function findFirstPlayerStatRowForQuestion(question, playerStats) {
  if (!Array.isArray(playerStats) || playerStats.length === 0) return null;
  const ql = String(question || "").toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const row of playerStats) {
    const name = String(row?.name || "").trim();
    if (name.length < 4) continue;
    const ln = name.toLowerCase();
    const parts = ln.split(/\s+/).filter(Boolean);
    const last = parts[parts.length - 1];
    let score = 0;
    if (ln && ql.includes(ln)) score = 100;
    else if (last && last.length >= 4 && new RegExp(`\\b${escapeReg(last)}\\b`, "i").test(ql)) score = last.length;
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return bestScore > 0 ? best : null;
}

function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const UNDER_SEASON_RATIO = 0.6;

/**
 * @param {{ market: string | null, line: number | null }} requestedMarket
 * @param {"under"|"over"|null} direction
 * @param {object|null} playerRow
 * @returns {{ code: string, stat: string } | null}
 */
export function nbaUnderVsSeasonAverageImplausible(requestedMarket, direction, playerRow) {
  if (!requestedMarket || direction !== "under" || !playerRow) return null;
  const line = requestedMarket.line;
  if (!Number.isFinite(line)) return null;
  const m = String(requestedMarket.market || "").toLowerCase();
  /** PRA lines need dedicated logic — do not treat as pure RPG / PPG. */
  if (m.includes("points rebounds assists")) return null;

  if ((m.includes("rebound") || m === "rebounds") && playerRow.reb != null) {
    const reb = Number(playerRow.reb);
    if (Number.isFinite(reb) && reb > 0 && line < reb * UNDER_SEASON_RATIO) {
      return { code: "extreme_rebound_under_vs_average", stat: "reb" };
    }
  }

  if (
    (m.includes("point") || m === "points") &&
    !m.includes("rebound") &&
    playerRow.pts != null
  ) {
    const pts = Number(playerRow.pts);
    if (Number.isFinite(pts) && pts > 0 && line < pts * UNDER_SEASON_RATIO) {
      return { code: "extreme_points_under_vs_average", stat: "pts" };
    }
  }

  if ((m.includes("assist") || m === "assists") && playerRow.ast != null) {
    const ast = Number(playerRow.ast);
    if (Number.isFinite(ast) && ast > 0 && line < ast * UNDER_SEASON_RATIO) {
      return { code: "extreme_assist_under_vs_average", stat: "ast" };
    }
  }

  return null;
}
