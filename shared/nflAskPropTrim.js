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
  NE: ["NE", "NWE"],
  NWE: ["NE", "NWE"],
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
  if (isNflPeriodPropRow(row)) score -= 80;
  if (/(longest|long(?:est)?\s+(?:pass|rush|rec|play))/.test(blob)) score -= 25;
  if (isNflHeadlineBoardMarket(row)) score += 45;
  if (isNflNoveltyBoardProp(row)) score -= 70;
  const market = nflPropMarketKeyBase(row);
  if (market === "pass_yds") score += 28;
  else if (market === "rush_yds" || market === "rec_yds" || market === "pass_tds") score += 12;
  return score;
}

const NFL_PERIOD_PROP_RE =
  /\b(?:1h|2h|h1|h2|1st\s*half|2nd\s*half|first\s*half|second\s*half|q[1-4]|1st\s*(?:q(?:tr|uarter)?)|2nd\s*(?:q(?:tr|uarter)?)|3rd\s*(?:q(?:tr|uarter)?)|4th\s*(?:q(?:tr|uarter)?)|first\s*quarter|second\s*quarter|third\s*quarter|fourth\s*quarter)\b/i;

/**
 * 1H / 2H / quarter markets — too script-dependent for a full-game props board.
 * @param {Record<string, unknown>|null|undefined} row
 */
export function isNflPeriodPropRow(row) {
  const blob = `${row?.propRaw || ""} ${row?.prop || ""} ${row?.period || ""} ${row?.marketPeriod || ""}`;
  return NFL_PERIOD_PROP_RE.test(blob);
}

/**
 * @param {string} [question]
 */
export function questionWantsNflPeriodProps(question) {
  return NFL_PERIOD_PROP_RE.test(String(question || ""));
}

const NFL_HEADLINE_BOARD_MARKETS = new Set([
  "pass_yds",
  "pass_tds",
  "rush_yds",
  "rec_yds",
  "rec_tds",
  "receptions",
]);

function nflPropMarketKeyBase(row) {
  return nflPropMarketKey(row).replace(/_period$/, "");
}

/**
 * Core skill O/U tickets for a “best props tonight” board.
 * @param {Record<string, unknown>|null|undefined} row
 */
export function isNflHeadlineBoardMarket(row) {
  return NFL_HEADLINE_BOARD_MARKETS.has(nflPropMarketKeyBase(row));
}

/**
 * Kicker / defense / 0.5-yard novelty — not a full-game props board unless asked.
 * @param {Record<string, unknown>|null|undefined} row
 */
export function isNflNoveltyBoardProp(row) {
  const blob = `${row?.propRaw || ""} ${row?.prop || ""}`.toLowerCase();
  if (/(extra\s*points?|kicking|field\s*goals?|\bpat\b|xp\s*made)/.test(blob)) return true;
  if (/\btackles?\b/.test(blob) && !/\bsacks?\b/.test(blob)) return true;
  const market = nflPropMarketKeyBase(row);
  const line = Number(row?.line);
  if (market === "rush_yds" && Number.isFinite(line) && line <= 8.5) return true;
  if (market === "rec_yds" && Number.isFinite(line) && line <= 12.5) return true;
  return false;
}

function questionWantsNflNoveltyProps(question) {
  const q = String(question || "").toLowerCase();
  return /\b(kicker|extra points?|field goals?|tackles?|sacks?)\b/.test(q);
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
  // Never fail open when we have an allowlist — empty is better than off-roster noise.
  return rows.filter((p) => playerNameAllowed(String(p?.player || ""), names));
}

/**
 * @param {string} playerName
 * @param {Set<string>} allowKeys
 */
function playerNameAllowed(playerName, allowKeys) {
  const key = normalizePlayerKey(playerName);
  if (!key) return false;
  if (allowKeys.has(key)) return true;
  const last = key.split(" ").pop();
  if (last && last.length >= 4 && [...allowKeys].some((n) => n === last || n.endsWith(` ${last}`))) {
    return true;
  }
  // A.J. Brown ↔ AJ Brown ↔ a j brown (normalizePlayerKey already collapses initials)
  if ([...allowKeys].some((n) => normalizePlayerKey(n) === key)) return true;
  return false;
}

