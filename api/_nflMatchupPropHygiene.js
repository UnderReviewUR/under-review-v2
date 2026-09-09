/**
 * Build NE/SEA (etc.) allowlists from static UR player DBs when ESPN roster KV is cold.
 */
import { QBs } from "./nfl-players.js";
import RBs from "./nfl-rb.js";
import WRsAndTEs from "./nfl-wr-te.js";
import {
  buildNflPlayerTeamIndex,
  filterNflPropsForMatchup,
} from "../shared/nflAskPropTrim.js";

/**
 * @param {Set<string>|string[]} scope
 */
function scopeSet(scope) {
  return scope instanceof Set ? scope : new Set((scope || []).map((x) => String(x || "").toUpperCase()));
}

/**
 * @param {Set<string>} scope
 */
export function buildNflStaticPlayerTeamIndex() {
  return buildNflPlayerTeamIndex({
    ...(QBs || {}),
    ...(RBs || {}),
    ...(WRsAndTEs || {}),
  });
}

/**
 * @param {Set<string>|string[]} scope
 * @param {Record<string, string>} [teamIndex]
 */
export function staticRosterNamesForScope(scope, teamIndex = buildNflStaticPlayerTeamIndex()) {
  const set = scopeSet(scope);
  /** @type {string[]} */
  const names = [];
  for (const [name, team] of Object.entries(teamIndex || {})) {
    if (set.has(String(team || "").toUpperCase())) names.push(name);
  }
  return names;
}

/**
 * @param {Array<Record<string, unknown>>} props
 * @param {{
 *   scope?: Set<string>|string[],
 *   rosterNames?: string[],
 *   playerTeamByName?: Record<string, string>,
 * }} [opts]
 */
export function scrubNflMatchupPropLines(props, opts = {}) {
  const teamIndex = opts.playerTeamByName || buildNflStaticPlayerTeamIndex();
  const rosterNames = [
    ...(opts.rosterNames || []),
    ...staticRosterNamesForScope(opts.scope || [], teamIndex),
  ];
  return filterNflPropsForMatchup(props, {
    scope: opts.scope,
    rosterNames,
    playerTeamByName: teamIndex,
  });
}
