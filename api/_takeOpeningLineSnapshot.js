/**
 * Irreversible opening-line capture from propLines in the same JSON the model receives (no refetch).
 * Row = first entry in that array's iteration order that matches the same filters as server-side market verification.
 */

import {
  findFirstPlayerStatRowForQuestion,
  inferNbaPropDirection,
  parseNbaRequestedMarket,
} from "./_nbaPropSanity.js";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeNbaMarketPlayerKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function propLineMatchesTargetedPlayer(pl, targetedPlayer) {
  const k = normalizeNbaMarketPlayerKey(pl?.player);
  const t = normalizeNbaMarketPlayerKey(targetedPlayer);
  return Boolean(k && t && k === t);
}

function americanToDecimal(american) {
  const n = Number(american);
  if (!Number.isFinite(n)) return null;
  if (n > 0) return Math.round((1 + n / 100) * 1e4) / 1e4;
  return Math.round((1 + 100 / Math.abs(n)) * 1e4) / 1e4;
}

/**
 * Deterministic id for the exact propLines row (prefer native id fields when present).
 * @param {object} pl
 * @param {"nba"|"mlb"} sport
 */
export function buildCompositePropLineKey(pl, sport) {
  if (!pl || typeof pl !== "object") return "";
  if (pl.propLineKey != null && String(pl.propLineKey).trim()) return String(pl.propLineKey).trim();
  if (pl.id != null && String(pl.id).trim()) return String(pl.id).trim();
  const eventId = pl.eventId ?? pl.odds_event_id ?? "";
  const player = String(pl.player || "").trim();
  const marketKey = String(pl.propRaw ?? pl.marketKey ?? pl.prop ?? "").trim();
  const line = pl.line;
  const side = String(pl.side || "").trim();
  const book = String(pl.book || pl.sportsbook || "").trim();
  const st = String(sport || "").toLowerCase();
  if (st === "nba" || st === "mlb") {
    return [eventId, player, marketKey, line, side, book].map((x) => String(x ?? "")).join("|");
  }
  return [eventId, player, marketKey, line, side, book].map((x) => String(x ?? "")).join("|");
}

function extractMlbMarketHints(qRaw) {
  const q = String(qRaw || "").toLowerCase();
  const hints = new Set();
  if (/\b(strikeout|strikeouts|\bk\b|\bks\b|\bso\b|punchies)\b/i.test(q)) hints.add("strikeouts");
  if (/\b(total\s+bases|\btb\b)\b/i.test(q)) hints.add("total_bases");
  if (/\b(home\s*run|homer|\bhr\b|\bhrs\b)\b/i.test(q)) hints.add("home_runs");
  if (/\bhits\b/i.test(q)) hints.add("hits");
  if (/\brbi(s)?\b/i.test(q)) hints.add("rbis");
  if (
    /\b(game\s+total|team\s+total|runs\s+total|total\s+runs|over[/\s-]+under|ou\s*\d)/i.test(q)
  ) {
    hints.add("game_total");
  }
  return hints;
}