/**
 * Prefer team-index assignment over a vendor-stamped prop team when we know the player.
 * Callers should build teamIndex with BallDontLie winning conflicts over static/ESPN.
 * @param {string} playerName
 * @param {Record<string, string>} teamIndex
 * @param {string} [propTeam]
 */
function resolveKnownTeam(playerName, teamIndex, propTeam = "") {
  const key = normalizePlayerKey(playerName);
  if (key && teamIndex[key]) return String(teamIndex[key]).toUpperCase().trim();
  if (key) {
    for (const [name, team] of Object.entries(teamIndex || {})) {
      if (normalizePlayerKey(name) === key || playerNameAllowed(playerName, new Set([name]))) {
        return String(team || "").toUpperCase().trim();
      }
    }
  }
  return String(propTeam || "").toUpperCase().trim();
}

/**
 * Build lowercase player → team abbr index from static / roster rows.
 * @param {Array<{ name?: string, player?: string, team?: string, teamAbbr?: string }|Record<string, { team?: string, teamAbbr?: string }>>} source
 * @returns {Record<string, string>}
 */
export function buildNflPlayerTeamIndex(source) {
  /** @type {Record<string, string>} */
  const out = {};
  if (Array.isArray(source)) {
    for (const row of source) {
      const name = normalizePlayerKey(row?.name || row?.player || "");
      const team = String(row?.team || row?.teamAbbr || "")
        .toUpperCase()
        .trim();
      if (name && team) out[name] = team;
    }
    return out;
  }
  if (source && typeof source === "object") {
    for (const [name, row] of Object.entries(source)) {
      const key = normalizePlayerKey(name);
      const team = String(row?.team || row?.teamAbbr || "")
        .toUpperCase()
        .trim();
      if (key && team) out[key] = team;
    }
  }
  return out;
}

/**
 * Merge player→team indexes. Later maps win on the same player key so BDL can
 * override stale static/ESPN assignments (e.g. A.J. Brown → NE).
 * @param {...Record<string, string>} indexes
 * @returns {Record<string, string>}
 */
export function mergeNflPlayerTeamIndexesPreferLast(...indexes) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const idx of indexes) {
    if (!idx || typeof idx !== "object") continue;
    for (const [name, team] of Object.entries(idx)) {
      const key = normalizePlayerKey(name);
      const ab = String(team || "").toUpperCase().trim();
      if (key && ab) out[key] = ab;
    }
  }
  return out;
}

/**
 * Merge rostersByTeam maps. Later sources win on the same player within a team;
 * earlier sources fill gaps (ESPN/depth → BDL).
 * @param {...Record<string, Array<Record<string, unknown>>>} rosterMaps
 * @returns {Record<string, Array<Record<string, unknown>>>}
 */
export function mergeNflRostersByTeamPreferLast(...rosterMaps) {
  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const out = {};
  for (const map of rosterMaps) {
    if (!map || typeof map !== "object") continue;
    for (const [team, rows] of Object.entries(map)) {
      const ab = String(team || "").toUpperCase().trim();
      if (!ab) continue;
      if (!out[ab]) out[ab] = [];
      /** @type {Map<string, Record<string, unknown>>} */
      const byKey = new Map();
      for (const r of out[ab]) {
        const k = normalizePlayerKey(r?.name || r?.player || "");
        if (k) byKey.set(k, r);
      }
      for (const r of Array.isArray(rows) ? rows : []) {
        const name = String(r?.name || r?.player || "").trim();
        if (!name) continue;
        const k = normalizePlayerKey(name);
        if (!k) continue;
        byKey.set(k, { ...r, name });
      }
      out[ab] = [...byKey.values()];
    }
  }
  return out;
}

