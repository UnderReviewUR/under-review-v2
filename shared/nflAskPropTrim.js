/**
 * Trim NFL player-prop rows for Ask / UR Take — scoped matchups should not ship 400+ lines.
 */

const NFL_ABBR_ALIAS = {
  WSH: ["WAS", "WSH"],
  WAS: ["WAS", "WSH"],
  ARI: ["ARI", "ARZ"],
  ARZ: ["ARI", "ARZ"],
  LA: ["LA", "LAR"],
  LAR: ["LA", "LAR"],
  JAC: ["JAC", "JAX"],
  JAX: ["JAC", "JAX"],
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
 * @param {string} question
 * @returns {string[]}
 */
function propHintsFromQuestion(question) {
  const q = String(question || "").toLowerCase();
  /** @type {string[]} */
  const hints = [];
  if (/pass(ing)?\s*(tds?|touchdowns?)/.test(q)) hints.push("passing_tds", "passing tds", "pass_td");
  if (/pass(ing)?\s*(yards?|yds?)/.test(q)) hints.push("passing_yards", "passing yards");
  if (/pass(ing)?\s*(attempts?|atts?)/.test(q)) hints.push("passing_attempts", "passing attempts");
  if (/pass(ing)?\s*comp/.test(q)) hints.push("passing_completions", "completions");
  if (/rush(ing)?\s*(tds?|touchdowns?)/.test(q)) hints.push("rushing_tds", "rushing tds");
  if (/rush(ing)?\s*(yards?|yds?)/.test(q)) hints.push("rushing_yards", "rushing yards");
  if (/receiv(ing|ed)?\s*(tds?|touchdowns?)/.test(q) || /rec\s*tds?/.test(q)) {
    hints.push("receiving_tds", "receiving tds");
  }
  if (/receiv(ing|ed)?\s*(yards?|yds?)/.test(q) || /rec\s*(yards?|yds?)/.test(q)) {
    hints.push("receiving_yards", "receiving yards");
  }
  if (/\breceptions?\b|\brecs?\b/.test(q)) hints.push("receptions", "receiving_receptions");
  if (/\bsacks?\b/.test(q)) hints.push("sacks");
  if (/\btackles?\b/.test(q)) hints.push("tackles");
  if (/anytime\s*(td|touchdown)|touchdown\s*scorer/.test(q)) {
    hints.push("anytime_td", "touchdown_scorer", "anytime");
  }
  return hints;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string[]} tokens
 * @param {string[]} hints
 */
function scorePropRow(row, tokens, hints) {
  let score = 0;
  const name = String(row?.player || "").toLowerCase();
  const propRaw = String(row?.propRaw || "").toLowerCase();
  const prop = String(row?.prop || "").toLowerCase();
  const blob = `${propRaw} ${prop}`;
  if (tokens.length) {
    const hit = tokens.some((t) => name.includes(t) || t.includes(name.split(" ").pop() || ""));
    if (hit) score += 100;
  }
  if (hints.length) {
    const hit = hints.some((h) => blob.includes(String(h).toLowerCase().replace(/\s+/g, "_")) || blob.includes(String(h).toLowerCase()));
    if (hit) score += 80;
  }
  // Prefer true over/under lines over milestone ladders for Ask.
  if (row?.marketType !== "milestone" && (row?.underOdds != null || row?.overOdds != null)) score += 15;
  const book = String(row?.book || "").toLowerCase();
  if (book === "draftkings" || book === "fanduel") score += 3;
  return score;
}

/**
 * @param {Array<Record<string, unknown>>} props
 * @param {{ scope?: Set<string>|string[], question?: string, maxRows?: number }} [opts]
 */
export function trimNflPlayerPropsForAsk(props, opts = {}) {
  const scope = expandScope(opts.scope || []);
  const maxRows = Math.max(12, Math.min(Number(opts.maxRows) || 56, 120));
  const tokens = playerTokensFromQuestion(opts.question || "");
  const hints = propHintsFromQuestion(opts.question || "");

  let rows = (Array.isArray(props) ? props : []).filter((r) => rowMatchesScope(r, scope));
  rows.sort((a, b) => scorePropRow(b, tokens, hints) - scorePropRow(a, tokens, hints));
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
