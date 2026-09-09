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
 * Drop prop rows for players not on the scoped team rosters (AN sometimes
 * attaches wrong-team names to a game).
 * @param {Array<Record<string, unknown>>} props
 * @param {Set<string>|string[]} rosterNames
 */
export function filterNflPropsToRoster(props, rosterNames) {
  const names = new Set(
    [...(rosterNames instanceof Set ? rosterNames : rosterNames || [])]
      .map(normalizePlayerKey)
      .filter(Boolean),
  );
  if (!names.size) return Array.isArray(props) ? props : [];
  const rows = Array.isArray(props) ? props : [];
  const hit = rows.filter((p) => {
    const key = normalizePlayerKey(p?.player);
    if (!key) return false;
    if (names.has(key)) return true;
    const last = key.split(" ").pop();
    return Boolean(last && [...names].some((n) => n === last || n.endsWith(` ${last}`)));
  });
  // Sparse roster snapshots should not wipe a live board.
  return hit.length >= 3 ? hit : rows;
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
 * Pretty book label for user-facing copy.
 * @param {string} book
 */
export function formatNflBookLabel(book) {
  const b = String(book || "").trim().toLowerCase();
  if (b === "draftkings") return "DraftKings";
  if (b === "fanduel") return "FanDuel";
  if (b === "betmgm") return "BetMGM";
  if (b === "caesars") return "Caesars";
  if (b === "fanatics") return "Fanatics";
  if (b === "betrivers") return "BetRivers";
  if (!b || b === "board" || b === "unknown") return "the board";
  return String(book).trim();
}

/**
 * @param {string} name
 */
function normalizePlayerKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pick a short, diverse set of live prop tickets for a "best props" board ask.
 * Filters to the matchup when possible, drops duplicate player+market lines,
 * and prefers major books.
 *
 * @param {Array<Record<string, unknown>>} props
 * @param {{
 *   scope?: Set<string>|string[],
 *   eventIds?: Array<string|number>,
 *   rosterNames?: Set<string>|string[],
 *   question?: string,
 *   maxTickets?: number,
 * }} [opts]
 */
export function pickNflPropsBoardTickets(props, opts = {}) {
  const scope = expandScope(opts.scope || []);
  const eventIds = new Set(
    (opts.eventIds || []).map((id) => String(id)).filter((id) => id && id !== "null" && id !== "undefined"),
  );
  const rosterNames = new Set(
    [...(opts.rosterNames instanceof Set ? opts.rosterNames : opts.rosterNames || [])]
      .map(normalizePlayerKey)
      .filter(Boolean),
  );
  const maxTickets = Math.max(2, Math.min(Number(opts.maxTickets) || 4, 6));
  const tokens = playerTokensFromQuestion(opts.question || "");
  const hints = propHintsFromQuestion(opts.question || "");

  let rows = (Array.isArray(props) ? props : []).filter(
    (p) => p && p.player && p.line != null && (p.underOdds != null || p.overOdds != null),
  );

  if (eventIds.size) {
    const byEvent = rows.filter((p) => p.eventId != null && eventIds.has(String(p.eventId)));
    if (byEvent.length) rows = byEvent;
  }

  rows = rows.filter((p) => rowMatchesScope(p, scope));

  if (rosterNames.size) {
    const onRoster = rows.filter((p) => {
      const key = normalizePlayerKey(p.player);
      if (!key) return false;
      if (rosterNames.has(key)) return true;
      const last = key.split(" ").pop();
      return last && [...rosterNames].some((n) => n === last || n.endsWith(` ${last}`));
    });
    if (onRoster.length >= 2) rows = onRoster;
  }

  rows.sort((a, b) => scorePropRow(b, tokens, hints) - scorePropRow(a, tokens, hints));

  /** @type {Map<string, Record<string, unknown>>} */
  const bestByMarket = new Map();
  for (const row of rows) {
    const propKey = String(row.propRaw || row.prop || "prop")
      .toLowerCase()
      .replace(/\s+/g, "_");
    const key = `${normalizePlayerKey(row.player)}|${propKey}`;
    if (!bestByMarket.has(key)) bestByMarket.set(key, row);
  }

  /** @type {Array<Record<string, unknown>>} */
  const picked = [];
  const seenPlayers = new Set();
  const seenProps = new Set();

  for (const row of bestByMarket.values()) {
    if (picked.length >= maxTickets) break;
    const playerKey = normalizePlayerKey(row.player);
    const propKey = String(row.propRaw || row.prop || "prop")
      .toLowerCase()
      .replace(/\s+/g, "_");
    // Prefer variety: avoid stacking the same player or same market type.
    if (seenPlayers.has(playerKey) && picked.length >= 2) continue;
    if (seenProps.has(propKey) && picked.length >= 2) continue;
    picked.push(row);
    seenPlayers.add(playerKey);
    seenProps.add(propKey);
  }

  if (picked.length < Math.min(2, bestByMarket.size)) {
    for (const row of bestByMarket.values()) {
      if (picked.length >= maxTickets) break;
      if (picked.includes(row)) continue;
      picked.push(row);
    }
  }

  return picked.slice(0, maxTickets);
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
