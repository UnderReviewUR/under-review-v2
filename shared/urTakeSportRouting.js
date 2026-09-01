/**
 * Shared UR Take sport routing: infer sport from question text, resolve vs UI hint, tab nudge copy.
 */

import { inferWorldCupFromPlayerMarketQuestion, questionMentionsWorldCup } from "./wcUrTakeKeywords.js";
import { UR_TAKE_CONTEXTUAL_FOLLOW_UP_MARKER } from "./urTakeFollowUpDetection.js";

export { UR_TAKE_CONTEXTUAL_FOLLOW_UP_MARKER } from "./urTakeFollowUpDetection.js";

export { questionMentionsWorldCup, inferWorldCupFromPlayerMarketQuestion } from "./wcUrTakeKeywords.js";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function containsAny(hay, needles) {
  const h = normalizeText(hay);
  for (const n of needles) {
    if (h.includes(normalizeText(n))) return true;
  }
  return false;
}

/**
 * Casual money talk — not the Milwaukee Bucks.
 * @param {string} question
 */
export function isCasualMoneyBucksPhrase(question) {
  const q = normalizeText(extractLatestUserTurnForRouting(question));
  if (!/\bbucks?\b/.test(q)) return false;
  return (
    /\b(?:a|few|couple(?:\s+of)?|some|extra|quick)\s+bucks?\b/.test(q) ||
    /\b(?:making|make|earn(?:ing)?)\s+(?:a\s+)?(?:few\s+)?bucks?\b/.test(q) ||
    /\bbucks?\s+tops\b/.test(q)
  );
}

/**
 * @param {string} hay
 * @param {string[]} needles
 */
function containsAnyNba(hay, needles) {
  const h = normalizeText(hay);
  const skipBucks = isCasualMoneyBucksPhrase(h);
  for (const n of needles) {
    const term = normalizeText(n);
    if (term === "bucks" && skipBucks) continue;
    if (h.includes(term)) return true;
  }
  return false;
}

/**
 * Keep a WC thread when a follow-up only weakly signals another sport (recreational sizing, etc.).
 * @param {object} p
 * @param {string} p.question
 * @param {string | null | undefined} p.textualSport
 * @param {string | null | undefined} p.historySport
 * @param {object[]} [p.chatHistory]
 */
export function shouldLockWorldCupThreadSport({
  question,
  textualSport,
  historySport,
  chatHistory,
}) {
  if (historySport !== "worldcup") return false;
  if (!Array.isArray(chatHistory) || chatHistory.length < 2) return false;
  const q = extractLatestUserTurnForRouting(question);
  if (isCasualMoneyBucksPhrase(q)) return true;
  if (
    textualSport &&
    textualSport !== "worldcup" &&
    /\b(?:don'?t need an edge|fine with|few bucks|small bet|just for fun|sweat|making a few)\b/i.test(
      q,
    ) &&
    !/\b(nba|nfl|mlb|nhl|lakers|celtics|warriors|yankees|dodgers)\b/i.test(q)
  ) {
    return true;
  }
  return false;
}

const F1_TERMS = [
  "f1",
  "formula 1",
  "formula one",
  "grand prix",
  "pole position",
  "podium",
  "verstappen",
  "norris",
  "leclerc",
  "hamilton",
  "russell",
  "piastri",
  "antonelli",
  "ferrari",
  "mercedes",
  "mclaren",
  "red bull",
];

const GOLF_TERMS = [
  "pga",
  "golf",
  "outright",
  "masters",
  "players championship",
  "us open",
  "british open",
  "the open",
  "harbour town",
  "rbc heritage",
  "scheffler",
  "mcilroy",
  "koepka",
  "finau",
];

