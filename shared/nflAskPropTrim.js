/**
 * Trim NFL player-prop rows for Ask / UR Take — scoped matchups should not ship 400+ lines.
 */

const NFL_ABBR_ALIAS = {
  WSH: ["WAS", "WSH"],
  WAS: ["WAS", "WSH"],
  ARI: ["ARI", "ARZ"],
  ARZ: ["ARI", "ARZ"],
};

/**
 * @param {Set<string>|string[]} scope
 * @returns {Set<string>}
 */
function expandScope(scope) {
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
 * @param {Record<string, unknown>} row
 * @param {Set<string>} scope
 */
function rowMatchesScope(row, scope) {
  if (!scope.size) return true;
  const game = String(row?.game || "").toUpperCase();
  const team = String(row?.team || row?.teamAbbr || "").toUpperCase();
  for (const ab of scope) {
    if (game.includes(ab) || team === ab) return true;
  }
  return false;
}

/**
 * @param {string} question
 * @returns {string[]}
 */
function playerTokensFromQuestion(question) {
  const q = String(question || "");
  const tokens = new Set();
  const re = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+){0,2})\b/g;
  let m;
  while ((m = re.exec(q))) {
    const t = String(m[1] || "").trim();
    if (t.length >= 3) tokens.add(t.toLowerCase());
  }
  return [...tokens];
}

/**
 * @param {Array<Record<string, unknown>>} props
 * @param {{ scope?: Set<string>|string[], question?: string, maxRows?: number }} [opts]
 */
export function trimNflPlayerPropsForAsk(props, opts = {}) {
  const scope = expandScope(opts.scope || []);
  const maxRows = Math.max(12, Math.min(Number(opts.maxRows) || 56, 120));
  const tokens = playerTokensFromQuestion(opts.question || "");

  let rows = (Array.isArray(props) ? props : []).filter((r) => rowMatchesScope(r, scope));

  if (tokens.length) {
    const prioritized = [];
    const rest = [];
    for (const row of rows) {
      const name = String(row?.player || "").toLowerCase();
      const hit = tokens.some((t) => name.includes(t) || t.includes(name.split(" ").pop() || ""));
      if (hit) prioritized.push(row);
      else rest.push(row);
    }
    rows = [...prioritized, ...rest];
  }

  return rows.slice(0, maxRows);
}

/**
 * Pick scoreboard games for a scoped Ask (max one matchup when two teams resolved).
 * @param {Array<{ awayAbbr?: string, homeAbbr?: string }>} games
 * @param {Set<string>|string[]} scope
 */
export function pickNflGamesForScope(games, scope) {
  const set = expandScope(scope);
  if (!set.size) return Array.isArray(games) ? games : [];
  const matched = (games || []).filter((g) => {
    const away = String(g?.awayAbbr || "").toUpperCase();
    const home = String(g?.homeAbbr || "").toUpperCase();
    return set.has(away) || set.has(home);
  });
  if (!matched.length) return [];
  if (set.size >= 2) {
    const pair = matched.filter((g) => set.has(String(g.awayAbbr || "").toUpperCase()) && set.has(String(g.homeAbbr || "").toUpperCase()));
    if (pair.length) return pair.slice(0, 1);
  }
  return matched.slice(0, 2);
}

/**
 * @param {Array<{ providerGameId?: number|string }>} games
 */
export function nflGameIdsFromGames(games) {
  return (games || []).map((g) => g.providerGameId).filter((id) => id != null);
}
