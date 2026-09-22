/**
 * Trim NFL player-prop rows for Ask / UR Take — scoped matchups should not ship 400+ lines.
 */
import { isNflTicketReviewAsk } from "./nflAskTicketParse.js";
import { nflAskNamedPlayerHits } from "./nflAskScope.js";
import {
  looksLikeNflPropsRefreshAsk,
  nflPlayerKeyIsExcluded,
  nflPropRowNearPriorBoardTicket,
} from "./nflAskPropsBatch.js";
import {
  buildNflPropEdgeForRow,
  voteNflPropEdgeSide,
} from "./nflAskPropEdge.js";
import {
  nflOpenHistoryTossUpLean,
  resolveNflPropPlayerSpread,
  resolveNflPropVenue,
} from "./nflAskPropOpenHistory.js";
import {
  detectNflBoardScriptConflicts,
  nflPropBatch2PassesFloor,
  orderNflPropsBoardByPrimaryEdge,
  scoreNflPropPrimaryEdge,
} from "./nflAskPropBoardElite.js";
import {
  nflBdlPreferredSkillMarket,
  nflBdlRosterIsQb,
  nflBdlRosterPosition,
} from "./nflBdlRosterLookup.js";

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
  NO: ["NO", "NOP", "NOLA"],
  NOP: ["NO", "NOP", "NOLA"],
  NOLA: ["NO", "NOP", "NOLA"],
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
 * A row stamped with a matchup that has no scoped team belongs to another game.
 * Team stamps go stale when a player changes clubs and must stay re-homeable by
 * the roster index; a game stamp cannot go stale, so it is safe to filter on.
 * Anything that is not an abbr-vs-abbr label (e.g. "NFL") counts as unstamped.
 * @param {Record<string, unknown>} row
 * @param {Set<string>} scope
 */
function rowGameIsForeign(row, scope) {
  if (!scope.size) return false;
  const game = String(row?.game || "").toUpperCase().trim();
  const pair = game.match(/^([A-Z]{2,4})\s*(?:@|VS\.?|V\.?|AT)\s*([A-Z]{2,4})$/);
  if (!pair) return false;
  return !scope.has(pair[1]) && !scope.has(pair[2]);
}

/**
 * Even on the week board: if BDL says the player is NE, a "DAL @ PHI" stamp is
 * a stale/wrong-game row and must not reach the prompt.
 * @param {Record<string, unknown>} row
 * @param {string} knownTeam
 */
