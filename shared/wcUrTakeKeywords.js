/**
 * World Cup 2026 UR Take — question-text sport detection (48 teams + tournament phrases).
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsPhrase(hay, phrase) {
  const h = normalizeText(hay);
  const p = normalizeText(phrase);
  if (!p || p.length < 2) return false;
  if (p.includes(" ")) return h.includes(p);
  const re = new RegExp(`\\b${escapeRegExp(p)}\\b`, "i");
  return re.test(h);
}

const WC_TOURNAMENT_TERMS = [
  "world cup",
  "fifa world cup",
  "fifa",
  "soccer",
  "usa soccer",
  "u.s. soccer",
  "us soccer",
  "usmnt",
  "group stage",
  "knockout stage",
  "knockout round",
  "knockout rules",
  "extra time",
  "round of 32",
  "round of 16",
  "quarterfinal",
  "semifinal",
  "penalty kick",
  "penalty shootout",
  "golden boot",
  "world cup 2026",
  "wc 2026",
  // Player market phrases (critical for routing "who will score the most goals?" to WC, not NBA)
  "most goals",
  "most goal",
  "top scorer",
  "leading scorer",
  "score the most",
  "score the most goals",
  "top goalscorer",
  "top goal scorer",
  "will score the most",
  "highest scorer",
  "player with most goals",
  "golden boot winner",
  "player props",
  "player prop",
  "player parlays",
  "player parlay",
  "remaining matches",
];

/** Single-token nation names that collide with other sports — need a co-signal. */
const WC_AMBIGUOUS_TEAM_PHRASES = new Set(["jordan"]);

const WC_TEAM_ALIASES = {
  "united states": ["usa", "u.s.", "u.s.a.", "usmnt", "team usa"],
  czechia: ["czech republic"],
  turkiye: ["turkey", "türkiye"],
  "bosnia and herzegovina": ["bosnia"],
  "ivory coast": ["cote divoire", "côte d'ivoire"],
  "dr congo": ["democratic republic of congo", "drc"],
  curacao: ["curaçao", "curacao"],
  "south korea": ["korea republic", "korean republic"],
  "saudi arabia": ["ksa"],
};

function buildWcTeamPhrases() {
  const phrases = new Set();
  for (const t of WC_2026_TEAMS) {
    for (const raw of [t.name, t.shortName, t.abbreviation, t.id]) {
      const p = normalizeText(raw);
      if (p && p.length >= 2) phrases.add(p);
    }
    const key = normalizeText(t.name);
    const aliases = WC_TEAM_ALIASES[key];
    if (aliases) {
      for (const a of aliases) phrases.add(normalizeText(a));
    }
  }
  return [...phrases].sort((a, b) => b.length - a.length);
}

const WC_TEAM_PHRASES = buildWcTeamPhrases();

/** phrase → FIFA abbreviation */
const WC_PHRASE_TO_ABBR = (() => {
  /** @type {Map<string, string>} */
  const m = new Map();
  for (const t of WC_2026_TEAMS) {
    const abbr = String(t.abbreviation || "").toUpperCase();
    for (const raw of [t.name, t.shortName, t.abbreviation, t.id]) {
      const p = normalizeText(raw);
      if (p) m.set(p, abbr);
    }
    const key = normalizeText(t.name);
    const aliases = WC_TEAM_ALIASES[key];
    if (aliases) {
      for (const a of aliases) m.set(normalizeText(a), abbr);
    }
  }
  return m;
})();

const WC_GROUP_STAGE_RE = /\bgroup\s+([a-l])\b/i;
const WC_GROUP_STAGE_PHASE_RE = /\bgroup[\s-]*stage\b/i;
const WC_SOCCER_FOOTBALL_RE =
  /\b(football|soccer)\b/i;
const WC_NFL_EXCLUDE_RE = /\b(nfl|touchdown|quarterback|super bowl)\b/i;

/** FanDuel/DK-style soccer prop phrasing without "world cup" or nation names (e.g. "Jimenez 2+ shots?", "Son 2.5 shots?"). */
const WC_SOCCER_PROP_LINE_RE =
  /\b(\d+\+\s*shots?(?:\s+on\s+target|\s*on\s*goal)?|\d+\.5\s*shots?(?:\s+on\s+target|\s*on\s*goal)?|(?:over|under)\s*\d+\.5\s*shots?(?:\s+on\s+target)?|\d+\s*or\s+more\s+shots?|player\s+to\s+have\s+\d+\s*or\s+more\s+shots?|to\s+score\s+or\s+assist|score\s+or\s+assist|team\s+to\s+score\s+(?:the\s+)?first\s+goal|most\s+corners?|shots?\s+on\s+target|sot\s*(?:prop|o\/u|over|under)|anytime\s+(?:goal\s*)?scorer|first\s+goal\s*scorer|player\s+props?|player\s+parlays?|parlay\s+props?)\b/i;

const WC_OTHER_SPORT_EXCLUDE_RE =
  /\b(nba|nfl|mlb|nhl|basketball|baseball|hockey|touchdown|quarterback|strikeout|pitcher|pra|rebounds|lakers|celtics|spurs|warriors|yankees|dodgers)\b/i;