const MLB_TERMS = [
  "mlb",
  "baseball",
  "strikeout",
  "strikeouts",
  "k prop",
  "pitcher k",
  "pitchers k",
  "strikeout prop",
  "home run",
  "pitcher",
  "first pitch",
  "yankees",
  "dodgers",
  "red sox",
  "cubs",
  "mets",
  "braves",
  "astros",
  "phillies",
  "padres",
  "giants",
  "rangers",
  "orioles",
  "twins",
  "guardians",
  "tigers",
  "royals",
  "white sox",
  "angels",
  "mariners",
  "athletics",
  "rays",
  "blue jays",
  "marlins",
  "nationals",
  "rockies",
  "diamondbacks",
  "d-backs",
  "cardinals",
  "brewers",
  "reds",
  "pirates",
];

const NFL_TERMS = [
  "nfl",
  "nfl draft",
  "mock draft",
  "pittsburgh",
  "prospect",
  "big board",
  "receiving yards",
  "rushing yards",
  "rush yards",
  "passing yards",
  "pass yards",
  "rec yards",
  "anytime td",
  "touchdown",
  "cowboys",
  "eagles",
  "chiefs",
  "49ers",
  "bills",
  "ravens",
  "lions",
  "packers",
  "vikings",
  "bears",
  "steelers",
  "browns",
  "bengals",
  "texans",
  "colts",
  "jaguars",
  "titans",
  "broncos",
  "chargers",
  "raiders",
  "commanders",
  "giants",
  "jets",
  "patriots",
  "dolphins",
  "saints",
  "falcons",
  "panthers",
  "buccaneers",
  "bucs",
  "rams",
  "seahawks",
  "cardinals",
];

const NBA_TERMS = [
  "nba",
  "basketball",
  "pra",
  "points prop",
  "three-pointer",
  "three pointers",
  "rebounds",
  "lakers",
  "celtics",
  "spurs",
  "blazers",
  "trail blazers",
  "warriors",
  "heat",
  "knicks",
  "nuggets",
  "thunder",
  "magic",
  "pistons",
  "76ers",
  "sixers",
  "bucks",
  "suns",
  "mavericks",
  "mavs",
  "clippers",
  "nets",
  "bulls",
  "hawks",
  "cavaliers",
  "cavs",
  "rockets",
  "pacers",
  "hornets",
  "jazz",
  "kings",
  "grizzlies",
  "timberwolves",
  "wolves",
  "pelicans",
  "raptors",
  "wizards",
  "lebron",
  "lebron james",
  "curry",
  "stephen curry",
  "jokic",
  "nikola jokic",
  "embiid",
  "tatum",
  "jaylen brown",
  "luka",
  "doncic",
  "antetokounmpo",
  "giannis",
  "wembanyama",
  "wemby",
  "victor wembanyama",
  "durant",
  "booker",
  "haliburton",
  "edwards",
  "anthony edwards",
];

/**
 * NFL-only abbrevs (no NBA twin). CIN/PIT/GB/KC in "DET @ CIN" beat a stray "nba" word.
 * Shared tokens (PHI, DET, DAL) stay off this list so Lakers/Sixers slugs still pivot.
 */
const NFL_ONLY_TEAM_ABBREVS = new Set([
  "ari",
  "bal",
  "buf",
  "car",
  "cin",
  "gb",
  "jax",
  "kc",
  "lar",
  "lv",
  "ne",
  "nyg",
  "nyj",
  "pit",
  "sea",
  "sf",
  "tb",
  "ten",
]);

/** NBA team abbreviations — matchup slugs like "SAS @ OKC" route to NBA. */
const NBA_TEAM_ABBREVS = new Set([
  "atl",
  "bos",
  "bkn",
  "brk",
  "cha",
  "chi",
  "cle",
  "dal",
  "den",
  "det",
  "gsw",
  "hou",
  "ind",
  "lac",
  "lal",
  "mem",
  "mia",
  "mil",
  "min",
  "nop",
  "no",
  "nyk",
  "okc",
  "orl",
  "phi",
  "phx",
  "por",
  "sac",
  "sas",
  "tor",
  "uta",
  "was",
  "wsh",
]);

