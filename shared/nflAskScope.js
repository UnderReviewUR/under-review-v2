/**
 * Expand NFL Ask matchup scope from nicknames, stated legs, and unique player names (BDL).
 */
import { detectNflTeamHints } from "../src/lib/detectSportFromQuestion.js";
import { NFL_BDL_ROSTER_SNAPSHOT } from "../api/data/nflBdlRosterSnapshot.js";
import { QBs } from "../api/nfl-players.js";
import { RBs } from "../api/nfl-rb.js";
import WRsAndTEs from "../api/nfl-wr-te.js";
import { parseNflStatedTicketLegs, isNflTicketReviewAsk } from "./nflAskTicketParse.js";

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

/** @type {{ qb: Set<string>, rb: Set<string>, wr: Set<string> } | null} */
let skillSetsCache = null;

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

function skillSets() {
  if (skillSetsCache) return skillSetsCache;
  /** @type {Set<string>} */
  const qb = new Set();
  /** @type {Set<string>} */
  const rb = new Set();
  /** @type {Set<string>} */
  const wr = new Set();
  for (const name of Object.keys(QBs || {})) qb.add(normalizePlayerKey(name));
  for (const name of Object.keys(RBs || {})) rb.add(normalizePlayerKey(name));
  for (const name of Object.keys(WRsAndTEs || {})) wr.add(normalizePlayerKey(name));
  skillSetsCache = { qb, rb, wr };
  return skillSetsCache;
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

/**
 * Soft market/position prior for shared last names. Never invents a team when
 * two skill players still share the surname (e.g. Brown).
 * @param {string[]} lasts
 * @param {string} question
 */
function disambiguateLastNames(lasts, question) {
  if (lasts.length <= 1) return lasts[0] || "";
  const q = String(question || "").toLowerCase();
  const skill = skillSets();
  /** @type {(kn: string) => boolean} */
  let prefer = () => true;
  if (/\brush/.test(q)) prefer = (kn) => skill.rb.has(kn);
  else if (/\bpass(?:ing)?\b/.test(q) && !/\brush/.test(q)) prefer = (kn) => skill.qb.has(kn);
  else if (/\brec(?:eiv|eption)|targets?\b/.test(q)) prefer = (kn) => skill.wr.has(kn);
  else if (/\banytime|\btouchdowns?\b|\btds?\b/.test(q)) {
    prefer = (kn) => skill.rb.has(kn) || skill.wr.has(kn);
  } else {
    // Bare surname: skill offense over defense/OL when that leaves one name.
    prefer = (kn) => skill.qb.has(kn) || skill.rb.has(kn) || skill.wr.has(kn);
  }
  const hit = lasts.filter(prefer);
  if (hit.length === 1) return hit[0];
  // Rush/pass/rec filters can empty the list — fall back to skill-only if unique.
  if (hit.length === 0) {
    const skillOnly = lasts.filter(
      (kn) => skill.qb.has(kn) || skill.rb.has(kn) || skill.wr.has(kn),
    );
    if (skillOnly.length === 1) return skillOnly[0];
  }
  return "";
}

function teamForUniqueName(token, index, maps, question = "") {
  const t = String(token || "").toLowerCase();
  if (!t || t.length < 4 || NAME_STOP.has(t)) return "";
  if (index[t]) return String(index[t] || "").toUpperCase();
  const lasts = maps.byLast.get(t) || [];
  if (lasts.length === 1) return String(index[lasts[0]] || "").toUpperCase();
  if (lasts.length > 1) {
    const picked = disambiguateLastNames(lasts, question);
    return picked ? String(index[picked] || "").toUpperCase() : "";
  }
  // A surname shared by several players stays ambiguous. Never fall through to
  // the first-name map: "smith" would resolve to Smith Vilbert and poison scope.
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

  // Full names first — "aj brown" and "a.j. brown" both normalize onto the
  // snapshot key, where the bare surname is one of 26 Browns. Also match
  // trailing windows ("smith njigba" → "jaxon smith njigba") and consume those
  // word indexes so a bare "smith" cannot later resolve to DeVonta.
  /** @type {Set<number>} */
  const consumed = new Set();
  for (let size = 3; size >= 2; size -= 1) {
    for (let i = 0; i + size <= words.length; i += 1) {
      if ([...Array(size)].some((_, k) => consumed.has(i + k))) continue;
      const window = words.slice(i, i + size);
      if (window.some((w) => NAME_STOP.has(w))) continue;
      const key = normalizePlayerKey(window.join(" "));
      if (!key) continue;
      let team = index[key] ? String(index[key]).toUpperCase() : "";
      if (!team) {
        const ends = Object.keys(index).filter((k) => {
          const kn = normalizePlayerKey(k);
          return kn === key || kn.endsWith(` ${key}`);
        });
        if (ends.length === 1) team = String(index[ends[0]] || "").toUpperCase();
      }
      if (!team) continue;
      teams.add(team);
      for (let k = 0; k < size; k += 1) {
        consumed.add(i + k);
        tokens.add(window[k]);
      }
    }
  }

  for (let i = 0; i < words.length; i += 1) {
    if (consumed.has(i)) continue;
    const raw = words[i];
    const team = teamForUniqueName(raw, index, maps, q);
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

function teamFromStatedName(raw, index, maps, question = "") {
  const key = normalizePlayerKey(raw);
  if (key && index[key]) return String(index[key]).toUpperCase();
  if (key) {
    const ends = Object.keys(index).filter((k) => {
      const kn = normalizePlayerKey(k);
      return kn === key || kn.endsWith(` ${key}`);
    });
    if (ends.length === 1) return String(index[ends[0]] || "").toUpperCase();
  }
  const parts = key.split(" ").filter(Boolean);
  const last = parts[parts.length - 1] || "";
  return (
    teamForUniqueName(last, index, maps, question) ||
    teamForUniqueName(parts[0] || "", index, maps, question)
  );
}

/**
 * Ticket with an unplaceable leg or 3+ clubs cannot be one game — grade off
 * the week board instead of inventing a matchup.
 * @param {string} question
 * @param {Record<string, string>} index
 * @param {{ byLast: Map<string, string[]>, byFirst: Map<string, string[]> }} maps
 */
function ticketNeedsWeekBoard(question, index, maps) {
  if (!isNflTicketReviewAsk(question)) return false;
  const ou = parseNflStatedTicketLegs(question).filter((l) => l.kind === "ou");
  if (ou.length < 2) return false;
  /** @type {Set<string>} */
  const legTeams = new Set();
  let unresolved = 0;
  for (const leg of ou) {
    const team = teamFromStatedName(String(leg.raw), index, maps, question);
    if (team) {
      legTeams.add(team);
      continue;
    }
    unresolved += 1;
  }
  return unresolved > 0 || legTeams.size > 2;
}

/**
 * @param {string} question
 * @param {Record<string, string>} [teamIndex]
 * @returns {{ teams: Set<string>, anchors: Set<string>, weekBoard: boolean }}
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

  if (ticketNeedsWeekBoard(question, index, maps)) {
    // Keep tokens available via named hits / ticket parse; do not invent a game.
    return { teams: new Set(), anchors: new Set(), weekBoard: true };
  }

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
    addAbbr(teams, teamFromStatedName(String(leg.raw), index, maps, question));
  }

  const named = nflAskNamedPlayerHits(question, index);
  for (const ab of named.teams) addAbbr(teams, ab);

  return { teams, anchors, weekBoard: false };
}

/**
 * @param {Set<string>|string[]} teams
 * @param {Set<string>|string[]} anchors
 * @returns {Set<string>}
 */
export function capNflAskScopeTeams(teams, anchors) {
  const set = new Set(
    [...(teams instanceof Set ? teams : teams || [])]
      .map((t) => String(t || "").toUpperCase().trim())
      .filter(Boolean),
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