/**
 * Hard hygiene for matchup prop boards: drop players whose known team is outside
 * the matchup, then keep allowlisted names when we have a real allowlist.
 * Team index should treat BallDontLie as source of truth when NFL_BDL_PRIMARY is on.
 *
 * @param {Array<Record<string, unknown>>} props
 * @param {{
 *   scope?: Set<string>|string[],
 *   rosterNames?: Set<string>|string[],
 *   playerTeamByName?: Record<string, string>,
 * }} [opts]
 */
export function filterNflPropsForMatchup(props, opts = {}) {
  const scope = expandScope(opts.scope || []);
  const rows = Array.isArray(props) ? props : [];
  if (!rows.length) return [];

  const teamIndex = opts.playerTeamByName && typeof opts.playerTeamByName === "object"
    ? opts.playerTeamByName
    : {};

  /** @type {Set<string>} */
  const allow = new Set(
    [...(opts.rosterNames instanceof Set ? opts.rosterNames : opts.rosterNames || [])]
      .map(normalizePlayerKey)
      .filter(Boolean),
  );
  if (scope.size) {
    for (const [name, team] of Object.entries(teamIndex)) {
      const ab = String(team || "").toUpperCase();
      if (ab && scope.has(ab)) allow.add(name);
    }
  }

  // 1) Drop anyone whose known team is outside the matchup.
  // Prefer team-index (BDL > ESPN > static when merged that way) over prop stamps.
  let filtered = rows;
  if (scope.size) {
    filtered = rows.filter((p) => {
      const propTeam = String(p?.team || p?.teamAbbr || "")
        .toUpperCase()
        .trim();
      const known = resolveKnownTeam(String(p?.player || ""), teamIndex, propTeam);
      // No roster/team signal and not on allowlist → junk; keep only if no allowlist yet.
      if (!known) return allow.size < 1;
      const expanded = expandScope([known]);
      for (const ab of expanded) {
        if (scope.has(ab)) return true;
      }
      return false;
    });
  }

  // 2) If we have a real allowlist, only ship those players.
  // BDL roster membership belongs on the allowlist — do not treat it as pollution.
  if (allow.size >= 1) {
    return filtered.filter((p) => playerNameAllowed(String(p?.player || ""), allow));
  }

  return filtered;
}

/**
 * @param {Array<Record<string, unknown>>} props
 * @param {{ scope?: Set<string>|string[], question?: string, maxRows?: number, rosterNames?: Set<string>|string[], playerTeamByName?: Record<string, string> }} [opts]
 */