function rowGameConflictsWithKnownTeam(row, knownTeam) {
  const known = String(knownTeam || "").toUpperCase().trim();
  if (!known) return false;
  const game = String(row?.game || "").toUpperCase().trim();
  const pair = game.match(/^([A-Z]{2,4})\s*(?:@|VS\.?|V\.?|AT)\s*([A-Z]{2,4})$/);
  if (!pair) return false;
  const matchup = expandScope([pair[1], pair[2]]);
  for (const ab of expandScope([known])) {
    if (matchup.has(ab)) return false;
  }
  return true;
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
  const ou = /\b([a-z][a-z0-9.'\s-]{1,28}?)\s+(?:over|under)\s+\d/gi;
  while ((m = ou.exec(q))) {
    const raw = String(m[1] || "")
      .replace(/^(and|,)\s+/i, "")
      .trim()
      .toLowerCase();
    if (raw.length >= 3 && !/^(the|and|for|game|bet)$/.test(raw)) tokens.add(raw);
    const last = raw.split(/\s+/).pop();
    if (last && last.length >= 3) tokens.add(last);
  }
  for (const t of nflAskNamedPlayerHits(q).tokens) tokens.add(t);
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
 * @param {{ multiBoard?: boolean }} [opts]
 */
function scorePropRow(row, tokens, hints, opts = {}) {
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
  // Integer ladders (8, 40, 80, 160) are usually alts — prefer true half-point mains.
  const line = Number(row?.line);
  if (Number.isFinite(line) && Math.abs(line % 1) < 0.001 && /yds|receptions/.test(market)) {
    score -= opts.multiBoard ? 50 : 35;
  }
  if (market === "receptions") score -= opts.multiBoard ? 25 : 5;
  if (isNflHighReceptionsLine(row)) score -= 40;
  // On "best 4 props" asks, don't let QB pass yards dominate the primary lean.
  const passBoost = opts.multiBoard ? 12 : 28;
  if (market === "pass_yds") score += passBoost;
  else if (market === "rush_yds" || market === "rec_yds" || market === "pass_tds") score += 12;
  score += roleMarketBoost(row);
  if (isNflPassMarketOnNonQb(row)) score -= 200;
  // Featured usage beats depth by default. True misprices unlock a value seat later —
  // they do not leapfrog stars in the first-pass ranking.
  if (opts.volumeByPlayer && typeof opts.volumeByPlayer === "object") {
    const vol = Number(opts.volumeByPlayer[normalizePlayerKey(row?.player)]);
    if (Number.isFinite(vol)) {
      if (vol >= 50) score += 28;
      else if (vol >= 25) score += 16;
      else if (vol >= 12) score += 6;
      else score -= 30;
    } else if (opts.multiBoard && (market === "rec_yds" || market === "receptions" || market === "rush_yds")) {
      score -= 40;
    }
  }
  return score;
}

/**
 * True misprice signal from pace/fantasy/line shop — unlocks depth players.
 * Soft D alone is not enough (that is how Engram overs sneak in).
 * @param {Record<string, unknown>} row
 * @param {Array<Record<string, unknown>>} allRows
 * @param {Record<string, unknown>|null|undefined} briefcase
 * @param {{ openerWeek?: boolean }} [opts]
 * @returns {number}
 */
export function nflPropBoardValueBoost(row, allRows = [], briefcase = null, opts = {}) {
  if (!row?.player || row.line == null) return 0;
  const market = nflPropMarketKeyBase(row);
  const line = Number(row.line);
  if (!Number.isFinite(line)) return 0;

  // High catch overs are never "value" on a best board.
  if (isNflHighReceptionsLine(row)) return 0;

  let boost = 0;
  const unique = nflPropPeerLines(row, allRows);
  if (unique.length >= 2) {
    const hi = Math.max(...unique);
    const lo = Math.min(...unique);
    if (hi - lo >= 1) {
      if (line >= hi - 0.05 || line <= lo + 0.05) boost = Math.max(boost, 28);
    }
  }

  if (!briefcase) return boost;
  const edge = buildNflPropEdgeForRow(row, market, briefcase);
  const vote = voteNflPropEdgeSide(row, market, edge, { openerWeek: Boolean(opts.openerWeek) });
  if (!vote) return boost;

  // Require pace or fantasy — not defense-only — before calling it value.
  const hasPace = edge?.pace != null || edge?.fantasyPace != null;
  if (!hasPace) return boost;

  const ref = edge.pace != null ? edge.pace : edge.fantasyPace;
  const gap = Math.abs(line - Number(ref));
  if (market === "receptions" && gap < 0.75) return boost;
  if (/yds/.test(market) && gap < 6) return boost;

  // Depth Over only counts as value when the number is clearly soft vs pace/proj.
  // Depth Under fades are usually worse tickets than starring the featured under.
  if (vote.side === "Over") {
    return Math.max(boost, gap >= 12 || (market === "receptions" && gap >= 1.25) ? 45 : 32);
  }
  return boost;
}

/**
 * Rough featured-usage prior from GOAT season / recent / fantasy pockets.
 * @param {Record<string, unknown>|null|undefined} briefcase
 * @returns {Record<string, number>}
 */
export function buildNflPropVolumeByPlayer(briefcase) {
  /** @type {Record<string, number>} */
  const out = {};
  if (!briefcase || typeof briefcase !== "object") return out;

  const bump = (name, n) => {
    const key = normalizePlayerKey(name);
    if (!key || !Number.isFinite(n)) return;
    out[key] = Math.max(out[key] || 0, n);
  };

  for (const r of briefcase.players?.seasonStats || []) {
    const games = Math.max(1, Number(r?.games) || 1);
    const pass = Number(r?.passYds);
    const rush = Number(r?.rushYds);
    const rec = Number(r?.recYds);
    const catches = Number(r?.receptions);
    if (Number.isFinite(pass)) bump(r.player, pass / games);
    if (Number.isFinite(rush)) bump(r.player, rush / games);
    if (Number.isFinite(rec)) bump(r.player, rec / games);
    if (Number.isFinite(catches)) bump(r.player, catches * 8);
  }
  /** @type {Map<string, number[]>} */
  const recent = new Map();
  for (const r of briefcase.players?.recentStats || []) {
    const key = normalizePlayerKey(r?.player);
    if (!key) continue;
    const vals = recent.get(key) || [];
    for (const k of ["passYds", "rushYds", "recYds"]) {
      const v = Number(r?.[k]);
      if (Number.isFinite(v)) vals.push(v);
    }
    recent.set(key, vals);
  }
  for (const [key, vals] of recent) {
    if (vals.length < 2) continue;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    out[key] = Math.max(out[key] || 0, avg);
  }
  for (const r of briefcase.fantasy?.projections || []) {
    const name =
      r.player ||
      r.player_name ||
      r?.player?.full_name ||
      [r?.player?.first_name, r?.player?.last_name].filter(Boolean).join(" ");
    const pass = Number(r.passing_yards ?? r.pass_yds);
    const rush = Number(r.rushing_yards ?? r.rush_yds);
    const rec = Number(r.receiving_yards ?? r.rec_yds);
    if (Number.isFinite(pass)) bump(name, pass);
    if (Number.isFinite(rush)) bump(name, rush);
    if (Number.isFinite(rec)) bump(name, rec);
  }
  return out;
}

/**
 * @param {string} [question]
 */
export function questionWantsNflMultiPropBoard(question) {
  const q = String(question || "").toLowerCase();
  if (/\b(best|top)\s+\d+\s*(player\s+)?props?\b/.test(q)) return true;
  if (/\b\d+\s*[-–to]{1,3}\s*\d+\s*(player\s+)?props?\b/.test(q)) return true;
  if (/\b(best|top)\s+(player\s+)?props?\b/.test(q)) return true;
  if (/\b(several|multiple|list|board)\b.*\bprops?\b/.test(q)) return true;
  if (/\b\d+\s*(?:player\s+)?(?:props?|bets?)\b/.test(q)) return true;
  if (/\bprovide\b.*\b(?:player\s+)?props?\b/.test(q)) return true;
  if (/\b(?:player\s+)?props?\b.*\b(?:matchup|tonight|game|vs\.?|versus|@)\b/.test(q)) return true;
  return false;
}

const NFL_PERIOD_PROP_RE =
  /\b(?:1h|2h|h1|h2|1st\s*half|2nd\s*half|first\s*half|second\s*half|[1-4]q|q[1-4]|1st\s*(?:q(?:tr|uarter)?)|2nd\s*(?:q(?:tr|uarter)?)|3rd\s*(?:q(?:tr|uarter)?)|4th\s*(?:q(?:tr|uarter)?)|first\s*quarter|second\s*quarter|third\s*quarter|fourth\s*quarter)\b/i;

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
]);

/** Receptions can appear when asked; they are not default “best props” headline tickets. */
const NFL_SECONDARY_BOARD_MARKETS = new Set(["receptions"]);

export function nflPropMarketKeyBase(row) {
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
 * Pass yards/TDs belong to QBs only — never seat an RB/WR on a pass market.
 * @param {Record<string, unknown>|null|undefined} row
 */
export function isNflPassMarketOnNonQb(row) {
  const market = nflPropMarketKeyBase(row);
  if (market !== "pass_yds" && market !== "pass_tds") return false;
  const name = String(row?.player || "");
  if (!name) return false;
  if (nflBdlRosterIsQb(name)) return false;
  const pos = nflBdlRosterPosition(name);
  // Known non-QB from roster truth, or known skill non-QB without a QB tag.
  if (pos && pos !== "QB") return true;
  return false;
}

/**
 * Boost the featured skill main for a player's roster position.
 * @param {Record<string, unknown>|null|undefined} row
 */
function roleMarketBoost(row) {
  const preferred = nflBdlPreferredSkillMarket(String(row?.player || ""));
  if (!preferred) return 0;
  const market = nflPropMarketKeyBase(row);
  if (market === preferred) return 40;
  if (preferred === "pass_yds" && market === "pass_tds") return 20;
  if (preferred === "rush_yds" && market === "rec_yds") return 10;
  if (preferred === "rec_yds" && market === "receptions") return 10;
  if ((market === "pass_yds" || market === "pass_tds") && preferred !== "pass_yds") return -80;
  return 0;
}

/**
 * GOAT-tier best-board eligibility — live BDL props only, no depth/alt junk.
 * BDL returns thousands of alts; the board must stay on featured skill mains.
 * Depth names like Sione Vaki (KR/RB scraps) must never take a UR board seat.
 *
 * @param {Record<string, unknown>|null|undefined} row
 * @param {{
 *   volumeByPlayer?: Record<string, number>|null,
 *   valueBoost?: (row: Record<string, unknown>) => number,
 * }} [opts]
 */
export function isNflGoatFeaturedBoardRow(row, opts = {}) {
  if (!row?.player || row.line == null) return false;
  if (!isNflHeadlineBoardMarket(row) && !NFL_SECONDARY_BOARD_MARKETS.has(nflPropMarketKeyBase(row))) {
    return false;
  }
  if (isNflPassMarketOnNonQb(row)) return false;
  const market = nflPropMarketKeyBase(row);
  const line = Number(row.line);
  if (!Number.isFinite(line)) return false;

  const boost = typeof opts.valueBoost === "function" ? Number(opts.valueBoost(row)) || 0 : 0;

  // Integer yard prints are BDL alt ladders — never a best-board seat.
  if (/yds/.test(String(market)) && Math.abs(line % 1) < 0.001) return false;

  // Sub-starter rush/rec scraps (Vaki 40 / 40.5). Soft Over value can still unlock.
  if (market === "rush_yds" && line < 45 && boost < 30) return false;
  if (market === "rec_yds" && line < 30 && boost < 30) return false;
  if (market === "pass_yds" && (line < 195 || line > 320)) return false;

  const volMap = opts.volumeByPlayer;
  if (volMap && typeof volMap === "object" && Object.keys(volMap).length) {
    const vol = Number(volMap[normalizePlayerKey(row.player)]);
    // Featured usage required unless the number is a true soft Over misprice.
    if (!Number.isFinite(vol) || vol < 12) {
      if (boost < 30) return false;
    }
  }
  return true;
}

/**
 * High receptions prints are almost never a smash Over on a broad board.
 * @param {Record<string, unknown>|null|undefined} row
 */
export function isNflHighReceptionsLine(row) {
  if (nflPropMarketKeyBase(row) !== "receptions") return false;
  const line = Number(row?.line);
  return Number.isFinite(line) && line >= 5.5;
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
  // Alt ladders / joke prints — never a “best props” ticket.
  if (market === "rush_yds" && Number.isFinite(line) && line >= 120) return true;
  if (market === "rec_yds" && Number.isFinite(line) && line >= 140) return true;
  if (market === "pass_yds" && Number.isFinite(line) && (line >= 360 || line <= 140)) return true;
  if (market === "receptions" && Number.isFinite(line) && line >= 7) return true;
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
export function resolveNflPlayerTeamFromIndex(playerName, teamIndex = {}, propTeam = "") {
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
  let filtered = rows.filter((p) => {
    if (rowGameIsForeign(p, scope)) return false;
    const propTeam = String(p?.team || p?.teamAbbr || "")
      .toUpperCase()
      .trim();
    const known = resolveNflPlayerTeamFromIndex(String(p?.player || ""), teamIndex, propTeam);
    if (known && rowGameConflictsWithKnownTeam(p, known)) return false;
    return true;
  });
  if (scope.size) {
    filtered = filtered.filter((p) => {
      const propTeam = String(p?.team || p?.teamAbbr || "")
        .toUpperCase()
        .trim();
      const known = resolveNflPlayerTeamFromIndex(String(p?.player || ""), teamIndex, propTeam);
      if (!known) {
        if (allow.size >= 1 && playerNameAllowed(String(p?.player || ""), allow)) return true;
        return allow.size < 1;
      }
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
  const ticketReview = isNflTicketReviewAsk(opts.question || "");
  const multiBoard = questionWantsNflMultiPropBoard(opts.question);
  const maxRows = ticketReview
    ? 160
    : Math.max(
        24,
        Math.min(Number(opts.maxRows) || (multiBoard ? 180 : 120), 240),
      );
  const tokens = playerTokensFromQuestion(opts.question || "");
  const hints = propHintsFromQuestion(opts.question || "");
  const teamIndex =
    opts.playerTeamByName && typeof opts.playerTeamByName === "object" ? opts.playerTeamByName : {};
  const scoreOpts = { multiBoard };

  let rows = filterNflPropsForMatchup(Array.isArray(props) ? props : [], {
    scope,
    rosterNames: opts.rosterNames,
    playerTeamByName: opts.playerTeamByName,
  });
  rows = rows.filter((r) => {
    if (rowMatchesScope(r, scope)) return true;
    if (!scope.size) return true;
    const known = resolveNflPlayerTeamFromIndex(String(r?.player || ""), teamIndex, "");
    if (!known) return false;
    for (const ab of expandScope([known])) {
      if (scope.has(ab)) return true;
    }
    return false;
  });
  // No game scope (week board / multi-club slip): keep only the named players
  // so foreign-game noise never reaches the prompt.
  if (!scope.size && tokens.length) {
    rows = rows.filter((r) => {
      const n = normalizePlayerKey(r?.player);
      if (!n) return false;
      const last = n.split(" ").pop();
      return tokens.some(
        (t) => n === t || n.endsWith(` ${t}`) || last === t || t.endsWith(last || "___"),
      );
    });
  }

  // GOAT returns every vendor × alt. Collapse + diversify so skill props survive the cap.
  rows = collapseNflPropsToConsensusBoard(rows);
  rows.sort((a, b) => scorePropRow(b, tokens, hints, scoreOpts) - scorePropRow(a, tokens, hints, scoreOpts));
  const head = diversifyNflPropTrimRows(rows, maxRows);
  if (!ticketReview || !tokens.length) return head;
  const named = rows.filter((r) => {
    const n = normalizePlayerKey(r?.player);
    if (!n) return false;
    const last = n.split(" ").pop();
    return tokens.some((t) => n === t || n.endsWith(` ${t}`) || last === t || t.endsWith(last || "___"));
  });
  const byKey = new Map();
  for (const r of [...head, ...named]) {
    const k = `${normalizePlayerKey(r?.player)}|${nflPropMarketKey(r)}|${r?.line}`;
    if (!byKey.has(k)) byKey.set(k, r);
  }
  return [...byKey.values()];
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

export function nflPropSameTicket(a, b) {
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
  const m = String(market || "");
  if (!/yds/.test(m) || /long|rush_rec|pass_rush/.test(m)) {
    return list;
  }
  if (/pass_yds/.test(m)) {
    // Half-point mains (211.5–263.5) beat round milestones (200/225/250/275)
    // that BDL posts as alt ladders on the same player.
    const halfMains = list.filter((r) => {
      const n = Number(r.line);
      return n >= 195 && n <= 270 && Math.abs(n % 1 - 0.5) < 0.01;
    });
    if (halfMains.length) return halfMains;
    const passMains = list.filter((r) => {
      const n = Number(r.line);
      return n >= 195 && n <= 270;
    });
    if (passMains.length) return passMains;
  }
  if (/rush_yds/.test(m)) {
    const rushMains = list.filter((r) => {
      const n = Number(r.line);
      return n >= 18 && n <= 110;
    });
    if (rushMains.length) return rushMains;
  }
  if (/rec_yds/.test(m)) {
    const recMains = list.filter((r) => {
      const n = Number(r.line);
      return n >= 15 && n <= 125;
    });
    if (recMains.length) return recMains;
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
  const passYds = /pass_yds/.test(String(market || ""));
  // Densest peer cluster with a tight band for pass yards so 250 alts cannot
  // swallow a 211.5–218.5 main. When books only post sparse mains, fall back
  // to the high print so the take can fade it.
  let bestScore = -1;
  let bestCenter = Number(list[0].line);
  for (const r of list) {
    const line = Number(r.line);
    const band = passYds ? 8 : nflPropPeerBand(market, line);
    const score = list.filter((x) => Math.abs(Number(x.line) - line) <= band).length;
    if (score > bestScore || (score === bestScore && line < bestCenter)) {
      bestScore = score;
      bestCenter = line;
    }
  }
  if (bestScore >= 2) {
    const band = passYds ? 8 : nflPropPeerBand(market, bestCenter);
    const cluster = list.filter((r) => Math.abs(Number(r.line) - bestCenter) <= band);
    const pool = cluster.length ? cluster : list;
    return pool.reduce((best, row) => (Number(row.line) > Number(best.line) ? row : best), pool[0]);
  }
  return list.reduce((best, row) => (Number(row.line) > Number(best.line) ? row : best), list[0]);
}

const NFL_NAME_SUFFIX_RE = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;

/**
 * Last name for face copy — skip Jr/Sr/II/III so Mahomes III never prints as "III".
 * @param {string} name
 */
export function shortPlayerLast(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return String(name || "this player");
  let i = parts.length - 1;
  while (i > 0 && NFL_NAME_SUFFIX_RE.test(parts[i])) i -= 1;
  return parts[i] || parts[parts.length - 1];
}

function otherBookLines(unique, line) {
  const others = unique.filter((n) => n !== Number(line)).sort((a, b) => a - b);
  if (!others.length) return String(line);
  return others.join("/");
}

/**
 * Every prop ticket needs Over or Under.
 * Order: injury → book disagreement → GOAT pace/D/fantasy → juice → opener default.
 *
 * @param {Record<string, unknown>} row
 * @param {Array<Record<string, unknown>>} [allRows]
 * @param {{
 *   openerWeek?: boolean,
 *   briefcase?: Record<string, unknown>|null,
 *   edge?: ReturnType<typeof buildNflPropEdgeForRow>|null,
 * }} [opts]
 * @returns {{ side: "Over"|"Under", why: string }}
 */
export function inferNflPropTicketSide(row, allRows = [], opts = {}) {
  const openerWeek = Boolean(opts.openerWeek);
  const line = Number(row?.line);
  const marketBase = nflPropMarketKeyBase(row);
  const edge =
    opts.edge ||
    (opts.briefcase ? buildNflPropEdgeForRow(row, marketBase, opts.briefcase) : null);

  if (edge?.injuryHard && edge.injuryWhy) {
    return { side: "Under", why: edge.injuryWhy };
  }

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

  const evidence = voteNflPropEdgeSide(row, marketBase, edge, { openerWeek });
  const receptionsFade =
    evidence?.side === "Over" && isNflHighReceptionsLine(row)
      ? { side: "Under", why: `${line} receptions is a high catch number — I'd rather fade it.` }
      : evidence;
  const over = Number(row?.overOdds);
  const under = Number(row?.underOdds);
  const priceSignal =
    Number.isFinite(over) && Number.isFinite(under) && Math.abs(over - under) >= 20
      ? over > under
        ? { side: "Over", why: "Over is hanging the better price." }
        : { side: "Under", why: "Under is hanging the better price." }
      : null;
  const venue = resolveNflPropVenue(row, {
    playerTeam: opts.playerTeam || row?.team || row?.teamAbbr || null,
    venue: opts.venue || null,
  });
  const playerSpread = resolveNflPropPlayerSpread(row, opts.briefcase || null, {
    playerTeam: opts.playerTeam || row?.team || row?.teamAbbr || null,
    venue,
    playerSpread: opts.playerSpread ?? null,
  });
  const hist = nflOpenHistoryTossUpLean({
    player: String(row?.player || ""),
    marketBase,
    venue,
    playerSpread,
  });
  const strongHist = ["price", "player", "venue", "spread"].includes(hist.confidence);
  /** @type {Array<{ label: string, side: string, why: string }>} */
  const signals = [];
  if (receptionsFade) signals.push({ label: "Pace", side: receptionsFade.side, why: receptionsFade.why });
  if (priceSignal) signals.push({ label: "Price", side: priceSignal.side, why: priceSignal.why });
  if (strongHist) signals.push({ label: "Open history", side: hist.side, why: hist.why });
  const signalSides = new Set(signals.map((s) => s.side));
  if (signals.length >= 2 && signalSides.size > 1) {
    return {
      side: "Pass",
      conflict: true,
      why: signals.map((s) => `${s.label} says ${s.side}: ${s.why}`).join(" "),
    };
  }

  if (receptionsFade) {
    return receptionsFade;
  }

  if (isNflHighReceptionsLine(row)) {
    return { side: "Under", why: `${line} receptions is a high catch number.` };
  }

  if (nflPropMarketKey(row) === "pass_yds" && Number.isFinite(line) && line >= 275) {
    return { side: "Under", why: `${line} is a high passing-yards number.` };
  }
  if (priceSignal) return priceSignal;

  // Soft fantasy/pace lean before the opener Under default — don't ignore a 268 proj on 264.5.
  if (edge?.fantasyPace != null && Number.isFinite(line)) {
    const gap = line - Number(edge.fantasyPace);
    if (gap <= -2) {
      return {
        side: "Over",
        why: `Projection ~${edge.fantasyPace} clears ${line}.`,
      };
    }
    if (gap >= 2) {
      return {
        side: "Under",
        why: `Projection ~${edge.fantasyPace} sits under ${line}.`,
      };
    }
  }
  if (edge?.pace != null && Number.isFinite(line)) {
    const gap = line - Number(edge.pace);
    if (gap <= -4) {
      return {
        side: "Over",
        why: `Pace ~${edge.pace}${edge.paceSource ? ` (${edge.paceSource})` : ""} clears ${line}.`,
      };
    }
    if (gap >= 4) {
      return {
        side: "Under",
        why: `Pace ~${edge.pace}${edge.paceSource ? ` (${edge.paceSource})` : ""} sits under ${line}.`,
      };
    }
  }

  // Toss-up: open-line settlement priors (2025 + 2026 YTD ADP top-75)
  // — market / price EV / venue / spread / player instead of blanket Under.
  if (openerWeek && hist.confidence === "neutral") {
    return {
      side: "Under",
      why: "Close number — no clear smash. Speculative lean Under.",
    };
  }
  if (openerWeek && hist.confidence !== "neutral") {
    return {
      side: hist.side,
      why: `${hist.why} Speculative opener lean.`,
    };
  }
  return { side: hist.side, why: hist.why };
}

/**
 * Collapse vendor/alt spam to one consensus row per player+market.
 * BDL GOAT returns every book × every alt — Ask must line-shop, not drown in Dak 250 ladders.
 * @param {Array<Record<string, unknown>>} props
 * @returns {Array<Record<string, unknown>>}
 */
export function collapseNflPropsToConsensusBoard(props) {
  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const byKey = new Map();
  for (const row of Array.isArray(props) ? props : []) {
    if (!row?.player || row.line == null) continue;
    const key = `${normalizePlayerKey(row.player)}|${nflPropMarketKey(row)}`;
    const list = byKey.get(key) || [];
    list.push(row);
    byKey.set(key, list);
  }
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (const list of byKey.values()) {
    const priced = list.filter((r) => r.underOdds != null || r.overOdds != null);
    const pick = pickNflConsensusMarketRow(priced.length ? priced : list);
    if (pick) out.push(pick);
  }
  return out;
}

/**
 * Round-robin across market families so pass_yds alts cannot monopolize the prompt budget.
 * @param {Array<Record<string, unknown>>} rows already scored high→low
 * @param {number} maxRows
 */
export function diversifyNflPropTrimRows(rows, maxRows) {
  const limit = Math.max(1, Number(maxRows) || 56);
  const list = Array.isArray(rows) ? rows : [];
  if (list.length <= limit) return list;

  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const buckets = new Map();
  for (const row of list) {
    const fam = nflPropMarketKeyBase(row) || "other";
    const arr = buckets.get(fam) || [];
    arr.push(row);
    buckets.set(fam, arr);
  }
  const order = [
    "pass_yds",
    "rec_yds",
    "rush_yds",
    "pass_tds",
    "receptions",
    "anytime_td",
    "rush_rec_yds",
    "rec_tds",
    "first_td",
  ];
  const families = [
    ...order.filter((k) => buckets.has(k)),
    ...[...buckets.keys()].filter((k) => !order.includes(k)),
  ];
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  const seen = new Set();
  let guard = 0;
  while (out.length < limit && guard < limit * families.length + 10) {
    guard += 1;
    let added = false;
    for (const fam of families) {
      if (out.length >= limit) break;
      const bucket = buckets.get(fam);
      if (!bucket?.length) continue;
      const row = bucket.shift();
      const key = `${normalizePlayerKey(row.player)}|${nflPropMarketKey(row)}|${row.line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row);
      added = true;
    }
    if (!added) break;
  }
  return out;
}

/**
 * @param {string} [question]
 * @returns {number|null}
 */
export function requestedNflPropsBoardCount(question) {
  const q = String(question || "").toLowerCase();
  const range = q.match(/\b(\d+)\s*[-–to]{1,3}\s*(\d+)\s*(player\s+)?props?\b/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) return Math.max(a, b);
  }
  const n =
    q.match(/\b(?:best|top|give\s+me|list|provide)\s+(\d+)\s*(?:bets?\s+)?(?:player\s+)?props?\b/) ||
    q.match(/\b(?:best|top|give\s+me|list|provide)\s+(\d+)\s*(?:player\s+)?(?:props?|bets?)\b/) ||
    q.match(/\b(\d+)\s*(?:bets?\s+)?(?:player\s+)?props?\b/) ||
    q.match(/\b(\d+)\s*(?:player\s+)?(?:props?|bets?)\b/);
  if (n) {
    const v = Number(n[1]);
    if (Number.isFinite(v) && v >= 2 && v <= 8) return v;
  }
  return null;
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
 * @param {Record<string, unknown>|null} [briefcase]
 */
export function formatNflSidedPropBoardList(rows, allRows = [], openerWeek = false, briefcase = null) {
  return (rows || [])
    .map((row, i) => {
      const t = inferNflPropTicketSide(row, allRows, { openerWeek, briefcase });
      const last = shortPlayerLast(row.player);
      if (t.side === "Pass") {
        return `${i + 1}. ${last} — no side on ${row.line} (${prettyPropLabel(row)})`;
      }
      return `${i + 1}. ${last} ${t.side.toLowerCase()} ${row.line} (${prettyPropLabel(row)})`;
    })
    .join("\n");
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Array<Record<string, unknown>>} allRows
 * @param {boolean} openerWeek
 * @param {Record<string, unknown>|null} [briefcase]
 */
export function buildNflSidedBoardConflictNotes(rows, allRows = [], openerWeek = false, briefcase = null) {
  const sided = (rows || []).map((row) => ({
    row,
    side: inferNflPropTicketSide(row, allRows, { openerWeek, briefcase }).side,
    market: nflPropMarketKeyBase(row),
  }));
  return detectNflBoardScriptConflicts(sided);
}

/**
 * Friend-text copy: one primary Over/Under plus a sided 3–5 board.
 * Directional and short — GOAT evidence drives the side; face stays readable.
 * @param {{
 *   primary: Record<string, unknown>,
 *   allRows?: Array<Record<string, unknown>>,
 *   boardRows?: Array<Record<string, unknown>>,
 *   openerWeek?: boolean,
 *   briefcase?: Record<string, unknown>|null,
 *   missingNames?: string[],
 * }} opts
 */
export function buildNflSidedPropRecoverCopy(opts) {
  const primary = opts.primary;
  const allRows = opts.allRows || [];
  const openerWeek = Boolean(opts.openerWeek);
  const briefcase = opts.briefcase || null;
  const marketBase = nflPropMarketKeyBase(primary);
  const edge = briefcase ? buildNflPropEdgeForRow(primary, marketBase, briefcase) : null;
  const ticket = inferNflPropTicketSide(primary, allRows, { openerWeek, briefcase, edge });
  const last = shortPlayerLast(primary.player);
  const line = primary.line;
  const propLabel = prettyPropLabel(primary);
  const conflicted = ticket.side === "Pass" || Boolean(ticket.conflict);
  const lean = conflicted
    ? "Pass. The reads on this number disagree."
    : `Lean: ${last} ${ticket.side.toLowerCase()} ${line} ${propLabel}.`.slice(0, 140);
  const call = conflicted ? "PASS" : `${last.toUpperCase()} ${ticket.side.toUpperCase()} ${line}`;
  const killLine =
    ticket.side === "Under"
      ? "If your number is a lot lower, the under gets worse."
      : "If your number is a lot higher, the over gets worse.";
  const openerLine = openerWeek
    ? "Early season — treat last year's defense ranks as a prior only."
    : killLine;
  const boardRows = [primary, ...(opts.boardRows || []).filter(Boolean)].filter(Boolean);
  const list = formatNflSidedPropBoardList(boardRows, allRows, openerWeek, briefcase);
  const conflicts = buildNflSidedBoardConflictNotes(boardRows, allRows, openerWeek, briefcase);
  const injuryNote = edge?.injuryStatus
    ? `${last} injury: ${edge.injuryStatus}.`
    : "Check inactives before you bet it.";
  const thinEvidence = /close number|no clear smash|early season|no smash over|open history|speculative opener lean/i.test(
    String(ticket.why || ""),
  );
  const missing = [...new Set((opts.missingNames || []).map((n) => String(n || "").trim()).filter(Boolean))];
  const missingRows = missing.map((name, i) => `${boardRows.length + i + 1}. ${name} — no line posted`).join("\n");
  const boardText = [list, missingRows].filter(Boolean).join("\n");
  const whyNow = [
    boardText ? `Board:\n${boardText}` : ticket.why,
    ticket.why,
    conflicts.length ? conflicts.join(" ") : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return {
    ticket,
    lean,
    call,
    callType: "prop",
    confidence: "Speculative",
    whyNow,
    edge: conflicted
      ? ticket.why
      : thinEvidence
        ? "Thin edge — Speculative. Shop the number or pass."
        : killLine,
    // Filled for schema/repair; married delivery slims these so the card doesn't echo the board.
    analysis: {
      matchupAnalysis: `${last} ${propLabel} ${ticket.side.toLowerCase()} ${line}. ${ticket.why}`,
      injuryContext: injuryNote,
      marketContext: list || ticket.why,
      lineMovement: "Stick to a posted number. Don't invent movement.",
      statisticalEdge:
        edge?.fantasyPace != null || edge?.pace != null
          ? `${edge.fantasyPace != null ? `Proj ~${edge.fantasyPace}` : ""}${
              edge.pace != null
                ? `${edge.fantasyPace != null ? " · " : ""}Pace ~${edge.pace}${
                    edge.paceSource ? ` (${edge.paceSource})` : ""
                  }`
                : ""
            }.`.trim()
          : thinEvidence
            ? "No clear proj/pace smash on this number."
            : openerLine,
    },
    caveats: [
      openerWeek ? openerLine : "",
      killLine,
      ...conflicts,
      injuryNote.startsWith("Check inactives") ? "" : injuryNote,
      missing.length ? `No line posted: ${missing.join(", ")}.` : "",
      thinEvidence ? "No smash edge — shop your number or pass." : "",
    ].filter(Boolean),
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
 *   briefcase?: Record<string, unknown>|null,
 *   excludePlayerKeys?: Set<string>|string[],
 *   priorTicketLines?: Array<{ playerKey: string, line: number }>,
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
  const excludePlayerKeys =
    opts.excludePlayerKeys instanceof Set
      ? opts.excludePlayerKeys
      : new Set(
          [...(opts.excludePlayerKeys || [])].map((k) => normalizePlayerKey(k)).filter(Boolean),
        );
  const priorTicketLines = Array.isArray(opts.priorTicketLines) ? opts.priorTicketLines : [];
  const requested = requestedNflPropsBoardCount(opts.question);
  const maxTickets = Math.max(
    2,
    Math.min(Number(opts.maxTickets) || requested || 5, 6),
  );
  const tokens = playerTokensFromQuestion(opts.question || "");
  const hints = propHintsFromQuestion(opts.question || "");
  const volumeByPlayer = buildNflPropVolumeByPlayer(opts.briefcase);
  const hasFeaturedUsage = Object.values(volumeByPlayer || {}).some(
    (n) => Number.isFinite(Number(n)) && Number(n) > 0,
  );
  const openerWeek = Boolean(opts.openerWeek);
  const valueBoost = (row) =>
    nflPropBoardValueBoost(row, Array.isArray(props) ? props : [], opts.briefcase, { openerWeek });
  const scoreOpts = {
    multiBoard: questionWantsNflMultiPropBoard(opts.question) || maxTickets >= 4,
    volumeByPlayer: hasFeaturedUsage ? volumeByPlayer : null,
    valueBoost,
  };

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
  if (excludePlayerKeys.size) {
    rows = rows.filter((p) => !nflPlayerKeyIsExcluded(String(p?.player || ""), excludePlayerKeys));
  }
  if (priorTicketLines.length) {
    rows = rows.filter((p) => !nflPropRowNearPriorBoardTicket(p, priorTicketLines, 3));
  }
  if (!questionWantsNflPeriodProps(opts.question)) {
    rows = rows.filter((p) => !isNflPeriodPropRow(p));
  }
  if (!questionWantsNflNoveltyProps(opts.question)) {
    rows = rows.filter((p) => !isNflNoveltyBoardProp(p));
  }
  const namedTokensEarly = nflAskNamedPlayerHits(opts.question || "", opts.playerTeamByName).tokens;
  const rowsBeforeGoat = rows;
  // Best-props boards: full-game headline yards/TDs only when we have enough.
  // Receptions (esp. Engram over 8) are not default “best” tickets.
  if (scoreOpts.multiBoard) {
    const headline = rows.filter((p) => isNflHeadlineBoardMarket(p));
    // On batch-2 excludes, don't require a fat headline pool — take what's left.
    const minHeadline = excludePlayerKeys.size || priorTicketLines.length ? 1 : Math.min(maxTickets, 3);
    if (headline.length >= minHeadline) rows = headline;
    else {
      rows = rows.filter(
        (p) =>
          isNflHeadlineBoardMarket(p) ||
          NFL_SECONDARY_BOARD_MARKETS.has(nflPropMarketKeyBase(p)),
      );
    }
    // GOAT tier is mandatory — never fall back to depth/alt rows when the pool is thin.
    // Explicitly named players keep their rows even when under the GOAT floor.
    rows = rows.filter((p) => {
      if (isNflPassMarketOnNonQb(p)) return false;
      if (
        namedTokensEarly.length &&
        namedTokensEarly.some((t) => {
          const n = String(p?.player || "").toLowerCase();
          return n.includes(t) || n.split(/\s+/).pop() === t;
        })
      ) {
        return true;
      }
      return isNflGoatFeaturedBoardRow(p, {
        volumeByPlayer: scoreOpts.volumeByPlayer,
        valueBoost,
      });
    });
  }

  // Consensus first — then score. Do not let vendor alt ladders crowd skill markets.
  rows = collapseNflPropsToConsensusBoard(rows);
  const scoredBoard = [...rows].sort(
    (a, b) => scorePropRow(b, tokens, hints, scoreOpts) - scorePropRow(a, tokens, hints, scoreOpts),
  );
  const namedTokens = namedTokensEarly.length
    ? namedTokensEarly
    : nflAskNamedPlayerHits(opts.question || "", opts.playerTeamByName).tokens;
  if (namedTokens.length) {
    /** @type {Array<Record<string, unknown>>} */
    const namedPicked = [];
    const namedSeen = new Set();
    const namedPool = collapseNflPropsToConsensusBoard(
      rowsBeforeGoat.filter((p) => {
        if (isNflPassMarketOnNonQb(p)) return false;
        const n = String(p?.player || "").toLowerCase();
        return namedTokens.some((t) => n.includes(t) || n.split(/\s+/).pop() === t);
      }),
    );
    const namedScored = [...namedPool].sort(
      (a, b) => scorePropRow(b, tokens, hints, scoreOpts) - scorePropRow(a, tokens, hints, scoreOpts),
    );
    for (const row of namedScored.length ? namedScored : scoredBoard) {
      const n = String(row?.player || "").toLowerCase();
      const hit = namedTokens.some((t) => n.includes(t) || n.split(/\s+/).pop() === t);
      if (!hit) continue;
      const playerKey = normalizePlayerKey(row.player);
      if (namedSeen.has(playerKey)) continue;
      namedPicked.push(row);
      namedSeen.add(playerKey);
      if (namedPicked.length >= maxTickets) break;
    }
    if (namedPicked.length) {
      return orderNflPropsBoardByPrimaryEdge(namedPicked, Array.isArray(props) ? props : [], {
        openerWeek,
        briefcase: opts.briefcase,
        inferSide: inferNflPropTicketSide,
        marketKey: nflPropMarketKeyBase,
        sameTicket: nflPropSameTicket,
        peerLines: nflPropPeerLines,
        pickConsensus: pickNflConsensusMarketRow,
      }).slice(0, maxTickets);
    }
  }

  // One best market per player first — never let Maye rush steal the seat from Maye pass.
  /** @type {Map<string, Record<string, unknown>>} */
  const bestByPlayer = new Map();
  for (const row of scoredBoard) {
    const playerKey = normalizePlayerKey(row.player);
    if (!playerKey || bestByPlayer.has(playerKey)) continue;
    bestByPlayer.set(playerKey, row);
  }
  let playerBest = [...bestByPlayer.values()].sort(
    (a, b) => scorePropRow(b, tokens, hints, scoreOpts) - scorePropRow(a, tokens, hints, scoreOpts),
  );

  // Batch-2: drop weak leftover padding after prior names are excluded.
  if (excludePlayerKeys.size) {
    const strict = playerBest.filter((row) =>
      nflPropBatch2PassesFloor(row, {
        valueBoost: valueBoost(row),
        volume: Number(volumeByPlayer?.[normalizePlayerKey(row.player)]) || 0,
        edgeScore: scoreNflPropPrimaryEdge(row, Array.isArray(props) ? props : [], inferNflPropTicketSide, nflPropMarketKeyBase, {
          openerWeek,
          briefcase: opts.briefcase,
          peerLines: nflPropPeerLines,
        }),
        strict: true,
      }),
    );
    const loose =
      strict.length >= 2
        ? strict
        : playerBest.filter((row) =>
            nflPropBatch2PassesFloor(row, {
              valueBoost: valueBoost(row),
              volume: Number(volumeByPlayer?.[normalizePlayerKey(row.player)]) || 0,
              edgeScore: scoreNflPropPrimaryEdge(row, Array.isArray(props) ? props : [], inferNflPropTicketSide, nflPropMarketKeyBase, {
                openerWeek,
                briefcase: opts.briefcase,
                peerLines: nflPropPeerLines,
              }),
              strict: false,
            }),
          );
    if (loose.length) playerBest = loose;
  }

  /** Fill one ticket per market family first (WR/RB/QB), then allow a second WR/QB. */
  const familyPriority = [
    "rec_yds",
    "rush_yds",
    "pass_yds",
    "pass_tds",
    "receptions",
    "rush_rec_yds",
    "anytime_td",
    "rec_tds",
    "first_td",
  ];
  const familyCap = {
    pass_yds: 2,
    // Ask for 5 → need two WR seats; default boards still prefer one featured WR.
    rec_yds: scoreOpts.multiBoard && maxTickets >= 5 ? 2 : scoreOpts.multiBoard ? 1 : 2,
    rush_yds: maxTickets >= 5 ? 2 : 1,
    rush_rec_yds: 1,
    pass_tds: 1,
    receptions: 1,
    rec_tds: 1,
    anytime_td: 1,
    first_td: 1,
  };
  /** @type {Array<Record<string, unknown>>} */
  const picked = [];
  const seenPlayers = new Set();
  /** @type {Record<string, number>} */
  const usedFamily = {};

  const tryTake = (row, { allowValueSeat = false } = {}) => {
    if (picked.length >= maxTickets) return false;
    const playerKey = normalizePlayerKey(row.player);
    if (seenPlayers.has(playerKey)) return false;
    const fam = nflPropMarketKeyBase(row) || "other";
    let cap = familyCap[fam] ?? 1;
    if (allowValueSeat && fam === "rec_yds" && scoreOpts.multiBoard) cap = 2;
    const used = usedFamily[fam] || 0;
    if (used >= cap) return false;
    if (used >= 1 && picked.length < Math.min(maxTickets, 3) && !allowValueSeat) return false;
    if (allowValueSeat && valueBoost(row) < 30) return false;
    // No-usage depth (Vaki / practice-squad RBs) never pad a best-props board.
    if (
      scoreOpts.multiBoard &&
      !isNflGoatFeaturedBoardRow(row, {
        volumeByPlayer: scoreOpts.volumeByPlayer,
        valueBoost,
      })
    ) {
      return false;
    }
    if (
      scoreOpts.multiBoard &&
      hasFeaturedUsage &&
      (fam === "rec_yds" || fam === "receptions" || fam === "rush_yds") &&
      !Number.isFinite(Number(volumeByPlayer[playerKey])) &&
      valueBoost(row) < 30 &&
      !allowValueSeat
    ) {
      return false;
    }
    // Value seat is for soft Overs (buy the number), not padding fades.
    if (allowValueSeat) {
      const edge = buildNflPropEdgeForRow(row, fam, opts.briefcase);
      const vote = voteNflPropEdgeSide(row, fam, edge, { openerWeek });
      if (!vote || vote.side !== "Over") return false;
    }
    picked.push(row);
    seenPlayers.add(playerKey);
    usedFamily[fam] = used + 1;
    return true;
  };

  for (const fam of familyPriority) {
    for (const row of playerBest) {
      if ((nflPropMarketKeyBase(row) || "other") !== fam) continue;
      tryTake(row);
    }
  }
  for (const row of playerBest) tryTake(row);
  // Second pass: depth / secondary only when the number is a real misprice.
  if (scoreOpts.multiBoard && picked.length < maxTickets) {
    for (const row of playerBest) {
      if (picked.length >= maxTickets) break;
      tryTake(row, { allowValueSeat: true });
    }
  }

  if (picked.length < Math.min(maxTickets, playerBest.length)) {
    for (const row of playerBest) {
      if (picked.length >= maxTickets) break;
      if (picked.includes(row)) continue;
      const playerKey = normalizePlayerKey(row.player);
      if (seenPlayers.has(playerKey)) continue;
      const fam = nflPropMarketKeyBase(row) || "other";
      const cap = familyCap[fam] ?? 1;
      if ((usedFamily[fam] || 0) >= cap) continue;
      const boost = valueBoost(row);
      // No-usage depth pads the board unless the line is actually soft/hard vs pace.
      if (
        scoreOpts.multiBoard &&
        hasFeaturedUsage &&
        (fam === "rec_yds" || fam === "receptions" || fam === "rush_yds") &&
        !Number.isFinite(Number(volumeByPlayer[playerKey])) &&
        boost < 30
      ) {
        continue;
      }
      picked.push(row);
      seenPlayers.add(playerKey);
      usedFamily[fam] = (usedFamily[fam] || 0) + 1;
    }
  }

  // Elite primary: strongest evidence stack, then high-print only if still an Under fade.
  let ordered = orderNflPropsBoardByPrimaryEdge(picked, Array.isArray(props) ? props : [], {
    openerWeek,
    briefcase: opts.briefcase,
    inferSide: inferNflPropTicketSide,
    marketKey: nflPropMarketKeyBase,
    sameTicket: nflPropSameTicket,
    peerLines: nflPropPeerLines,
    pickConsensus: pickNflConsensusMarketRow,
  });
  ordered = diversifyNflPropsBoardSides(ordered, Array.isArray(props) ? props : [], playerBest, {
    openerWeek,
    briefcase: opts.briefcase,
  });
  return ordered.slice(0, maxTickets);
}

/**
 * If the whole board is Unders with thin why, swap in one Over that has real evidence.
 * @param {Array<Record<string, unknown>>} picked
 * @param {Array<Record<string, unknown>>} allRows
 * @param {Array<Record<string, unknown>>} pool
 * @param {{ openerWeek?: boolean, briefcase?: Record<string, unknown>|null }} opts
 */
export function diversifyNflPropsBoardSides(picked, allRows, pool, opts = {}) {
  if (!Array.isArray(picked) || picked.length < 3) return picked || [];
  const openerWeek = Boolean(opts.openerWeek);
  const briefcase = opts.briefcase || null;
  const sides = picked.map((row) =>
    inferNflPropTicketSide(row, allRows, { openerWeek, briefcase }),
  );
  if (sides.some((s) => s.side === "Over")) return picked;

  const pickedKeys = new Set(picked.map((r) => normalizePlayerKey(r.player)));
  const overCand = (pool || []).find((row) => {
    const key = normalizePlayerKey(row?.player);
    if (!key || pickedKeys.has(key)) return false;
    if (
      !isNflGoatFeaturedBoardRow(row, {
        volumeByPlayer: buildNflPropVolumeByPlayer(briefcase),
      })
    ) {
      return false;
    }
    const t = inferNflPropTicketSide(row, allRows, { openerWeek, briefcase });
    return t.side === "Over" && !/close number|no clear smash|early season|no smash/i.test(t.why);
  });
  if (!overCand) return picked;

  const thinIdx =
    [...sides]
      .map((s, i) => ({ s, i }))
      .reverse()
      .find((x) => /close number|early season|no smash|no clear smash/i.test(x.s.why))?.i ??
    picked.length - 1;
  const next = [...picked];
  next[thinIdx] = overCand;
  return orderNflPropsBoardByPrimaryEdge(next, allRows, {
    openerWeek,
    briefcase,
    inferSide: inferNflPropTicketSide,
    marketKey: nflPropMarketKeyBase,
    sameTicket: nflPropSameTicket,
    peerLines: nflPropPeerLines,
    pickConsensus: pickNflConsensusMarketRow,
  });
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
