/**
 * NBA prop sanity: implausible under vs season average (shared by ur-take + output QA).
 * Avoid importing api/ur-take.js from QA modules (circular dependency).
 */

import { isNbaRecentGameZeroStatDnpLike } from "../shared/nbaUrTakeSlim.js";

/** Recent average must be at least this far below the line to contradict an over lean. */
export const NBA_RECENT_FORM_OVER_GAP = 0.1;

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
  return inferPropDirectionFromText(question);
}

/**
 * Infer over/under from call text, questions, or play lines.
 * @param {string} text
 * @returns {"under" | "over" | null}
 */
export function inferPropDirectionFromText(text) {
  const q = String(text || "").toLowerCase();
  const hasUnder =
    /\bunder\b/.test(q) ||
    /\bfade\s+(?:the\s+)?over\b/.test(q) ||
    /\bpass\s+on\s+(?:the\s+)?over\b/.test(q);
  const hasOver =
    /\bover\b/.test(q) ||
    /\b(?:lean|take|play|back)\s+(?:the\s+)?over\b/.test(q) ||
    /\b(?:lean|take|play|back)\s+over\b/.test(q);
  if (hasUnder && !hasOver) return "under";
  if (hasOver && !hasUnder) return "over";
  return null;
}

/**
 * @param {string} text
 * @returns {{ market: string | null, line: number | null }}
 */
export function extractNbaPropLineFromText(text) {
  const t = String(text || "");
  const overMatch = t.match(
    /\bover\s+(\d{1,3}(?:\.\d+)?)\s+(points?|rebounds?|assists?|pra|pts|reb|ast)\b/i,
  );
  if (overMatch) {
    const line = Number(overMatch[1]);
    const unit = String(overMatch[2] || "").toLowerCase();
    let market = null;
    if (/pra/.test(unit)) market = "points rebounds assists";
    else if (/reb/.test(unit)) market = "rebounds";
    else if (/ast|assist/.test(unit)) market = "assists";
    else market = "points";
    return { market, line: Number.isFinite(line) ? line : null };
  }

  const underMatch = t.match(
    /\bunder\s+(\d{1,3}(?:\.\d+)?)\s+(points?|rebounds?|assists?|pra|pts|reb|ast)\b/i,
  );
  if (underMatch) {
    const line = Number(underMatch[1]);
    const unit = String(underMatch[2] || "").toLowerCase();
    let market = null;
    if (/pra/.test(unit)) market = "points rebounds assists";
    else if (/reb/.test(unit)) market = "rebounds";
    else if (/ast|assist/.test(unit)) market = "assists";
    else market = "points";
    return { market, line: Number.isFinite(line) ? line : null };
  }

  return parseNbaRequestedMarket(t);
}

/**
 * @param {string} question
 * @param {string} [supplementalText]
 * @returns {{ market: string | null, line: number | null }}
 */