export function trimNflPlayerPropsForAsk(props, opts = {}) {
  const scope = expandScope(opts.scope || []);
  const maxRows = Math.max(12, Math.min(Number(opts.maxRows) || 56, 120));
  const tokens = playerTokensFromQuestion(opts.question || "");
  const hints = propHintsFromQuestion(opts.question || "");

  let rows = filterNflPropsForMatchup(Array.isArray(props) ? props : [], {
    scope,
    rosterNames: opts.rosterNames,
    playerTeamByName: opts.playerTeamByName,
  });
  rows = rows.filter((r) => rowMatchesScope(r, scope));
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
 * Collapse prop aliases so pass_yds and passing_yards count as the same market.
 * @param {Record<string, unknown>|null|undefined} row
 */
export function nflPropMarketKey(row) {
  const raw = `${row?.propRaw || ""} ${row?.prop || ""}`.toLowerCase();
  const period = isNflPeriodPropRow(row) ? "_period" : "";
  const key = (() => {
    if (/(longest|long(?:est)?\s+(?:pass|rush|rec|play)|pass_long|rush_long|rec_long)/.test(raw)) {
      if (/pass/.test(raw)) return "pass_long";
      if (/rush/.test(raw)) return "rush_long";
      if (/rec/.test(raw)) return "rec_long";
      return "longest";
    }
    if (
      /pass/.test(raw) &&
      /rush/.test(raw) &&
      /yd|yard/.test(raw) &&
      !/td|touch/.test(raw)
    ) {
      return "pass_rush_yds";
    }
    if (/rush/.test(raw) && /(rec|receiv)/.test(raw) && /yd|yard/.test(raw)) return "rush_rec_yds";
    if (/pass/.test(raw) && /td|touch/.test(raw)) return "pass_tds";
    if (/pass/.test(raw) && /yd|yard/.test(raw)) return "pass_yds";
    if (/rush/.test(raw) && /yd|yard/.test(raw)) return "rush_yds";
    if (/(rec|receiv)/.test(raw) && /td|touch/.test(raw)) return "rec_tds";
    if (/(rec|receiv)/.test(raw) && /yd|yard/.test(raw)) return "rec_yds";
    return String(row?.propRaw || row?.prop || "prop")
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  })();
  return `${key}${period}`;
}

function nflPropPeerBand(market, line) {
  const n = Number(line);
  if (!Number.isFinite(n)) return 8;
  if (/tds$|_td|anytime/.test(market)) return 1.1;
  if (/long/.test(market)) return 8;
  if (/yds/.test(market)) return Math.max(18, Math.min(40, n * 0.16));
  return Math.max(6, n * 0.2);
}

function nflPropSameTicket(a, b) {
  return (
    normalizePlayerKey(a?.player) === normalizePlayerKey(b?.player) &&
    nflPropMarketKey(a) === nflPropMarketKey(b)
  );
}

/**
 * Same player + market, close enough to be the same posted number — not alts or other props.
 * @param {Record<string, unknown>} row
 * @param {Array<Record<string, unknown>>} [allRows]
 */
export function nflPropPeerLines(row, allRows = []) {
  const line = Number(row?.line);
  const market = nflPropMarketKey(row);
  const band = nflPropPeerBand(market, line);
  return [
    ...new Set(
      (allRows || [])
        .filter((p) => nflPropSameTicket(p, row))
        .map((p) => Number(p.line))
        .filter((n) => Number.isFinite(n) && Math.abs(n - line) <= band),
    ),
  ];
}

/**
 * Main-book cluster (median neighborhood), not a 400+ alt.
 * @param {Array<Record<string, unknown>>} rows
 */
function dropNflYardLadderAlts(list, market) {
  if (!/yds/.test(String(market || "")) || /long|rush_rec|pass_rush/.test(String(market || ""))) {
    return list;
  }
  const mains = list.filter((r) => {
    const n = Number(r.line);
    return n >= 140 && n <= 340;
  });
  return mains.length ? mains : list;
}

export function pickNflConsensusMarketRow(rows) {
  const raw = (rows || []).filter((r) => Number.isFinite(Number(r?.line)));
  if (!raw.length) return null;
  const market = nflPropMarketKey(raw[0]);
  const list = dropNflYardLadderAlts(raw, market);
  if (!list.length) return null;
  let bestScore = -1;
  let bestCenter = Number(list[0].line);
  for (const r of list) {
    const line = Number(r.line);
    const band = nflPropPeerBand(market, line);
    const score = list.filter((x) => Math.abs(Number(x.line) - line) <= band).length;
    if (score > bestScore || (score === bestScore && line < bestCenter)) {
      bestScore = score;
      bestCenter = line;
    }
  }
  const band = nflPropPeerBand(market, bestCenter);
  const cluster = list.filter((r) => Math.abs(Number(r.line) - bestCenter) <= band);
  const pool = cluster.length ? cluster : list;
  return pool.reduce((best, row) => (Number(row.line) > Number(best.line) ? row : best), pool[0]);
}

function shortPlayerLast(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] || String(name || "this player");
}

function otherBookLines(unique, line) {
  const others = unique.filter((n) => n !== Number(line)).sort((a, b) => a - b);
  if (!others.length) return String(line);
  return others.join("/");
}