const ATP_HINT_NAMES = [
  "alcaraz",
  "sinner",
  "djokovic",
  "medvedev",
  "zverev",
  "tsitsipas",
  "fritz",
  "shelton",
  "de minaur",
  "rublev",
  "atp",
];

/** @type {Record<string, { more: string, tab: string }>} */
const SPORT_TAB_NUDGE_COPY = {
  nba: { more: "NBA", tab: "NBA" },
  nfl: { more: "NFL", tab: "NFL" },
  cfb: { more: "college football", tab: "CFB" },
  laliga: { more: "La Liga", tab: "La Liga" },
  mlb: { more: "MLB", tab: "MLB" },
  golf: { more: "golf", tab: "Golf" },
  f1: { more: "F1", tab: "F1" },
  tennis: { more: "tennis", tab: "Tennis" },
  tennis_wta_profile: { more: "tennis", tab: "Tennis" },
  worldcup: { more: "World Cup", tab: "World Cup" },
  derby: { more: "Derby", tab: "Derby" },
};

/**
 * @param {string} question
 * @returns {boolean}
 */
export function inferNbaFromMatchupSlug(question) {
  const q = normalizeText(question);
  const m = q.match(/\b([a-z]{2,4})\s*(?:@|vs\.?|v)\s*([a-z]{2,4})\b/i);
  if (!m) return false;
  const a = m[1].toLowerCase();
  const b = m[2].toLowerCase();
  return NBA_TEAM_ABBREVS.has(a) && NBA_TEAM_ABBREVS.has(b);
}

/**
 * True when a matchup slug names at least one NFL-only club (Bengals, Steelers, …).
 * @param {string} question
 */
export function inferNflFromMatchupSlug(question) {
  const q = normalizeText(question);
  const m = q.match(/\b([a-z]{2,4})\s*(?:@|vs\.?|v)\s*([a-z]{2,4})\b/i);
  if (!m) return false;
  const a = m[1].toLowerCase();
  const b = m[2].toLowerCase();
  return NFL_ONLY_TEAM_ABBREVS.has(a) || NFL_ONLY_TEAM_ABBREVS.has(b);
}

/**
 * "nba" as a sport ask — not "don't route this to NBA" / "not NBA".
 * @param {string} q already normalized
 */
