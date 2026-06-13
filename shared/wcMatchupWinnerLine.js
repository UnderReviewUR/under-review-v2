/**
 * World Cup matchup — extract "[Team] [ML] to win" for card face + compact structured call.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { wcTeamDisplayNames } from "./wcUrTakeEntityBinding.js";

/**
 * @param {string} question
 */
export function isWcMatchWinnerQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  return (
    /\bwho wins\b/i.test(q) ||
    /\b(vs\.?|versus)\b/i.test(q) ||
    /\b(match winner|moneyline|ml)\b/i.test(q)
  );
}

/**
 * @param {string} question
 */
export function parseWcMatchupTeamsFromQuestion(question) {
  const q = String(question || "").trim();
  const vs =
    q.match(/\b([A-Z]{2,4})\s+vs\.?\s+([A-Z]{2,4})\b/i) ||
    q.match(/who wins\s+([A-Z]{2,4})\s+vs\.?\s+([A-Z]{2,4})/i);
  if (!vs) return { home: "", away: "", group: "" };
  const group =
    q.match(/\(Group\s+([A-L])\)/i)?.[1] || q.match(/\bGroup\s+([A-L])\b/i)?.[1] || "";
  return { home: vs[1].toUpperCase(), away: vs[2].toUpperCase(), group: group.toUpperCase() };
}

/**
 * @param {string} abbr
 */
export function wcMatchupTeamDisplayName(abbr) {
  const key = String(abbr || "").trim().toUpperCase();
  const team = WC_2026_TEAMS.find((t) => String(t.abbreviation).toUpperCase() === key);
  return team?.name || key;
}

/**
 * @param {string} label
 * @param {string[]} abbrs
 */