/**
 * Every prop ticket needs Over or Under. When books disagree, fade the high print
 * and buy the low print. Else take the less-juiced side. Opener week defaults under.
 *
 * @param {Record<string, unknown>} row
 * @param {Array<Record<string, unknown>>} [allRows]
 * @param {{ openerWeek?: boolean }} [opts]
 * @returns {{ side: "Over"|"Under", why: string }}
 */
export function inferNflPropTicketSide(row, allRows = [], opts = {}) {
  const openerWeek = Boolean(opts.openerWeek);
  const line = Number(row?.line);
  const unique = nflPropPeerLines(row, allRows);
  if (Number.isFinite(line) && unique.length >= 2) {
    const hi = Math.max(...unique);
    const lo = Math.min(...unique);
    if (hi - lo >= 1) {
      const range = `Main is ${line}, other books ${otherBookLines(unique, line)}.`;
      if (line >= hi - 0.05) {
        return { side: "Under", why: `${range} That's the high number.` };
      }
      if (line <= lo + 0.05) {
        return { side: "Over", why: `${range} That's the cheap number.` };
      }
    }
  }
  const over = Number(row?.overOdds);
  const under = Number(row?.underOdds);
  if (Number.isFinite(over) && Number.isFinite(under) && over !== under) {
    if (over > under) return { side: "Over", why: "Over is hanging the better price." };
    return { side: "Under", why: "Under is hanging the better price." };
  }
  if (openerWeek) {
    return {
      side: "Under",
      why: "First week — I wouldn't pay the posted over without a role lock.",
    };
  }
  return { side: "Under", why: "No smash over at this number." };
}

/**
 * Prefer the highest print for a player+market so the take can fade it.
 * @param {Array<Record<string, unknown>>} picked
 * @param {Array<Record<string, unknown>>} allRows
 */
export function preferHighPrintPrimary(picked, allRows = []) {
  if (!picked.length) return picked;
  const primary = picked[0];
  const same = (allRows || []).filter(
    (p) => nflPropSameTicket(p, primary) && Number.isFinite(Number(p.line)),
  );
  const consensus = pickNflConsensusMarketRow(same.length ? same : [primary]);
  if (!consensus || Number(consensus.line) === Number(primary.line)) return picked;
  return [consensus, ...picked.filter((row) => row !== consensus)];
}