function mentionsNbaAffirmatively(q) {
  const stripped = String(q || "")
    .replace(/\bdon(?:'t|t)\s+(?:route|send|switch|go|pivot|treat)?(?:\s+\w+){0,6}\s+nba\b/g, " ")
    .replace(/\b(?:not|isn(?:'t|t)|no)\s+(?:the\s+)?nba\b/g, " ")
    .replace(/\bnba\s+(?:no|not)\b/g, " ");
  return /\bnba\b/.test(stripped);
}

/**
 * @param {string} [a]
 * @param {string} [b]
 */
export function sportsContextSwitched(a, b) {
  const x = String(a || "")
    .trim()
    .toLowerCase();
  const y = String(b || "")
    .trim()
    .toLowerCase();
  if (!x || !y || x === "generic" || x === "image_review" || y === "generic" || y === "image_review") {
    return false;
  }
  if (x === "tennis_wta_profile" && y === "tennis") return false;
  if (x === "tennis" && y === "tennis_wta_profile") return false;
  return x !== y;
}

/**
 * Latest user utterance for routing — ignores prior turns prepended by buildContextualQuestion.
 * @param {string} question
 */
export function extractLatestUserTurnForRouting(question) {
  const q = String(question || "").trim();
  if (!q) return "";

  const followUpMarker = UR_TAKE_CONTEXTUAL_FOLLOW_UP_MARKER;
  const followIdx = q.lastIndexOf(followUpMarker);
  if (followIdx >= 0) {
    return q.slice(followIdx + followUpMarker.length).trim();
  }

  const lines = q.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (/^User:\s+/i.test(line)) {
      return line.replace(/^User:\s+/i, "").trim();
    }
  }

  return q;
}

/**
 * NFL betting / roster lexicon — wins over shared NBA tokens like "james" or PHI.
 * @param {string} question
 */
/** NFL-only nicknames — not giants/rams/cardinals (MLB overlap). */
const NFL_ONLY_NICKNAMES = [
  "raiders",
  "steelers",
  "packers",
  "patriots",
  "pats",
  "texans",
  "titans",
  "49ers",
  "niners",
  "chargers",
  "colts",
  "bengals",
  "lions",
  "bills",
  "cowboys",
  "eagles",
  "chiefs",
  "ravens",
  "vikings",
  "bears",
  "browns",
  "jaguars",
  "jags",
  "broncos",
  "commanders",
  "jets",
  "dolphins",
  "saints",
  "falcons",
  "panthers",
  "buccaneers",
  "bucs",
  "seahawks",
];

const CFB_TERMS = [
  "college football",
  "ncaaf",
  "cfb",
  "cfp",
  "college playoff",
  "ohio state",
  "michigan wolverines",
  "alabama crimson",
  "alabama",
  "auburn",
  "georgia bulldogs",
  "georgia",
  "texas longhorns",
  "penn state",
  "oregon ducks",
  "clemson",
  "notre dame",
  "lsu tigers",
  "oklahoma sooners",
  "usc trojans",
  "florida state",
  "miami hurricanes",
  "tennessee volunteers",
];

const LALIGA_TERMS = [
  "la liga",
  "laliga",
  "real madrid",
  "barcelona",
  "barca",
  "atletico madrid",
  "atletico",
  "sevilla",
  "real sociedad",
  "villarreal",
  "athletic bilbao",
  "girona",
  "real betis",
  "valencia",
  "1x2",
  "both teams to score",
  "btts",
  "anytime scorer",
  "goalscorer",
];

export function hasCfbAskLexicon(question) {
  const q = normalizeText(extractLatestUserTurnForRouting(question));
  if (!q) return false;
  if (/\b(ncaaf|cfb|college football|cfp)\b/.test(q)) return true;
  return containsAny(q, CFB_TERMS);
}

export function hasLaligaAskLexicon(question) {
  const q = normalizeText(extractLatestUserTurnForRouting(question));
  if (!q) return false;
  if (/\b(la liga|laliga)\b/.test(q)) return true;
  return containsAny(q, LALIGA_TERMS);
}

export function hasNflAskLexicon(question) {
  const q = normalizeText(extractLatestUserTurnForRouting(question));
  if (!q) return false;
  if (q.includes("nfl")) return true;
  if (inferNflFromMatchupSlug(q)) return true;
  if (NFL_ONLY_NICKNAMES.some((n) => new RegExp(`\\b${n}\\b`, "i").test(q))) return true;
  // Posted favorite like "CIN -6.5" / "TEN -6" without the word spread.
  if (
    [...NFL_ONLY_TEAM_ABBREVS].some((ab) =>
      new RegExp(`\\b${ab}\\s+-\\d{1,2}(?:\\.5)?\\b`, "i").test(q),
    )
  ) {
    return true;
  }
  if (
    /\b(rush(?:ing)?|pass(?:ing)?|rec(?:eiving)?)\s+yards?\b/.test(q) ||
    /\b(anytime\s+td|touchdown|receptions?|sacks?|tackles?|win totals?|mock draft|big board)\b/.test(q)
  ) {
    return true;
  }
  if (/\b(spread|moneyline|\bml\b|ats|cover)\b/.test(q) && !hasStrongNbaOnlyLexicon(q)) {
    return true;
  }
  if (/\btotal\b/.test(q) && /(?:^|[^\d])-\d{1,2}(?:\.5)?\b/.test(q) && !hasStrongNbaOnlyLexicon(q)) {
    return true;
  }
  return false;
}

/**
 * Strong NBA-only signals — enough to pivot off an NFL tab.
 * Bare first names (james) and shared abbrevs (PHI) are not enough.
 * @param {string} question
 */
export function hasStrongNbaOnlyLexicon(question) {
  const q = normalizeText(extractLatestUserTurnForRouting(question));
  if (!q) return false;
  if (/\b(76ers|sixers|lakers|celtics|knicks|warriors|nuggets|spurs)\b/.test(q)) return true;
  if (/\b(lebron|embiid|jokic|curry|tatum|luka|doncic|wembanyama|giannis)\b/.test(q)) return true;
  if (/\b(pra|rebounds?|assists?|three-?pointers?|double-double)\b/.test(q)) return true;
  // Bare "nba" does not beat an NFL-only matchup slug (DET @ CIN / GB @ PIT).
  if (mentionsNbaAffirmatively(q) && !inferNflFromMatchupSlug(q)) return true;
  return false;
}

/**
 * Keyword inference from question (+ optional matchup card). Returns a sport slug or null.
 * @param {string} question
 * @param {{ league?: string } | null} [matchupContext]
 * @param {boolean} [hasImage]
 */
export function inferSportFromQuestionText(question, matchupContext, hasImage) {
  const q = normalizeText(extractLatestUserTurnForRouting(question));

  // College football before NFL yardage lexicon (shared prop language).
  if (hasCfbAskLexicon(q) && !hasStrongNbaOnlyLexicon(q)) return "cfb";
  if (hasLaligaAskLexicon(q) && !hasStrongNbaOnlyLexicon(q)) return "laliga";

  // NFL yardage / football spreads before NBA matchup slugs (DET @ CIN, vs PHI, "James Cook").
  if (hasNflAskLexicon(q) && !hasStrongNbaOnlyLexicon(q)) return "nfl";

  if (hasStrongNbaOnlyLexicon(q)) return "nba";

  if (inferNbaFromMatchupSlug(q) && !hasNflAskLexicon(q)) return "nba";

  if (inferWorldCupFromPlayerMarketQuestion(question)) {
    return "worldcup";
  }

  if (matchupContext?.league) {
    const league = normalizeText(matchupContext.league);
    if (league.includes("golf") || league.includes("pga")) return "golf";
    if (league.includes("nba")) return "nba";
    if (league.includes("mlb")) return "mlb";
    if (league.includes("ncaaf") || league.includes("college football")) return "cfb";
    if (league.includes("la liga") || league.includes("laliga")) return "laliga";
    if (league.includes("nfl")) return "nfl";
    if (league.includes("f1") || league.includes("formula 1")) return "f1";
    if (league.includes("tennis")) return "tennis";
  }

  if (
    q.includes("golf") ||
    q.includes("outright") ||
    q.includes("harbour town") ||
    q.includes("rbc heritage") ||
    q.includes("masters") ||
    q.includes("pga") ||
    containsAny(q, GOLF_TERMS)
  ) {
    return "golf";
  }

  if (
    q.includes("f1") ||
    q.includes("grand prix") ||
    q.includes("formula 1") ||
    q.includes("formula one") ||
    q.includes("pole position") ||
    q.includes("fastest lap") ||
    /\bmiami\s+gp\b/.test(q) ||
    containsAny(q, F1_TERMS)
  ) {
    return "f1";
  }

  if (
    q.includes("mlb") ||
    q.includes("strikeout") ||
    q.includes("home run") ||
    q.includes("k prop") ||
    (q.includes("pitcher") && q.includes("prop")) ||
    containsAny(q, MLB_TERMS)
  ) {
    return "mlb";
  }

  if (containsAny(q, CFB_TERMS) || q.includes("ncaaf") || q.includes("cfb")) {
    return "cfb";
  }

  if (containsAny(q, LALIGA_TERMS)) {
    return "laliga";
  }

  if (q.includes("nfl") || q.includes("receiving") || q.includes("rushing") || containsAny(q, NFL_TERMS)) {
    return "nfl";
  }

  if (questionMentionsWorldCup(question)) {
    return "worldcup";
  }

  if (
    q.includes("nba") ||
    /\bnba finals\b/.test(q) ||
    /\bfinals game\s*\d+/i.test(q) ||
    /\bpra\b/.test(q) ||
    (q.includes("points") &&
      (q.includes("rebounds") ||
        q.includes("assists") ||
        q.includes("double-double") ||
        /\bppg\b/.test(q) ||
        /\bplayer\s+props?\b/.test(q))) ||
    containsAnyNba(q, NBA_TERMS)
  ) {
    return "nba";
  }

  if (
    q.includes("tennis") ||
    q.includes("atp") ||
    q.includes("aces") ||
    q.includes("double faults") ||
    q.includes("break points") ||
    q.includes("scoreline") ||
    q.includes("match winner") ||
    containsAny(q, ATP_HINT_NAMES)
  ) {
    return "tennis";
  }

  if (hasImage && matchupContext?.league) {
    const league = normalizeText(matchupContext.league);
    if (league.includes("nba")) return "nba";
    if (league.includes("nfl")) return "nfl";
    if (league.includes("mlb")) return "mlb";
    if (league.includes("golf")) return "golf";
    if (league.includes("f1")) return "f1";
  }

  return null;
}

/**
 * Last assistant sport on the thread (for ambiguous follow-ups).
 * @param {Array<{ sport?: string, role?: string }>} [history]
 * @returns {string | null}
 */
export function inferSportFromChatHistory(history) {
  if (!Array.isArray(history) || history.length === 0) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    const row = history[i];
    if (!row || typeof row !== "object") continue;
    const s = String(row.sport || "")
      .trim()
      .toLowerCase();
    if (!s || s === "generic" || s === "image_review") continue;
    return s;
  }
  return null;
}

const SPORT_TURN_LABELS = {
  nba: "NBA",
  nfl: "NFL",
  cfb: "college football",
  laliga: "La Liga",
  mlb: "MLB",
  golf: "Golf",
  f1: "Formula 1",
  tennis: "Tennis",
  tennis_wta_profile: "WTA Tennis",
  worldcup: "World Cup",
  derby: "Kentucky Derby",
};

/**
 * Prompt block: answer the routed sport; never refuse cross-sport questions.
 * @param {string} [sportHint]
 */
export function buildUrTakeSportTurnScopeRules(sportHint) {
  const s = String(sportHint || "generic").toLowerCase();
  const label = SPORT_TURN_LABELS[s] || s.replace(/_/g, " ") || "this sport";
  return `SPORT TURN SCOPE (mandatory)
- This turn is routed to ${label}; use only the sport context JSON supplied in this message.
- Answer ONLY ${label} for this turn — even if prior chat messages were about another sport.
- Never answer two sports in one reply. Never say you are answering one sport "first" and another "second."
- Prior chat may mention other sports — ignore them for this answer. Never narrate, flag, or apologize for a sport change.
- Never say "cross-sport mismatch", "your first question was about", "the context payload I have", "paste the game context", or "I'll need you to" (provide data the user should not supply).
- Never refuse, redirect, or ask them to switch tabs, threads, screens, or paste context the app already loads server-side.
- Never say "wrong sport", "locked into [sport]", "constraint conflict", or that they must leave this conversation.`;
}

/**
 * @param {object} p
 * @param {string} [p.incomingSportHint]
 * @param {string} p.question
 * @param {object} [p.matchupContext]
 * @param {boolean} [p.hasImage]
 * @param {object} [p.golfContext]
 * @param {boolean} [p.derbyActive]
 * @param {boolean} [p.questionIsDerby]
 * @param {Array<{ sport?: string }>} [p.chatHistory]
 */
export function resolveSportHint({
  incomingSportHint,
  question,
  matchupContext,
  hasImage,
  golfContext,
  derbyActive = false,
  questionIsDerby = false,
  chatHistory,
}) {
  const routingQuestion = extractLatestUserTurnForRouting(question);
  const textualSport = inferSportFromQuestionText(routingQuestion, matchupContext, hasImage);
  const historySport = inferSportFromChatHistory(chatHistory);
  const h =
    typeof incomingSportHint === "string" && incomingSportHint.trim()
      ? incomingSportHint.trim()
      : "";

  if (h === "worldcup") return "worldcup";

  if (
    shouldLockWorldCupThreadSport({
      question,
      textualSport,
      historySport,
      chatHistory,
    })
  ) {
    return "worldcup";
  }

  // Latest-turn question text wins for cross-sport pivots (except locked World Cup tab hint above).
  // Shared tokens (James / PHI / DET @ CIN) must not yank an explicit NFL tab to NBA.
  if (
    h === "nfl" &&
    textualSport === "nba" &&
    !hasStrongNbaOnlyLexicon(routingQuestion)
  ) {
    return "nfl";
  }
  if (textualSport) return textualSport;

  if (derbyActive && questionIsDerby && (!h || h === "generic")) {
    return "derby";
  }

  if (
    historySport &&
    Array.isArray(chatHistory) &&
    chatHistory.length > 1 &&
    !inferSportFromQuestionText(routingQuestion, matchupContext, hasImage)
  ) {
    return historySport;
  }

  if (h && h !== "generic" && h !== "image_review") return h;

  if (
    golfContext &&
    (golfContext.currentEvent?.name ||
      (Array.isArray(golfContext.currentEvent?.leaderboard) &&
        golfContext.currentEvent.leaderboard.length > 0) ||
      (Array.isArray(golfContext.odds?.outrights) && golfContext.odds.outrights.length > 0))
  ) {
    return "golf";
  }

  if (hasImage) return "generic";

  return "generic";
}

/**
 * @deprecated Tab nudges removed — cross-sport answers stay in-thread. Kept for tests.
 * @param {{ answeredSport?: string, uiSportHint?: string }} p
 * @returns {string | null}
 */
export function buildSportTabNudgeLine({ answeredSport, uiSportHint }) {
  const answered = String(answeredSport || "")
    .trim()
    .toLowerCase();
  const ui = String(uiSportHint || "")
    .trim()
    .toLowerCase();
  if (!answered || answered === "generic" || answered === "image_review") return null;
  if (!ui || ui === "generic" || ui === "image_review") return null;
  if (answered === ui) return null;
  if (answered === "tennis_wta_profile" && ui === "tennis") return null;

  const copy = SPORT_TAB_NUDGE_COPY[answered] || {
    more: answered.replace(/_/g, " "),
    tab: answered.replace(/_/g, " "),
  };
  return `For more ${copy.more} takes, tap the ${copy.tab} tab.`;
}

/** @deprecated No-op — do not redirect users to another tab after cross-sport answers. */
export function appendSportTabNudge(text, _opts) {
  return String(text || "").trim();
}

/** Global UR Take rule block — injected into system prompts (all sports). */
export function buildUrTakeNoDeadEndPrompt() {
  return `UR TAKE — NO DEAD ENDS (all sports, mandatory)
- There is no "out of scope." Every question gets a confident lean using the best available context.
- Never refuse because a player is missing from a verified roster, slate, field, or board.
- Never say "[Name] isn't a verified player", "not on tonight's slate", "not in the verified field", or that a real pro "doesn't exist."
- If a name is ambiguous, infer the most likely player from active rosters, current events, session history, and sport context — then answer. Do not ask the user to confirm spelling or identity.
- If the question is vague ("Scottie's chances?", "how's he doing?", "what's the line?", "who wins?", "thoughts?"), use session history plus current event context to infer intent and answer directly — like a sharp friend in iMessage, not a form that needs every field filled in.
- Casual chat turns are valid: short questions, typos, slang, and half-sentences still get a real answer. Interpret generously; never punt with "I need more detail" or "be more specific."
- If sport context in the UI differs from the question, answer from the correct sport silently — never narrate or flag the switch.
- Never say "cross-sport mismatch", "your first question was about", "the context payload I have", "paste the game context", or "I'll need you to" paste or provide data.
- Never ask the user to clarify something the app should infer (sport, player, matchup, or tab).
- If live rows are thin, give the sharpest structural read you can and note data gaps only in passing — never as a refusal.
- The burden of interpretation is on the app, not the user.`;
}

/** Strip model refusals / dead-end copy from user-visible text (all sports). */
export function stripUrTakeDeadEndCopy(text) {
  let s = String(text || "").trim();
  if (!s) return s;

  const dropLinePatterns = [
    /^WRONG SPORT\.[^\n]*$/im,
    /^I'm locked into [^\n]*$/im,
    /^[^\n]*\bcross[- ]sport mismatch\b[^\n]*$/im,
    /^[^\n]*\byour first question was about\b[^\n]*$/im,
    /^[^\n]*\bthe context payload i have\b[^\n]*$/im,
    /^[^\n]*\bpaste(?:\s+the)?\s+game context\b[^\n]*$/im,
    /^[^\n]*\bi(?:'|')ll need you to\b[^\n]*$/im,
    /^[^\n]*\bi need to flag\b[^\n]*$/im,
    /^[^\n]*\b(?:you(?:'|')?ve got|you have) two separate questions\b[^\n]*$/im,
    /^[^\n]*\b(?:i(?:'|')?m )?answering the [^\n]*follow-up first\b[^\n]*$/im,
    /^---\s*GOLF FOLLOW-UP[^\n]*$/im,
    /^---\s*NBA FOLLOW-UP[^\n]*$/im,
    /^GOLF FOLLOW-UP[^\n]*$/im,
    /^NBA FOLLOW-UP[^\n]*$/im,
    /^[^\n]*\bpayload you sent is [^\n]*only\b[^\n]*$/im,
    /^[^\n]*\bneed the live game context for this one\b[^\n]*$/im,
    /^For tennis prop analysis[^\n]*$/im,
    /^What NBA game or player props[^\n]*$/im,
    /^I (?:can't|cannot|won't) (?:answer|help|provide)[^\n]*$/im,
    /^That (?:question|ask) is (?:outside|beyond)[^\n]*$/im,
    /^[^\n]*(?:isn't|is not|aren't|are not) (?:a )?verified player[^\n]*$/im,
    /^[^\n]*not (?:on|in) (?:the )?(?:verified |tonight'?s? )?(?:player|roster|field|slate|board)[^\n]*(?:can't|cannot|won't|refus)[^\n]*$/im,
    /^[^\n]*not (?:on|in) the verified (?:field|roster|slate)[^\n]*$/im,
    /^[^\n]*(?:outside|beyond) (?:our |the )?scope[^\n]*$/im,
    /^[^\n]*(?:tell me|let me know) (?:which|who|what)[^\n]*\?[^\n]*$/im,
    /^[^\n]*if you meant[^\n]*$/im,
    /^[^\n]*(?:can you|could you) clarify[^\n]*\?[^\n]*$/im,
    /^[^\n]*which (?:player|team|match|game) (?:did you mean|are you asking)[^\n]*\?[^\n]*$/im,
    /^[^\n]*(?:be more specific|need more detail|more specific question)[^\n]*$/im,
    /^[^\n]*ask about a specific (?:player|matchup|tournament|game)[^\n]*$/im,
  ];

  for (const re of dropLinePatterns) {
    s = s.replace(re, "").replace(/\n{3,}/g, "\n\n");
  }

  return s.trim();
}

/** @deprecated Use stripUrTakeDeadEndCopy */
export function stripSportMismatchRefusal(text) {
  return stripUrTakeDeadEndCopy(text);
}