/**
 * Soccer match/player prop slip language — routes home-page UR Take to WC during the tournament.
 * @param {string} question
 */
export function questionImpliesWcSoccerPlayerProp(question) {
  const q = normalizeText(question);
  if (!q) return false;
  if (WC_OTHER_SPORT_EXCLUDE_RE.test(q)) return false;
  return WC_SOCCER_PROP_LINE_RE.test(q);
}

/**
 * Route generic player-prop / parlay asks to World Cup during the tournament
 * even when the question omits "World Cup" (e.g. home tab or WC screen).
 * @param {string} question
 */
export function inferWorldCupFromPlayerMarketQuestion(question) {
  const q = normalizeText(question);
  if (!q || WC_OTHER_SPORT_EXCLUDE_RE.test(q)) return false;
  if (/\b(player props?|player parlays?|parlay props?)\b/i.test(q)) return true;
  if (/\bparlays?\b/i.test(q) && /\b(player|scorer|props?|goalscorer)\b/i.test(q)) {
    return true;
  }
  return questionImpliesWcSoccerPlayerProp(question);
}

/**
 * True when question text clearly references World Cup 2026 (teams, groups, tournament).
 * @param {string} question
 */
export function questionMentionsWorldCup(question) {
  const q = normalizeText(question);
  if (!q) return false;

  if (WC_GROUP_STAGE_RE.test(q)) return true;
  if (WC_GROUP_STAGE_PHASE_RE.test(q)) return true;

  for (const term of WC_TOURNAMENT_TERMS) {
    if (containsPhrase(q, term)) return true;
  }

  if (WC_SOCCER_FOOTBALL_RE.test(q) && !WC_NFL_EXCLUDE_RE.test(q)) return true;

  if (questionImpliesWcSoccerPlayerProp(question)) return true;

  for (const phrase of WC_TEAM_PHRASES) {
    if (!containsPhrase(q, phrase)) continue;
    if (WC_AMBIGUOUS_TEAM_PHRASES.has(phrase)) {
      const coSignal =
        WC_GROUP_STAGE_RE.test(q) ||
        q.includes("world cup") ||
        q.includes("fifa") ||
        q.includes("soccer") ||
        (q.includes("football") && !WC_NFL_EXCLUDE_RE.test(q)) ||
        q.includes("group stage") ||
        q.includes("knockout") ||
        /\bvs\.?\b/.test(q) ||
        q.includes("national team");
      if (!coSignal) continue;
    }
    return true;
  }

  return false;
}

/**
 * FIFA abbreviations for teams mentioned in question text (longest phrase match first).
 * @param {string} question
 * @returns {string[]}
 */
export function extractMentionedWcTeams(question) {
  const q = normalizeText(question);
  if (!q) return [];
  /** @type {Set<string>} */
  const found = new Set();
  for (const phrase of WC_TEAM_PHRASES) {
    if (!containsPhrase(q, phrase)) continue;
    if (WC_AMBIGUOUS_TEAM_PHRASES.has(phrase)) {
      const coSignal =
        WC_GROUP_STAGE_RE.test(q) ||
        q.includes("world cup") ||
        q.includes("fifa") ||
        q.includes("soccer") ||
        (q.includes("football") && !WC_NFL_EXCLUDE_RE.test(q)) ||
        /\bvs\.?\b/.test(q);
      if (!coSignal) continue;
    }
    const abbr = WC_PHRASE_TO_ABBR.get(phrase);
    if (abbr) found.add(abbr);
  }
  return [...found];
}

/**
 * Teams mentioned in question text, ordered by first appearance (e.g. "usa vs australia" → USA before AUS).
 * @param {string} question
 * @returns {string[]}
 */
export function extractMentionedWcTeamsInQuestionOrder(question) {
  const q = normalizeText(question);
  if (!q) return [];
  /** @type {Map<string, number>} */
  const firstIndex = new Map();
  for (const phrase of WC_TEAM_PHRASES) {
    if (!containsPhrase(q, phrase)) continue;
    if (WC_AMBIGUOUS_TEAM_PHRASES.has(phrase)) {
      const coSignal =
        WC_GROUP_STAGE_RE.test(q) ||
        q.includes("world cup") ||
        q.includes("fifa") ||
        q.includes("soccer") ||
        (q.includes("football") && !WC_NFL_EXCLUDE_RE.test(q)) ||
        /\bvs\.?\b/.test(q);
      if (!coSignal) continue;
    }
    const abbr = WC_PHRASE_TO_ABBR.get(phrase);
    if (!abbr) continue;
    const re = phrase.includes(" ")
      ? new RegExp(escapeRegExp(phrase), "i")
      : new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i");
    const m = re.exec(q);
    if (!m) continue;
    const idx = m.index;
    const prev = firstIndex.get(abbr);
    if (prev === undefined || idx < prev) firstIndex.set(abbr, idx);
  }
  return [...firstIndex.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([abbr]) => abbr);
}