function resolveWcMatchupAbbr(label, abbrs) {
  const raw = String(label || "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (abbrs.includes(upper)) return upper;

  for (const abbr of abbrs) {
    const names = wcTeamDisplayNames(abbr);
    if (names.some((n) => n.toUpperCase() === upper)) return abbr;
    if (names.some((n) => n.toLowerCase() === raw.toLowerCase())) return abbr;
    if (names.some((n) => n.toLowerCase().startsWith(raw.toLowerCase().slice(0, 4)))) return abbr;
  }
  return "";
}

/**
 * @param {string} odds
 */
function americanOddsImplied(odds) {
  const n = Number.parseInt(String(odds || "").replace(/[^\d+-]/g, ""), 10);
  if (!Number.isFinite(n) || n === 0) return 0;
  if (n < 0) return -n / (-n + 100);
  return 100 / (n + 100);
}

/**
 * @param {string} home
 * @param {string} away
 * @param {string} homeOdds
 * @param {string} awayOdds
 */
function pickWcMatchupFavoriteMl(home, away, homeOdds, awayOdds) {
  const homeImp = americanOddsImplied(homeOdds);
  const awayImp = americanOddsImplied(awayOdds);
  return homeImp >= awayImp
    ? { abbr: home, odds: homeOdds }
    : { abbr: away, odds: awayOdds };
}

/**
 * @param {string} blob
 * @param {string} abbr
 */
function findWcTeamMlInBlob(blob, abbr) {
  const key = String(abbr || "").trim().toUpperCase();
  if (!key) return "";

  const names = wcTeamDisplayNames(key)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const re = new RegExp(`\\b(?:${names}|${key})\\s+([+-]\\d{2,4})\\b`, "i");
  return String(blob || "").match(re)?.[1] || "";
}

/**
 * @param {string} blob
 * @param {string} [question]
 */
export function parseWcMatchupTeamsFromBlob(blob, question = "") {
  const fromQuestion = parseWcMatchupTeamsFromQuestion(question);
  if (fromQuestion.home && fromQuestion.away) return fromQuestion;

  const text = String(blob || "");
  const vs = text.match(/\b([A-Z]{2,4})\s+vs\.?\s+([A-Z]{2,4})\b/i);
  if (vs) {
    return { home: vs[1].toUpperCase(), away: vs[2].toUpperCase(), group: "" };
  }

  const abbrHits = [];
  for (const m of text.matchAll(/\b([A-Z]{2,4})\s+([+-]\d{2,4})\b/g)) {
    const abbr = m[1].toUpperCase();
    if (!abbrHits.includes(abbr)) abbrHits.push(abbr);
  }
  if (abbrHits.length >= 2) {
    return { home: abbrHits[0], away: abbrHits[1], group: "" };
  }

  return parseWcMatchupTeamsFromQuestion(text);
}

/**
 * @param {string} blob
 * @param {{ home?: string, away?: string }} teams
 */
export function extractWcMatchupWinnerLine(blob, teams = {}) {
  let home = String(teams.home || "").trim().toUpperCase();
  let away = String(teams.away || "").trim().toUpperCase();
  if (!home || !away) {
    const parsed = parseWcMatchupTeamsFromBlob(blob);
    home = parsed.home;
    away = parsed.away;
  }
  if (!home || !away) return "";

  const text = String(blob || "");
  const abbrs = [home, away];

  const explicitToWin = text.match(
    /\b(?:Lean\s+)?([A-Za-z][A-Za-z\s.'-]{2,28}|[A-Z]{2,4})\s+([+-]\d{2,4})\s+to\s+win\b/i,
  );
  if (explicitToWin) {
    const abbr = resolveWcMatchupAbbr(explicitToWin[1], abbrs);
    if (abbr) {
      return `${wcMatchupTeamDisplayName(abbr)} ${explicitToWin[2]} to win`;
    }
  }

  const mlAt = text.match(/\b(?:ML|moneyline)\s+at\s+([A-Z]{2,4})\s+([+-]\d{2,4})\b/i);
  if (mlAt && abbrs.includes(mlAt[1].toUpperCase())) {
    return `${wcMatchupTeamDisplayName(mlAt[1])} ${mlAt[2]} to win`;
  }

  const homeOdds = findWcTeamMlInBlob(text, home);
  const awayOdds = findWcTeamMlInBlob(text, away);
  if (homeOdds && awayOdds) {
    const fav = pickWcMatchupFavoriteMl(home, away, homeOdds, awayOdds);
    return `${wcMatchupTeamDisplayName(fav.abbr)} ${fav.odds} to win`;
  }
  if (homeOdds) return `${wcMatchupTeamDisplayName(home)} ${homeOdds} to win`;
  if (awayOdds) return `${wcMatchupTeamDisplayName(away)} ${awayOdds} to win`;

  const leanMl = text.match(
    /\bLean\s+([A-Za-z][A-Za-z\s.'-]{2,28}|[A-Z]{2,4})\s+([+-]\d{2,4})\b/i,
  );
  if (
    leanMl &&
    !/\b(both teams|under|over|advance|pass)\b/i.test(leanMl[0])
  ) {
    const abbr = resolveWcMatchupAbbr(leanMl[1], abbrs);
    if (abbr) {
      return `${wcMatchupTeamDisplayName(abbr)} ${leanMl[2]} to win`;
    }
  }

  return "";
}

export const WC_MATCHUP_PATHS_CALL_RE = /\badvancement paths\b|\bgroup-stage paths\b/i;

/**
 * @param {string} text
 */
export function isWcMatchupPathsBoilerplate(text) {
  return WC_MATCHUP_PATHS_CALL_RE.test(String(text || ""));
}

/**
 * Actionable bet from lean / play copy — Under 2.5, both advance, etc.
 * @param {string} leanOrBlob
 */
export function extractWcMatchupPlayHeadline(leanOrBlob) {
  const raw = String(leanOrBlob || "")
    .replace(/^lean:\s*/i, "")
    .trim();
  if (!raw) return "";

  const passOu = raw.match(
    /pass\s+on\s+(?:the\s+)?ml\b[^.]{0,100}?\b(lean\s+)?(under|over)\s+(\d+\.?\d*)\s*goals?/i,
  );
  if (passOu) return `Lean ${passOu[2]} ${passOu[3]} goals`;

  const ou = raw.match(/\b(lean\s+)?(under|over)\s+(\d+\.?\d*)\s*goals?\b/i);
  if (ou) return `Lean ${ou[2]} ${ou[3]} goals`;

  if (/\bboth teams to advance\b/i.test(raw)) {
    const clause = raw.match(/both teams to advance[^.!?]*/i)?.[0];
    if (clause) {
      const t = clause.trim();
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
  }

  return "";
}

/**
 * Card-face headline: ML winner when cited, else the actual play (never advancement paths).
 * @param {string} blob
 * @param {{ home?: string, away?: string }} teams
 * @param {string} [lean]
 * @param {string} [call]
 */
export function resolveWcMatchupCardHeadline(blob, teams = {}, lean = "", call = "") {
  const callPlay = extractWcMatchupPlayHeadline(String(call || "").trim());
  if (callPlay && !/\bto win\b/i.test(callPlay)) return callPlay;

  const parsed =
    teams.home && teams.away ? teams : parseWcMatchupTeamsFromBlob(`${blob}\n${call}`);
  const winner = extractWcMatchupWinnerLine(blob, parsed);
  if (winner) return winner;

  const play = extractWcMatchupPlayHeadline(lean || blob);
  if (play) return play;

  const seedCall = String(call || "").trim();
  if (seedCall && !isWcMatchupPathsBoilerplate(seedCall)) return seedCall;
  return "";
}

/**
 * @param {string} question
 * @param {object | null | undefined} structured
 * @param {string | null | undefined} [wcIntent]
 */
export function detectWcMatchupMissingWinnerLine(question, structured, wcIntent) {
  const intent = String(wcIntent || "").toUpperCase();
  const q = String(question || "").trim();
  const isMatchup =
    intent === "MATCHUP" ||
    /\b(vs\.?|versus)\b/i.test(q) ||
    /^who wins\b/i.test(q);
  if (!isMatchup || !structured || typeof structured !== "object") return false;

  const call = String(structured.call || "").trim();
  if (/\bto win\b/i.test(call)) return false;
  if (extractWcMatchupPlayHeadline(structured.lean) || extractWcMatchupPlayHeadline(call)) {
    return false;
  }
  if (isWcMatchupPathsBoilerplate(call)) {
    const teams = parseWcMatchupTeamsFromQuestion(q);
    const blob = [structured.call, structured.lean, structured.whyNow, structured.line, structured.deep]
      .filter(Boolean)
      .map(String)
      .join("\n");
    return Boolean(extractWcMatchupWinnerLine(blob, teams));
  }

  const teams = parseWcMatchupTeamsFromQuestion(q);
  const blob = [structured.call, structured.lean, structured.whyNow, structured.line, structured.deep]
    .filter(Boolean)
    .map(String)
    .join("\n");
  const winnerLine = extractWcMatchupWinnerLine(blob, teams);
  if (!winnerLine) return false;
  return !call.toLowerCase().includes(winnerLine.split(" ")[0].toLowerCase());
}
