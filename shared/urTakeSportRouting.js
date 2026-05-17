/**
 * Shared UR Take sport routing: infer sport from question text, resolve vs UI hint, tab nudge copy.
 */

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
];

const WORLD_CUP_TERMS = [
  "world cup",
  "fifa",
  "soccer",
  "football",
  "group stage",
  "knockout round",
  "penalty kick",
  "golden boot",
];

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
  mlb: { more: "MLB", tab: "MLB" },
  golf: { more: "golf", tab: "Golf" },
  f1: { more: "F1", tab: "F1" },
  tennis: { more: "tennis", tab: "Tennis" },
  tennis_wta_profile: { more: "tennis", tab: "Tennis" },
  worldcup: { more: "World Cup", tab: "World Cup" },
  derby: { more: "Derby", tab: "Derby" },
};

/**
 * Keyword inference from question (+ optional matchup card). Returns a sport slug or null.
 * @param {string} question
 * @param {{ league?: string } | null} [matchupContext]
 * @param {boolean} [hasImage]
 */
export function inferSportFromQuestionText(question, matchupContext, hasImage) {
  const q = normalizeText(question);

  if (matchupContext?.league) {
    const league = normalizeText(matchupContext.league);
    if (league.includes("golf") || league.includes("pga")) return "golf";
    if (league.includes("nba")) return "nba";
    if (league.includes("mlb")) return "mlb";
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

  if (q.includes("nfl") || q.includes("receiving") || q.includes("rushing") || containsAny(q, NFL_TERMS)) {
    return "nfl";
  }

  if (
    q.includes("world cup") ||
    q.includes("fifa") ||
    q.includes("soccer") ||
    (q.includes("football") && !q.includes("nfl") && !q.includes("touchdown")) ||
    (containsAny(q, WORLD_CUP_TERMS) &&
      !q.includes("nfl") &&
      !q.includes("touchdown") &&
      !q.includes("quarterback"))
  ) {
    return "worldcup";
  }

  if (
    q.includes("nba") ||
    /\bpra\b/.test(q) ||
    (q.includes("points") &&
      (q.includes("rebounds") ||
        q.includes("assists") ||
        q.includes("double-double") ||
        /\bppg\b/.test(q) ||
        /\bplayer\s+props?\b/.test(q))) ||
    containsAny(q, NBA_TERMS)
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
 * @param {object} p
 * @param {string} [p.incomingSportHint]
 * @param {string} p.question
 * @param {object} [p.matchupContext]
 * @param {boolean} [p.hasImage]
 * @param {object} [p.golfContext]
 * @param {boolean} [p.derbyActive]
 * @param {boolean} [p.questionIsDerby]
 */
export function resolveSportHint({
  incomingSportHint,
  question,
  matchupContext,
  hasImage,
  golfContext,
  derbyActive = false,
  questionIsDerby = false,
}) {
  const textualSport = inferSportFromQuestionText(question, matchupContext, hasImage);
  const h =
    typeof incomingSportHint === "string" && incomingSportHint.trim()
      ? incomingSportHint.trim()
      : "";

  if (
    textualSport &&
    h &&
    textualSport !== h &&
    h !== "generic" &&
    h !== "image_review"
  ) {
    return textualSport;
  }

  if (derbyActive && questionIsDerby && (!h || h === "generic")) {
    return "derby";
  }

  if ((!h || h === "generic" || h === "image_review") && textualSport) {
    return textualSport;
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

  if (textualSport) return textualSport;

  if (hasImage) return "generic";

  return "generic";
}

/**
 * One-line forward guidance when the answer used a different sport than the UI session tab.
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

/**
 * Append tab nudge when UI sport differs from answered sport; avoids duplicate lines.
 * @param {string} text
 * @param {{ answeredSport?: string, uiSportHint?: string }} opts
 */
export function appendSportTabNudge(text, opts) {
  const base = String(text || "").trim();
  const line = buildSportTabNudgeLine(opts);
  if (!line) return base;
  if (!base) return line;
  if (base.toLowerCase().includes(line.toLowerCase())) return base;
  return `${base}\n\n${line}`;
}

/** Global UR Take rule block — injected into system prompts (all sports). */
export function buildUrTakeNoDeadEndPrompt() {
  return `UR TAKE — NO DEAD ENDS (all sports, mandatory)
- There is no "out of scope." Every question gets a confident lean using the best available context.
- Never refuse because a player is missing from a verified roster, slate, field, or board.
- Never say "[Name] isn't a verified player", "not on tonight's slate", "not in the verified field", or that a real pro "doesn't exist."
- If a name is ambiguous, infer the most likely player from active rosters, current events, session history, and sport context — then answer. Do not ask the user to confirm spelling or identity.
- If the question is vague ("Scottie's chances?", "how's he doing?", "what's the line?"), use session history plus current event context to infer intent and answer directly.
- If sport context in the UI differs from the question, answer from the correct sport silently; do not lecture about mismatch.
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
