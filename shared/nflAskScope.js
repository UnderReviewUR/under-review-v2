/**
 * Expand NFL Ask matchup scope from stated ticket legs (BDL roster teams).
 */
import { detectNflTeamHint } from "../src/lib/detectSportFromQuestion.js";
import { NFL_BDL_ROSTER_SNAPSHOT } from "../api/data/nflBdlRosterSnapshot.js";
import { parseNflStatedTicketLegs } from "./nflAskTicketParse.js";
import { resolveNflPlayerTeamFromIndex } from "./nflAskPropTrim.js";

/**
 * @param {string} question
 * @param {Record<string, string>} [teamIndex]
 * @returns {{ teams: Set<string>, anchors: Set<string> }}
 */
export function collectNflAskScopeFromQuestion(question, teamIndex) {
  const index =
    teamIndex && typeof teamIndex === "object"
      ? teamIndex
      : NFL_BDL_ROSTER_SNAPSHOT?.playerTeamByName || {};
  /** @type {Set<string>} */
  const anchors = new Set();
  /** @type {Set<string>} */
  const teams = new Set();

  const add = (set, raw) => {
    const ab = String(raw || "").toUpperCase().trim();
    if (ab && /^[A-Z]{2,4}$/.test(ab)) set.add(ab);
  };

  const q = String(question || "");
  add(anchors, detectNflTeamHint(q));
  add(teams, detectNflTeamHint(q));

  for (const leg of parseNflStatedTicketLegs(q)) {
    if (leg.kind === "win") {
      const ab = detectNflTeamHint(String(leg.raw));
      add(anchors, ab);
      add(teams, ab);
      continue;
    }
    add(teams, resolveNflPlayerTeamFromIndex(String(leg.raw), index));
  }

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