export function resolveNbaRequestedMarket(question, supplementalText = "") {
  const primary = parseNbaRequestedMarket(question);
  if (Number.isFinite(primary.line) && primary.market) return primary;
  const fromSupplement = extractNbaPropLineFromText(supplementalText);
  return {
    market: primary.market || fromSupplement.market,
    line: Number.isFinite(primary.line) ? primary.line : fromSupplement.line,
  };
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

function recentStatAvgFromGames(row, pick) {
  const rg = Array.isArray(row?.recentGames) ? row.recentGames : [];
  const vals = [];
  for (const g of rg.slice(0, 5)) {
    if (isNbaRecentGameZeroStatDnpLike(g)) continue;
    const v = pick(g);
    if (Number.isFinite(v)) vals.push(v);
  }
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Last-five average for the requested market (prefers precomputed ptsRecent / rebRecent / etc.).
 * @param {object|null} playerRow
 * @param {string|null} market
 * @returns {{ recentAvg: number, unit: string, stat: string } | null}
 */
export function getNbaRecentAverageForMarket(playerRow, market) {
  if (!playerRow || !market) return null;
  const m = String(market).toLowerCase();

  if (m.includes("points rebounds assists")) {
    if (Number.isFinite(Number(playerRow.praRecent))) {
      return { recentAvg: Number(playerRow.praRecent), unit: "PRA", stat: "pra" };
    }
    const avg = recentStatAvgFromGames(playerRow, (g) => {
      const p = Number(g?.pts);
      const r = Number(g?.reb);
      const a = Number(g?.ast);
      return Number.isFinite(p) && Number.isFinite(r) && Number.isFinite(a) ? p + r + a : NaN;
    });
    return avg != null ? { recentAvg: avg, unit: "PRA", stat: "pra" } : null;
  }

  if (m.includes("rebound")) {
    if (Number.isFinite(Number(playerRow.rebRecent))) {
      return { recentAvg: Number(playerRow.rebRecent), unit: "rebounds", stat: "reb" };
    }
    const avg = recentStatAvgFromGames(playerRow, (g) => Number(g?.reb));
    return avg != null ? { recentAvg: avg, unit: "rebounds", stat: "reb" } : null;
  }

  if (m.includes("assist")) {
    if (Number.isFinite(Number(playerRow.astRecent))) {
      return { recentAvg: Number(playerRow.astRecent), unit: "assists", stat: "ast" };
    }
    const avg = recentStatAvgFromGames(playerRow, (g) => Number(g?.ast));
    return avg != null ? { recentAvg: avg, unit: "assists", stat: "ast" } : null;
  }

  if (Number.isFinite(Number(playerRow.ptsRecent))) {
    return { recentAvg: Number(playerRow.ptsRecent), unit: "points", stat: "pts" };
  }
  const avg = recentStatAvgFromGames(playerRow, (g) => Number(g?.pts));
  return avg != null ? { recentAvg: avg, unit: "points", stat: "pts" } : null;
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

/**
 * True when last-five average is more than 10% below the prop line while direction is over.
 * @param {{ market: string | null, line: number | null }} requestedMarket
 * @param {"under"|"over"|null} direction
 * @param {object|null} playerRow
 * @returns {{ code: string, stat: string, unit: string, line: number, recentAvg: number, gapPct: number } | null}
 */
export function nbaOverVsRecentFormContradiction(requestedMarket, direction, playerRow) {
  if (!requestedMarket || direction !== "over" || !playerRow) return null;
  const line = requestedMarket.line;
  if (!Number.isFinite(line) || line <= 0 || !requestedMarket.market) return null;

  const recent = getNbaRecentAverageForMarket(playerRow, requestedMarket.market);
  if (!recent || !Number.isFinite(recent.recentAvg)) return null;

  const gapPct = (line - recent.recentAvg) / line;
  if (gapPct <= NBA_RECENT_FORM_OVER_GAP) return null;

  return {
    code: "over_vs_recent_form_contradiction",
    stat: recent.stat,
    unit: recent.unit,
    line,
    recentAvg: recent.recentAvg,
    gapPct,
  };
}

/**
 * Scan prose for explicit over recommendations that fight last-five form.
 * @param {string} text
 * @param {object[]} playerStats
 * @returns {Array<{ code: string, stat: string, unit: string, line: number, recentAvg: number, gapPct: number }>}
 */
export function scanNbaOverVsRecentFormContradictions(text, playerStats) {
  if (!Array.isArray(playerStats) || !playerStats.length) return [];
  const t = String(text || "");
  const hits = [];

  for (const row of playerStats) {
    const name = String(row?.name || "").trim();
    if (name.length < 4) continue;
    const last = name.split(/\s+/).pop();
    if (!last || !new RegExp(`\\b${escapeReg(last)}\\b`, "i").test(t)) continue;

    const patterns = [
      { re: /\bover\s+(\d+(?:\.\d+)?)\s+(points?|pts|rebounds?|reb|assists?|ast|pra)\b/gi, marketFromUnit: true },
      { re: /\b(?:lean|take|play|back)\s+(?:the\s+)?over\s+(\d+(?:\.\d+)?)\b/gi, marketFromUnit: false },
    ];

    for (const { re, marketFromUnit } of patterns) {
      let m;
      while ((m = re.exec(t))) {
        const line = Number(m[1]);
        if (!Number.isFinite(line)) continue;
        let market = "points";
        if (marketFromUnit) {
          const unit = String(m[2] || "").toLowerCase();
          if (/pra/.test(unit)) market = "points rebounds assists";
          else if (/reb|rebound/.test(unit)) market = "rebounds";
          else if (/ast|assist/.test(unit)) market = "assists";
        } else {
          const ctx = resolveNbaRequestedMarket(t.slice(Math.max(0, m.index - 40), m.index + 80));
          market = ctx.market || "points";
        }
        const hit = nbaOverVsRecentFormContradiction({ market, line }, "over", row);
        if (hit) hits.push(hit);
      }
    }
  }

  return hits;
}

function buildRecentFormContradictionCaveat(hit) {
  const pct = Math.round(hit.gapPct * 100);
  return `Conflicting signals: last-5 ${hit.unit} average (${hit.recentAvg.toFixed(1)}) sits ${pct}% below the ${hit.line} line — recent form fights a clean over lean.`.slice(
    0,
    150,
  );
}

/**
 * Replace a clean over call with a conflicting-signals read when recent form contradicts the line.
 * @param {object|null} structured
 * @param {{ question?: string, nbaContext?: { playerStats?: object[] } }} ctx
 * @returns {object|null}
 */
export function applyNbaPropRecentFormContradiction(structured, ctx = {}) {
  if (!structured || typeof structured !== "object") return structured;
  if (String(structured.sport || "").toLowerCase() !== "nba") return structured;
  if (structured.callType === "parlay") return structured;

  const playerStats = ctx.nbaContext?.playerStats;
  if (!Array.isArray(playerStats) || !playerStats.length) return structured;

  const callBlob = `${structured.call || ""} ${structured.edge || ""} ${structured.whyNow || ""}`;
  const direction =
    inferNbaPropDirection(ctx.question || "") || inferPropDirectionFromText(callBlob);
  if (direction !== "over") return structured;

  const requestedMarket = resolveNbaRequestedMarket(ctx.question || "", callBlob);
  if (!Number.isFinite(requestedMarket.line) || !requestedMarket.market) return structured;

  const playerRow =
    findFirstPlayerStatRowForQuestion(ctx.question || "", playerStats) ||
    findFirstPlayerStatRowForQuestion(callBlob, playerStats);
  if (!playerRow) return structured;

  const hit = nbaOverVsRecentFormContradiction(requestedMarket, "over", playerRow);
  if (!hit) return structured;

  const caveat = buildRecentFormContradictionCaveat(hit);
  const caveats = Array.isArray(structured.caveats)
    ? structured.caveats.filter((c) => typeof c === "string")
    : [];
  if (!caveats.some((c) => /conflicting signals/i.test(c))) {
    caveats.unshift(caveat);
  }

  return {
    ...structured,
    confidence: "Speculative",
    call: `Conflicting signals — recent form vs line (${hit.line} ${hit.unit})`.slice(0, 100),
    caveats: caveats.slice(0, 5),
    conflictingSignals: true,
  };
}

/**
 * Adjust estimated-edge output when an over lean at the stated line fights last-five form.
 * @param {object|null} edge
 * @param {string} question
 * @param {object|null} playerRow
 * @returns {object|null}
 */
export function applyRecentFormContradictionToEstimatedEdge(edge, question, playerRow) {
  if (!edge || edge.source !== "estimated_edge" || !playerRow) return edge;

  const direction = inferNbaPropDirection(question);
  const rm = parseNbaRequestedMarket(question);
  const impliedOver =
    direction === "over" ||
    (direction == null &&
      Number.isFinite(rm.line) &&
      edge.playableOverAtOrBelow != null &&
      rm.line <= Number(edge.playableOverAtOrBelow));
  if (!impliedOver || !Number.isFinite(rm.line) || !rm.market) return edge;

  const hit = nbaOverVsRecentFormContradiction(rm, "over", playerRow);
  if (!hit) return edge;

  const name = String(edge.subject || playerRow.name || "player").trim();
  return {
    ...edge,
    confidence: "Speculative",
    conflictingSignals: true,
    leanRead: `Conflicting signals on ${name} ${hit.unit}: last-5 average ~${hit.recentAvg.toFixed(1)} sits ${Math.round(hit.gapPct * 100)}% below the ${hit.line} line — structural vacancy read fights recent form. Pass or wait; not a clean over.`,
    warnings: [
      ...(Array.isArray(edge.warnings) ? edge.warnings : []),
      "Recent form contradicts an over lean at the stated line.",
    ],
  };
}
