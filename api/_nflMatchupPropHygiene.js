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

const NFL_ABBR_ALIAS = {
  WSH: ["WAS", "WSH"],
  WAS: ["WAS", "WSH"],
  ARI: ["ARI", "ARZ"],
  ARZ: ["ARI", "ARZ"],
  LA: ["LA", "LAR"],
  LAR: ["LA", "LAR"],
  JAC: ["JAC", "JAX"],
  JAX: ["JAC", "JAX"],
  NE: ["NE", "NWE"],
  NWE: ["NE", "NWE"],
};

/**
 * @param {Set<string>|string[]} scope
 */
function scopeSet(scope) {
  const out = new Set();
  const src = scope instanceof Set ? [...scope] : scope || [];
  for (const raw of src) {
    const ab = String(raw || "").toUpperCase().trim();
    if (!ab) continue;
    out.add(ab);
    for (const alias of NFL_ABBR_ALIAS[ab] || []) out.add(alias);
  }
  return out;
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
