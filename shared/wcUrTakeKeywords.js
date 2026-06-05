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