function mlbPropMatchesMarketHints(pl, hints) {
  if (!hints || hints.size === 0) return true;
  const raw = `${pl?.propRaw || ""} ${pl?.prop || ""}`.toLowerCase();
  for (const h of hints) {
    if (h === "game_total") continue;
    if (
      h === "strikeouts" &&
      (raw.includes("strikeout") || raw.includes("pitcher_strikeout"))
    )
      return true;
    if (h === "total_bases" && (raw.includes("total_base") || raw.includes("total bases"))) return true;
    if (h === "home_runs" && raw.includes("home_run")) return true;
    if (h === "hits" && raw.includes("batter_hits")) return true;
    if (h === "rbis" && raw.includes("batter_rbis")) return true;
  }
  return false;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectMlbRosterNames(mlbContext) {
  const names = [];
  const seen = new Set();
  for (const pl of mlbContext?.propLines || []) {
    const n = String(pl?.player || "").trim();
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    names.push(n);
  }
  for (const g of mlbContext?.games || []) {
    for (const side of ["homeTeam", "awayTeam"]) {
      const pit = g?.[side]?.pitcher;
      const n = String(pit || "").trim();
      if (!n || /^tbd$/i.test(n) || seen.has(n.toLowerCase())) continue;
      seen.add(n.toLowerCase());
      names.push(n);
    }
  }
  for (const inj of mlbContext?.injuries || []) {
    const n = String(inj?.player || "").trim();
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    names.push(n);
  }
  return names;
}

function findMlbPlayerReference(question, mlbContext) {
  const q = normalizeText(question);
  if (!q) return { matched: false };
  const candidates = [];
  for (const fullName of collectMlbRosterNames(mlbContext)) {
    const lower = fullName.toLowerCase();
    const parts = lower.split(/\s+/).filter(Boolean);
    const last = parts[parts.length - 1];
    if (q.includes(lower)) {
      candidates.push({ fullName, score: 100 });
      continue;
    }
    if (last && last.length >= 4 && new RegExp(`\\b${escapeRegExp(last)}\\b`, "i").test(q)) {
      candidates.push({ fullName, score: last.length });
    }
  }
  if (candidates.length === 0) return { matched: false };
  candidates.sort((a, b) => b.score - a.score);
  const topScore = candidates[0].score;
  const tied = candidates.filter((c) => c.score === topScore);
  if (tied.length > 1) return { matched: false, ambiguous: true };
  return { matched: true, canonicalName: tied[0].fullName };
}

function playerNamesAlign(a, b) {
  const na = String(a || "")
    .trim()
    .toLowerCase();
  const nb = String(b || "")
    .trim()
    .toLowerCase();
  if (!na || !nb) return false;
  if (na === nb) return true;
  const la = na.split(/\s+/).pop();
  const lb = nb.split(/\s+/).pop();
  return Boolean(la && lb && la === lb && la.length >= 4);
}

function inferMlbOverUnder(question) {
  const q = String(question || "").toLowerCase();
  const u = /\bunder\b/.test(q);
  const o = /\bover\b/.test(q);
  if (u && !o) return "under";
  if (o && !u) return "over";
  return null;
}

function parseNumericLineFromQuestion(question) {
  const m = String(question || "").match(/\b(\d{1,3}(?:\.\d+)?)\b/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * First propLines row in array order that matches targeted player + requested market/line/side
 * (same filters as `verifyPlayerMarket` in applyNbaMarketInvalidation).
 * @param {object[]} propLines — must be the model slice (e.g. nbaContextForModel.propLines)
 */
export function pickFirstNbaModelContextPropLineRow(propLines, question, targetedPlayer, playerStats) {
  const lines = Array.isArray(propLines) ? propLines : [];
  const q = String(question || "");
  const rm = parseNbaRequestedMarket(q);
  const dir = inferNbaPropDirection(q);
  const tp = String(targetedPlayer || "").trim();
  const fromStats = findFirstPlayerStatRowForQuestion(q, playerStats)?.name;
  const player = tp || String(fromStats || "").trim();
  if (!player) return null;

  for (const pl of lines) {
    if (!propLineMatchesTargetedPlayer(pl, player)) continue;
    if (rm?.market) {
      const propLc = String(pl?.prop || "").toLowerCase();
      if (!propLc.includes(String(rm.market).toLowerCase())) continue;
    }
    if (Number.isFinite(rm?.line) && Number(pl.line) !== Number(rm.line)) continue;
    if (dir) {
      const plSide = String(pl.side || "").toLowerCase();
      if (!plSide.includes(dir)) continue;
    }
    return pl;
  }
  return null;
}

/**
 * First propLines row for MLB actionable scope (mirrors resolveMlbDecisionMode player branch).
 * @param {object} mlbContext
 */
export function pickFirstMlbModelContextPropLineRow(mlbContext, question) {
  const propLines = Array.isArray(mlbContext?.propLines) ? mlbContext.propLines : [];
  if (!propLines.length) return null;
  const playerRef = findMlbPlayerReference(question, mlbContext);
  if (!playerRef.matched) return null;
  const hints = extractMlbMarketHints(question);
  const hintsNoTotal = new Set(hints);
  hintsNoTotal.delete("game_total");
  const dir = inferMlbOverUnder(question);
  const lineNum = parseNumericLineFromQuestion(question);

  const forPlayer = propLines.filter((pl) => playerNamesAlign(pl?.player, playerRef.canonicalName));
  if (!forPlayer.length) return null;

  for (const pl of forPlayer) {
    if (hintsNoTotal.size > 0 && !mlbPropMatchesMarketHints(pl, hintsNoTotal)) continue;
    if (Number.isFinite(lineNum) && Number(pl.line) !== lineNum) continue;
    if (dir) {
      const plSide = String(pl.side || "").toLowerCase();
      if (!plSide.includes(dir)) continue;
    }
    return pl;
  }
  return null;
}

export function buildOpeningLineSnapshotFromPropLineRow(pl, sport, boardFetchedAt) {
  if (!pl || typeof pl !== "object") return null;
  const st = String(sport || "").toLowerCase();
  const eventId = pl.eventId ?? pl.odds_event_id ?? null;
  const marketKey = String(pl.propRaw ?? pl.marketKey ?? pl.prop ?? "").trim();
  const playerName = String(pl.player || "").trim();
  const line = pl.line;
  const side = String(pl.side || "").trim();
  const openingAmerican = Number(pl.odds);
  const openingBook = String(pl.book || pl.sportsbook || "").trim();
  const propLineKey = buildCompositePropLineKey(pl, st);
  const bfa =
    boardFetchedAt != null && String(boardFetchedAt).trim()
      ? String(boardFetchedAt).trim()
      : new Date().toISOString();

  return {
    openingAmerican: Number.isFinite(openingAmerican) ? openingAmerican : null,
    openingDecimal: Number.isFinite(openingAmerican) ? americanToDecimal(openingAmerican) : null,
    openingBook: openingBook || null,
    propLineKey,
    eventId: eventId != null ? String(eventId) : null,
    marketKey: marketKey || null,
    playerName: playerName || null,
    line: line != null && line !== "" ? line : null,
    side: side || null,
    boardFetchedAt: bfa,
    snapshotSource: "model_context_propLines",
  };
}

/**
 * @param {object} p
 * @param {"nba"|"mlb"} p.sport
 * @param {string} p.question
 * @param {object} [p.nbaContextForModel]
 * @param {object} [p.mlbContext]
 * @param {string|null|undefined} p.targetedPlayer
 * @param {string|null|undefined} p.boardFetchedAt
 * @returns {object|null}
 */
export function buildOpeningLineSnapshotFromModelContext(p) {
  const sport = String(p.sport || "").toLowerCase();
  const question = String(p.question || "");
  const boardFetchedAt = p.boardFetchedAt != null ? String(p.boardFetchedAt).trim() : "";

  let pl = null;
  if (sport === "nba") {
    pl = pickFirstNbaModelContextPropLineRow(
      p.nbaContextForModel?.propLines,
      question,
      p.targetedPlayer,
      p.nbaContextForModel?.playerStats,
    );
  } else if (sport === "mlb") {
    pl = pickFirstMlbModelContextPropLineRow(p.mlbContext || {}, question);
  } else {
    return null;
  }
  if (!pl) return null;
  return buildOpeningLineSnapshotFromPropLineRow(pl, sport, boardFetchedAt);
}
