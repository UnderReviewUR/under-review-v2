/**
 * Player-name → nation → fixture pinning for WC player-prop UR Take.
 */

import { WC_FULL_SQUADS } from "../src/data/wc2026FullSquadsSeed.js";
import { extractWcPlayerPropNameHint } from "./wcUrTakePlayerMarket.js";
import { normalizeWcPlayerName } from "./wcPlayerRegistry.js";
import { matchPlayerPropRowsFromEvent } from "./wcMatchPlayerProps.js";

/**
 * @param {string} text
 */
function normPlayerToken(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Score how strongly a roster row matches a bare name hint (higher = more specific).
 * @param {{ lastName?: string, nameOnShirt?: string, name?: string, playerKey?: string }} player
 * @param {string} hint normalized hint
 */
function scoreWcPlayerNationMatch(player, hint) {
  const last = normPlayerToken(player.lastName);
  const tokens = last.split(/\s+/).filter(Boolean);
  const shirt = normPlayerToken(player.nameOnShirt);
  const legalTokens = normPlayerToken(player.name).split(/\s+/).filter(Boolean);
  const key = normPlayerToken(player.playerKey).replace(/-/g, " ");

  if (last === hint) return 100;
  if (tokens[0] === hint) return 80;
  if (shirt === hint) return 70;
  if (tokens.includes(hint)) return 50;
  if (legalTokens.includes(hint)) return 40;
  if (hint.length >= 5 && (last.includes(hint) || key.includes(hint))) return 20;
  return 0;
}

/**
 * Resolve FIFA nation abbr from a bare player name in the question (e.g. Son → KOR).
 * @param {string} question
 */
export function resolveWcPlayerNationFromQuestion(question) {
  const hint = normPlayerToken(extractWcPlayerPropNameHint(question));
  if (!hint || hint.length < 2) return null;

  /** @type {Map<string, number>} */
  const nationScores = new Map();

  for (const [abbr, team] of Object.entries(WC_FULL_SQUADS.teams || {})) {
    for (const p of team.roster || []) {
      const score = scoreWcPlayerNationMatch(p, hint);
      if (!score) continue;
      const prev = nationScores.get(abbr) || 0;
      if (score > prev) nationScores.set(abbr, score);
    }
  }

  if (!nationScores.size) return null;

  const topScore = Math.max(...nationScores.values());
  const leaders = [...nationScores.entries()].filter(([, s]) => s === topScore);
  if (leaders.length === 1) return leaders[0][0];
  return null;
}

/**
 * @param {string} question
 */
export function detectWcPlayerPropMarketKey(question) {
  const q = String(question || "").trim();
  if (/\b(score|goal)\s+or\s+assist\b/i.test(q)) return "player_goal_or_assist";
  if (/\bshots?\s+on\s+target\b|\bsot\b/i.test(q)) return "player_sot_ou";
  if (/\d+\.?\d*\s*shots?\b/i.test(q) || /\bshots?\s*(?:o\/u|over|under)\b/i.test(q)) {
    return "player_shots_ou";
  }
  if (/\bassist/i.test(q)) return "player_assists_ou";
  if (/\bfirst\s+goal/i.test(q)) return "first_goalscorer";
  if (/\b(?:score|scorer|goal)/i.test(q)) return "anytime_scorer";
  return "player_shots_ou";
}

/**
 * @param {string} question
 * @param {object | null | undefined} matchPlayerProps
 */
export function findWcMatchPlayerPropRowForQuestion(question, matchPlayerProps) {
  if (!matchPlayerProps) return null;
  const hint = normPlayerToken(extractWcPlayerPropNameHint(question));
  if (!hint) return null;

  const market = detectWcPlayerPropMarketKey(question);
  const rows = matchPlayerPropRowsFromEvent(matchPlayerProps, market, 50);

  const nameMatches = rows.filter((r) => {
    const name = normPlayerToken(r.name);
    const parts = name.split(/\s+/).filter(Boolean);
    return (
      name === hint ||
      parts.includes(hint) ||
      parts.some((p) => p.startsWith(hint)) ||
      name.includes(hint) ||
      normPlayerToken(normalizeWcPlayerName(r.name))
        .split(/\s+/)
        .some((p) => p === hint || p.endsWith(hint))
    );
  });
  if (!nameMatches.length) return null;

  const lineAsk = String(question || "").match(/(\d+\.?\d*)\s*shots?\b/i)?.[1];
  if (lineAsk) {
    const target = Number(lineAsk);
    if (Number.isFinite(target)) {
      const ceil = Math.ceil(target);
      const byLine = nameMatches
        .filter((r) => r.line != null && r.side === "over")
        .sort(
          (a, b) =>
            Math.abs(Number(a.line) - ceil) - Math.abs(Number(b.line) - ceil) ||
            Number(a.line) - Number(b.line),
        );
      if (byLine.length) return { ...byLine[0], market };
    }
  }

  return { ...nameMatches[0], market };
}

/**
 * Pin ESPN event id for the player's next/relevant fixture.
 * @param {Array<Record<string, unknown>>} matches
 * @param {string} nationAbbr
 */
export function resolveWcEventIdForPlayerNation(matches, nationAbbr) {
  const abbr = String(nationAbbr || "").toUpperCase();
  if (!abbr) return null;

  const relevant = (matches || []).filter(
    (m) =>
      String(m.homeTeam || "").toUpperCase() === abbr ||
      String(m.awayTeam || "").toUpperCase() === abbr,
  );
  if (!relevant.length) return null;

  const live = relevant.filter((m) => /live|in progress|1h|2h|ht/i.test(String(m.status || "")));
  if (live.length) {
    return String(
      live.sort((a, b) => (Number(b.commenceTs) || 0) - (Number(a.commenceTs) || 0))[0]?.id ?? "",
    ).trim() || null;
  }

  const upcoming = relevant
    .filter((m) => /scheduled|ns|not started|timed|upcoming/i.test(String(m.status || "")))
    .sort((a, b) => (Number(a.commenceTs) || 0) - (Number(b.commenceTs) || 0));
  if (upcoming.length) return String(upcoming[0]?.id ?? "").trim() || null;

  const finished = relevant
    .filter((m) => /final|ft|finished|complete/i.test(String(m.status || "")))
    .sort((a, b) => (Number(b.commenceTs) || 0) - (Number(a.commenceTs) || 0));
  return finished.length ? String(finished[0]?.id ?? "").trim() || null : null;
}
