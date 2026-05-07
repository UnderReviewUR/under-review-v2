/**
 * NBA shadow telemetry: likely invented player names (no QA failure, no output mutation).
 * Matchup-focused + explicit claim sentences only.
 */

/** Lowercase multi-token phrases that look like names but are places / brands / schedule. */
const DENY_EXACT_PHRASE = new Set(
  [
    "new york",
    "los angeles",
    "san antonio",
    "san francisco",
    "golden state",
    "oklahoma city",
    "new orleans",
    "salt lake city",
    "las vegas",
    "long island",
    "north america",
    "united states",
    "eastern conference",
    "western conference",
    "first half",
    "second half",
    "third quarter",
    "fourth quarter",
    "game one",
    "game two",
    "game three",
    "game four",
    "game five",
    "game six",
    "game seven",
    "game 1",
    "game 2",
    "game 3",
    "game 4",
    "game 5",
    "game 6",
    "game 7",
    "madison square",
    "crypto com",
    "barclays center",
    "td garden",
    "fiserv forum",
    "little caesars",
    "footprint center",
    "crypto arena",
    "the play",
    "best look",
    "high risk",
    "medium confidence",
    "speculative confidence",
    "same game",
    "same-game",
    "second unit",
    "third string",
    "pick and roll",
    "pick-and-roll",
    "game script",
    "pace game",
    "free throw",
    "three point",
    "three-pointer",
    "three pointer",
    "prime time",
    "prime-time",
    "prime time",
    "national tv",
    "opening night",
    "trade deadline",
    "draft capital",
    "draft pick",
    "draft picks",
    "general manager",
    "assistant coach",
    "head coach",
    "assistant coaches",
    "front office",
    "trade machine",
    "salary cap",
    "luxury tax",
    "bird rights",
    // League office — tune if noisy
    "adam silver",
    "michelle roberts",
  ].map((s) => s.toLowerCase()),
);

/** Single tokens that are almost never player names in isolation when paired as City Team */
const DENY_TOKEN = new Set(
  [
    "game",
    "season",
    "series",
    "round",
    "playoffs",
    "finals",
    "conference",
    "division",
    "championship",
    "overtime",
    "knicks",
    "lakers",
    "celtics",
    "nets",
    "warriors",
    "sixers",
    "heat",
    "suns",
    "nuggets",
    "clippers",
    "mavericks",
    "rockets",
    "spurs",
    "grizzlies",
    "pelicans",
    "timberwolves",
    "thunder",
    "trail",
    "blazers",
    "jazz",
    "kings",
    "hawks",
    "hornets",
    "cavaliers",
    "pistons",
    "pacers",
    "magic",
    "wizards",
    "raptors",
    "bulls",
    "bucks",
    "west",
    "east",
    "total",
    "spread",
    "clock",
    "arena",
    "center",
    "stadium",
    "garden",
    "forum",
    "crypto",
    "bankers",
    "life",
    "wells",
    "fargo",
    "smoothie",
    "little",
    "caesars",
    "footprint",
    "rocket",
    "mortgage",
    "fieldhouse",
    "house",
    "spectrum",
    "paycom",
    "moda",
    "state",
    "farm",
    "capital",
    "ball",
  ].map((s) => s.toLowerCase()),
);

/** Leading tokens that start betting prose lines — must not begin a player-name candidate. */
const BAD_LEADING_TOKEN = new Set(
  [
    "hello",
    "lean",
    "take",
    "fade",
    "watch",
    "game",
    "the",
    "back",
    "look",
    "high",
    "risk",
    "implied",
    "books",
    "eastern",
    "western",
    "new",
    "los",
    "san",
    "first",
    "second",
    "third",
    "fourth",
    "same",
    "under",
    "over",
    "pace",
    "travel",
    "totals",
    "intensity",
    "conference",
    "finals",
    "noise",
    "games",
    "style",
    "density",
    "historically",
    "anything",
    "whistle",
    "defense",
    "rotation",
    "with",
    "when",
    "if",
    "for",
    "from",
    "that",
    "this",
    "lag",
    "something",
    "prime",
    "national",
    "opening",
    "trade",
    "draft",
    "general",
    "assistant",
    "head",
    "front",
    "pick",
    "picks",
    "salary",
    "luxury",
    "bird",
    "still",
    "tilt",
    "name",
    "check",
    "chaos",
    "unrelated",
    "soft",
    "pivot",
    "team",
    "support",
    "supports",
    "environment",
  ].map((s) => s.toLowerCase()),
);