function prettyPropLabel(row) {
  return String(row?.prop || row?.propRaw || "prop")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Numbered 3–5 sided tickets for a “best props” ask.
 * @param {Array<Record<string, unknown>>} rows
 * @param {Array<Record<string, unknown>>} allRows
 * @param {boolean} openerWeek
 */
export function formatNflSidedPropBoardList(rows, allRows = [], openerWeek = false) {
  return (rows || [])
    .map((row, i) => {
      const t = inferNflPropTicketSide(row, allRows, { openerWeek });
      const last = shortPlayerLast(row.player);
      return `${i + 1}. ${last} ${t.side.toLowerCase()} ${row.line} (${prettyPropLabel(row)})`;
    })
    .join("\n");
}

/**
 * Friend-text copy: one primary Over/Under plus a sided 3–5 board.
 * @param {{
 *   primary: Record<string, unknown>,
 *   allRows?: Array<Record<string, unknown>>,
 *   boardRows?: Array<Record<string, unknown>>,
 *   openerWeek?: boolean,
 * }} opts
 */
export function buildNflSidedPropRecoverCopy(opts) {
  const primary = opts.primary;
  const allRows = opts.allRows || [];
  const openerWeek = Boolean(opts.openerWeek);
  const ticket = inferNflPropTicketSide(primary, allRows, { openerWeek });
  const last = shortPlayerLast(primary.player);
  const line = primary.line;
  const propLabel = prettyPropLabel(primary);
  const shortWhy =
    ticket.side === "Under"
      ? openerWeek
        ? "high number in an opener."
        : "that's the high number."
      : openerWeek
        ? "cheap number in an opener."
        : "that's the cheap number.";
  const lean = `Lean: ${ticket.side} ${line}. ${last} — ${shortWhy}`.slice(0, 120);
  const call = `${last.toUpperCase()} ${ticket.side.toUpperCase()} ${line}`;
  const openerLine = openerWeek
    ? "First week — last year's D is a prior, not this year's rank."
    : "If your book's number is different, the side can flip.";
  const boardRows = (opts.boardRows || []).filter(Boolean);
  const list = formatNflSidedPropBoardList(boardRows, allRows, openerWeek);
  const whyNow = [
    `I'd take ${last} ${ticket.side.toLowerCase()} ${line}.`,
    "",
    ticket.why,
    openerWeek ? "I'd rather see a cheaper number if you can get it." : "",
    list
      ? `\nAlso worth a look:\n${list}\n\nOne ticket first. Speculative.`
      : "",
  ]
    .filter((lineText, i, arr) => lineText !== "" || (i > 0 && arr[i - 1] !== ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return {
    ticket,
    lean,
    call,
    callType: "prop",
    confidence: "Speculative",
    whyNow,
    edge: `I'd take the ${ticket.side.toLowerCase()}. Don't stack it.`,
    analysis: {
      matchupAnalysis: `${last} ${propLabel} ${ticket.side.toLowerCase()} ${line}. ${ticket.why}`,
      injuryContext: "Check inactives before you lock it.",
      marketContext: list || ticket.why,
      lineMovement: "Stick to a posted number. Don't invent movement.",
      statisticalEdge: openerLine,
    },
    caveats: [
      openerLine,
      "If your number is a lot lower, the under gets worse.",
    ],
  };
}

/**
 * @param {string} name
 */
export function normalizePlayerKey(name) {
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
 *   playerTeamByName?: Record<string, string>,
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
  const maxTickets = Math.max(2, Math.min(Number(opts.maxTickets) || 5, 6));
  const tokens = playerTokensFromQuestion(opts.question || "");
  const hints = propHintsFromQuestion(opts.question || "");

  let rows = (Array.isArray(props) ? props : []).filter(
    (p) => p && p.player && p.line != null && (p.underOdds != null || p.overOdds != null),
  );

  if (eventIds.size) {
    const byEvent = rows.filter((p) => p.eventId != null && eventIds.has(String(p.eventId)));
    if (byEvent.length) rows = byEvent;
  }

  rows = filterNflPropsForMatchup(rows, {
    scope,
    rosterNames,
    playerTeamByName: opts.playerTeamByName,
  });
  rows = rows.filter((p) => rowMatchesScope(p, scope));
  if (!questionWantsNflPeriodProps(opts.question)) {
    rows = rows.filter((p) => !isNflPeriodPropRow(p));
  }
  if (!questionWantsNflNoveltyProps(opts.question)) {
    rows = rows.filter((p) => !isNflNoveltyBoardProp(p));
  }

  rows.sort((a, b) => scorePropRow(b, tokens, hints) - scorePropRow(a, tokens, hints));

  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const rowsByMarket = new Map();
  for (const row of rows) {
    const key = `${normalizePlayerKey(row.player)}|${nflPropMarketKey(row)}`;
    const list = rowsByMarket.get(key) || [];
    list.push(row);
    rowsByMarket.set(key, list);
  }
  /** @type {Map<string, Record<string, unknown>>} */
  const bestByMarket = new Map();
  for (const [key, list] of rowsByMarket) {
    bestByMarket.set(key, pickNflConsensusMarketRow(list) || list[0]);
  }

  /** @type {Array<Record<string, unknown>>} */
  const picked = [];
  const seenPlayers = new Set();
  const seenProps = new Set();

  for (const row of bestByMarket.values()) {
    if (picked.length >= maxTickets) break;
    const playerKey = normalizePlayerKey(row.player);
    const propKey = nflPropMarketKey(row);
    if (seenPlayers.has(playerKey) && picked.length >= 1) continue;
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

  return preferHighPrintPrimary(picked, rows).slice(0, maxTickets);
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
