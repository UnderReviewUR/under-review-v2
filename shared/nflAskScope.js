/**
 * Expand NFL Ask matchup scope from nicknames, stated legs, and unique player names (BDL).
 */
import { detectNflTeamHints } from "../src/lib/detectSportFromQuestion.js";
import { NFL_BDL_ROSTER_SNAPSHOT } from "../api/data/nflBdlRosterSnapshot.js";
import { parseNflStatedTicketLegs } from "./nflAskTicketParse.js";

const NAME_STOP = new Set([
  "about",
  "and",
  "any",
  "best",
  "bets",
  "for",
  "from",
  "game",
  "good",
  "have",
  "just",
  "line",
  "lines",
  "over",
  "play",
  "player",
  "plays",
  "prop",
  "props",
  "that",
  "the",
  "this",
  "thoughts",
  "tonight",
  "under",
  "what",
  "with",
  "your",
]);

function normalizePlayerKey(name) {
  const parts = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  /** @type {string[]} */
  const out = [];
  let i = 0;
  while (i < parts.length) {
    if (parts[i].length === 1) {
      let initials = "";
      while (i < parts.length && parts[i].length === 1) {
        initials += parts[i];
        i += 1;
      }
      out.push(initials);
      continue;
    }
    out.push(parts[i]);
    i += 1;
  }
  return out.join(" ");
}

function addAbbr(set, raw) {
  const ab = String(raw || "").toUpperCase().trim();
  if (ab && /^[A-Z]{2,4}$/.test(ab)) set.add(ab);
}

/**
 * @param {Record<string, string>} index
 */
function uniqueNameMaps(index) {
  /** @type {Map<string, string[]>} */
  const byLast = new Map();
  /** @type {Map<string, string[]>} */
  const byFirst = new Map();
  for (const key of Object.keys(index || {})) {
    const kn = normalizePlayerKey(key);
    const parts = kn.split(" ").filter(Boolean);
    if (!parts.length) continue;
    const last = parts[parts.length - 1];
    const first = parts[0];
    if (last && last.length >= 4) {
      const list = byLast.get(last) || [];
      list.push(kn);
      byLast.set(last, list);
    }
    if (first && first.length >= 4 && parts.length >= 2) {
      const list = byFirst.get(first) || [];
      list.push(kn);
      byFirst.set(first, list);
    }
  }
  return { byLast, byFirst };
}

function teamForUniqueName(token, index, maps) {
  const t = String(token || "").toLowerCase();
  if (!t || t.length < 4 || NAME_STOP.has(t)) return "";
  if (index[t]) return String(index[t] || "").toUpperCase();
  const lasts = maps.byLast.get(t) || [];
  if (lasts.length === 1) return String(index[lasts[0]] || "").toUpperCase();
  const firsts = maps.byFirst.get(t) || [];
  if (firsts.length === 1) return String(index[firsts[0]] || "").toUpperCase();
  return "";
}

/**
 * Unique roster names mentioned without needing an over/under number.
 * @param {string} question
 * @param {Record<string, string>} [teamIndex]
 * @returns {{ teams: Set<string>, tokens: string[] }}
 */
export function nflAskNamedPlayerHits(question, teamIndex) {
  const index =
    teamIndex && typeof teamIndex === "object" && Object.keys(teamIndex).length
      ? teamIndex
      : NFL_BDL_ROSTER_SNAPSHOT?.playerTeamByName || {};
  const maps = uniqueNameMaps(index);
  const q = String(question || "").toLowerCase();
  const words = q.split(/[^a-z]+/g).filter(Boolean);
  /** @type {Set<string>} */
  const teams = new Set();
  /** @type {Set<string>} */
  const tokens = new Set();

  for (const raw of words) {
    const team = teamForUniqueName(raw, index, maps);
    if (!team) continue;
    teams.add(team);
    tokens.add(raw);
  }

  if (teams.size) {
    for (const raw of words) {
      if (NAME_STOP.has(raw) || raw.length < 4 || tokens.has(raw)) continue;
      const lasts = maps.byLast.get(raw) || [];
      const inScope = lasts.filter((kn) => teams.has(String(index[kn] || "").toUpperCase()));
      if (inScope.length === 1) {
        tokens.add(raw);
        teams.add(String(index[inScope[0]] || "").toUpperCase());
      }
    }
  }

  return { teams, tokens: [...tokens] };
}

function teamFromStatedName(raw, index, maps) {
  const key = normalizePlayerKey(raw);
  if (key && index[key]) return String(index[key]).toUpperCase();
  const parts = key.split(" ").filter(Boolean);
  const last = parts[parts.length - 1] || "";
  return teamForUniqueName(last, index, maps) || teamForUniqueName(parts[0] || "", index, maps);
}

/**
 * @param {string} question
 * @param {Record<string, string>} [teamIndex]
 * @returns {{ teams: Set<string>, anchors: Set<string> }}
 */
export function collectNflAskScopeFromQuestion(question, teamIndex) {
  const index =
    teamIndex && typeof teamIndex === "object" && Object.keys(teamIndex).length
      ? teamIndex
      : NFL_BDL_ROSTER_SNAPSHOT?.playerTeamByName || {};
  const maps = uniqueNameMaps(index);
  /** @type {Set<string>} */
  const anchors = new Set();
  /** @type {Set<string>} */
  const teams = new Set();

  for (const ab of detectNflTeamHints(question)) {
    addAbbr(anchors, ab);
    addAbbr(teams, ab);
  }

  for (const leg of parseNflStatedTicketLegs(question)) {
    if (leg.kind === "win") {
      for (const ab of detectNflTeamHints(String(leg.raw))) {
        addAbbr(anchors, ab);
        addAbbr(teams, ab);
      }
      continue;
    }
    addAbbr(teams, teamFromStatedName(String(leg.raw), index, maps));
  }

  const named = nflAskNamedPlayerHits(question, index);
  for (const ab of named.teams) addAbbr(teams, ab);

  return { teams, anchors };
}

/**
 * @param {Set<string>|string[]} teams
 * @param {Set<string>|string[]} anchors
 * @returns {Set<string>}
 */
export function capNflAskScopeTeams(teams, anchors) {
  const set = new Set(
    [...(teams instanceof Set ? teams : teams || [])].map((t) => String(t || "").toUpperCase().trim()).filter(Boolean),
  );
  const nick = new Set(
    [...(anchors instanceof Set ? anchors : anchors || [])]
      .map((t) => String(t || "").toUpperCase().trim())
      .filter(Boolean),
  );
  if (set.size <= 2) return set;
  // If size > 2, keep nickname/win-leg anchors. That assumes a team-level nick/win leg; a pure player-prop ticket has nothing to grab and must not invent a game.
  if (nick.size >= 1 && nick.size <= 2) return nick;
  return new Set();
}