function cleanWordToken(t) {
  return String(t || "")
    .replace(/^[^\w'-]+|[^\w'-]+$/g, "")
    .replace(/^['"]+|['"]+$/g, "");
}

function isNameLikeToken(t) {
  const w = cleanWordToken(t);
  if (w.length < 2) return false;
  return /^[A-Z][a-zA-Z'-]*(?:-[A-Z][a-zA-Z'-]*)*$/.test(w);
}

/**
 * Extract 2–3 token capitalized name-like spans (skip single-token names).
 * Sliding window so "Lean Tyrese Maxey" yields Tyrese Maxey, not Lean Tyrese.
 * @param {string} sentence
 * @returns {string[]}
 */
export function extractNameCandidates(sentence) {
  const raw = String(sentence || "").trim();
  if (!raw) return [];
  const tokens = raw.split(/\s+/).filter(Boolean);
  /** @type {string[]} */
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    const t0 = tokens[i];
    const t1 = tokens[i + 1];
    const t2 = tokens[i + 2];

    if (isNameLikeToken(t0) && t1 && isNameLikeToken(t1) && t2 && isNameLikeToken(t2)) {
      const a = cleanWordToken(t0);
      const b = cleanWordToken(t1);
      const c = cleanWordToken(t2);
      const fl = a.toLowerCase();
      if (!BAD_LEADING_TOKEN.has(fl)) {
        const three = `${a} ${b} ${c}`;
        if (candidatePassesDenylist(three)) {
          out.push(three);
          i += 3;
          continue;
        }
      }
    }

    if (isNameLikeToken(t0) && t1 && isNameLikeToken(t1)) {
      const a = cleanWordToken(t0);
      const b = cleanWordToken(t1);
      const fl = a.toLowerCase();
      if (!BAD_LEADING_TOKEN.has(fl)) {
        const two = `${a} ${b}`;
        if (candidatePassesDenylist(two)) {
          out.push(two);
          i += 2;
          continue;
        }
      }
    }

    i += 1;
  }

  return [...new Set(out)];
}

/**
 * @param {string} sentence
 * @returns {"high"|"low"|null}
 */
export function classifyClaimConfidence(sentence) {
  const t = String(sentence || "");
  const highProp =
    /\b(?:over|under)\s+\d+(?:\.\d+)?\b/i.test(t) ||
    /\b\d+(?:\.\d+)?\s+(?:pts|points|rebounds?|assists?|PRA|pra|three|threes|blocks?|steals?)\b/i.test(t) ||
    /\b(?:prop|props|parlay|leg|line|posted\s+line|market\s+line)\b/i.test(t);
  const highInj =
    /\b(?:ruled\s+out|is\s+out|will\s+not\s+play|inactive|probable|questionable|doubtful|game[- ]time|availability|injury\s+report)\b/i.test(t);

  if (highProp || highInj) return "high";

  const lowStat =
    /\b(?:averaging|per\s+game|season\s+average|last\s+\d+\s+games?|usage|minutes|rotation|role)\b/i.test(t);

  if (lowStat) return "low";

  return null;
}

/**
 * @param {string} candidate normalized pretty string
 */
function candidatePassesDenylist(candidate) {
  const lower = candidate.trim().toLowerCase();
  if (DENY_EXACT_PHRASE.has(lower)) return false;
  const tokens = lower.split(/\s+/);
  if (tokens.some((tok) => DENY_TOKEN.has(tok))) return false;
  return true;
}

/**
 * Build lowercase full-name keys for verified union (same slate scope as grounding snapshot).
 * @param {{ verifiedPlayerToTeam?: Map<string, string> } | null} snapshot
 */
export function buildAllowlistLowerSetFromSnapshot(snapshot) {
  const set = new Set();
  if (!snapshot?.verifiedPlayerToTeam) return set;
  for (const k of snapshot.verifiedPlayerToTeam.keys()) {
    if (k) set.add(k);
  }
  return set;
}

/**
 * Shadow scan only — does not mutate text or affect QA critical codes.
 * @param {string} text
 * @param {object} ctx
 * @param {Set<string>} ctx.allowlistLower
 * @param {[string, string]|null} ctx.matchupTeams upper abbrev pair
 * @returns {{ count: number, events: Array<object> }}
 */
export function scanNbaInventedPlayerShadow(text, ctx) {
  const allowlistLower = ctx?.allowlistLower;
  const matchupTeams = ctx?.matchupTeams;
  if (!(allowlistLower instanceof Set) || allowlistLower.size === 0) {
    return { count: 0, events: [] };
  }
  if (!Array.isArray(matchupTeams) || matchupTeams.length !== 2) {
    return { count: 0, events: [] };
  }

  const raw = String(text || "").trim();
  if (!raw) return { count: 0, events: [] };

  const away = String(matchupTeams[0] || "").toUpperCase();
  const home = String(matchupTeams[1] || "").toUpperCase();

  /** @type {object[]} */
  const events = [];

  const paragraphs = raw.split(/\n+/).filter(Boolean);
  /** @type {string[]} */
  const sentences = [];
  for (const p of paragraphs) {
    const parts = p.split(/(?<=[.!?])\s+/).map((c) => c.trim()).filter(Boolean);
    if (parts.length) sentences.push(...parts);
    else if (p.trim()) sentences.push(p.trim());
  }

  for (const sentence of sentences) {
    const conf = classifyClaimConfidence(sentence);
    if (!conf) continue;

    for (const cand of extractNameCandidates(sentence)) {
      if (!candidatePassesDenylist(cand)) continue;
      const key = cand.trim().toLowerCase();
      if (allowlistLower.has(key)) continue;

      events.push({
        candidate: cand,
        sentenceSnippet: sentence.slice(0, 280),
        confidence: conf,
        reason: "candidate_not_in_verified_union",
        sport: "nba",
        matchupTeams: [away, home],
        allowlistSize: allowlistLower.size,
      });
    }
  }

  return { count: events.length, events };
}

/**
 * @param {object[]} events
 */
export function logNbaInventedPlayerShadowEvents(events) {
  if (!Array.isArray(events) || events.length === 0) return;
  for (const e of events) {
    console.log(
      JSON.stringify({
        event: "ur_take_nba_invented_player_shadow",
        ...e,
      }),
    );
  }
}
