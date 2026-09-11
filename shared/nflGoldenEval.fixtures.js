/**
 * NFL golden eval fixtures — GOAT-shaped boards + question shapes.
 *
 * Boards intentionally carry the row types that broke production takes:
 * unstamped rows, alt ladders, cross-game contamination, novelty/period props.
 * Player teams must match `api/data/nflBdlRosterSnapshot.js` — scope resolution
 * reads the real snapshot, so a wrong fixture team is a false failure.
 */

/**
 * @typedef {Object} NflGoldenBoard
 * @property {Array<Record<string, unknown>>} games
 * @property {Array<Record<string, unknown>>} propLines
 * @property {Record<string, unknown>} briefcase
 */

/**
 * @typedef {Object} NflGoldenEvalCase
 * @property {string} id
 * @property {string} question
 * @property {string} board
 * @property {string} [why]
 * @property {Record<string, unknown>} [modelFixture]
 * @property {string} [detected]
 * @property {string[]} [scope]
 * @property {string[]} [evidence]
 * @property {string[]} [grounded]
 * @property {Array<{ label: string, re: string }>} [forbidText]
 * @property {string[]} [expectCodes]
 * @property {string[]} [forbidCodes]
 * @property {boolean} [expectPass]
 */

/**
 * @param {string} game
 * @param {string} player
 * @param {string} team
 * @param {string} propRaw
 * @param {number} line
 * @param {Record<string, unknown>} [extra]
 */
function row(game, player, team, propRaw, line, extra = {}) {
  return {
    game,
    player,
    team,
    prop: propRaw.replace(/_/g, " "),
    propRaw,
    line,
    overOdds: -110,
    underOdds: -110,
    book: "draftkings",
    eventId: extra.eventId ?? "1",
    source: "balldontlie_nfl",
    ...extra,
  };
}

const NE_SEA = "NE @ SEA";

const neSeaProps = [
  // Core QB markets + an alt ladder that must not become the ticket.
  row(NE_SEA, "Sam Darnold", "SEA", "pass_yds", 230.5),
  row(NE_SEA, "Sam Darnold", "SEA", "pass_yds", 249.5, { book: "fanduel" }),
  row(NE_SEA, "Sam Darnold", "SEA", "pass_yds", 460.5),
  row(NE_SEA, "Sam Darnold", "SEA", "pass_tds", 1.5),
  row(NE_SEA, "Sam Darnold", "SEA", "pass_ints", 0.5),
  row(NE_SEA, "Sam Darnold", "SEA", "pass_completions", 20.5),
  row(NE_SEA, "Sam Darnold", "SEA", "pass_long", 42.5),
  row(NE_SEA, "Drake Maye", "NE", "pass_yds", 231.5),
  row(NE_SEA, "Drake Maye", "NE", "pass_tds", 1.5),
  row(NE_SEA, "Drake Maye", "NE", "rush_yds", 24.5),
  // Receivers — Brown/Doubs are Patriots on the 2026 snapshot.
  row(NE_SEA, "A.J. Brown", "NE", "rec_yds", 62.5),
  row(NE_SEA, "A.J. Brown", "NE", "receptions", 4.5),
  row(NE_SEA, "A.J. Brown", "NE", "anytime_td", 0.5, { marketType: "milestone" }),
  row(NE_SEA, "A.J. Brown", "NE", "targets", 7.5),
  row(NE_SEA, "Romeo Doubs", "NE", "rec_yds", 28.5),
  row(NE_SEA, "Romeo Doubs", "NE", "receptions", 2.5),
  row(NE_SEA, "Hunter Henry", "NE", "rec_yds", 31.5),
  row(NE_SEA, "Rhamondre Stevenson", "NE", "rush_yds", 54.5),
  row(NE_SEA, "Rhamondre Stevenson", "NE", "anytime_td", 0.5, { marketType: "milestone" }),
  row(NE_SEA, "Jaxon Smith-Njigba", "SEA", "rec_yds", 75.5),
  row(NE_SEA, "Jaxon Smith-Njigba", "SEA", "receptions", 5.5),
  row(NE_SEA, "Cooper Kupp", "SEA", "rec_yds", 44.5),
  // Defense markets.
  row(NE_SEA, "Christian Gonzalez", "NE", "tackles", 5.5),
  row(NE_SEA, "Keion White", "NE", "sacks", 0.5),
  // Rows that must not become a headline ticket.
  row(NE_SEA, "Cooper Kupp", "SEA", "rec_yds_1h", 21.5, { period: "1H" }),
  row(NE_SEA, "Hunter Henry", "NE", "rec_yds", 9.5),
  row(NE_SEA, "Andy Borregales", "NE", "kicking_points", 7.5),
  // Unstamped (vendor gave no team/game) — must still be gradeable.
  { ...row(NE_SEA, "Drake Maye", "NE", "pass_yds", 232.5), game: undefined, team: null },
  // Cross-game contamination: same name, different matchup.
  row("DAL @ PHI", "A.J. Brown", "PHI", "rec_yds", 64.5, { eventId: "2" }),
  row("GB @ DET", "Romeo Doubs", "GB", "rec_yds", 35.5, { eventId: "3" }),
];

/** @type {Record<string, NflGoldenBoard>} */
export const NFL_GOLDEN_BOARDS = {
  neSea: {
    games: [
      {
        awayAbbr: "NE",
        homeAbbr: "SEA",
        providerGameId: 1,
        eventId: "1",
        week: 1,
        spread: { favoriteAbbr: "SEA", displayLine: "SEA -3.5", favoritePoint: 3.5 },
        total: { line: 42.5 },
        moneyline: { homePrice: -175, awayPrice: 150 },
      },
    ],
    propLines: neSeaProps,
    briefcase: {
      grade: "green",
      week: 1,
      season: 2026,
      propMatch: { matched: neSeaProps.length },
      league: {
        playerTeamByName: {
          "sam darnold": "SEA",
          "jaxon smith njigba": "SEA",
          "cooper kupp": "SEA",
          "drake maye": "NE",
          "aj brown": "NE",
          "romeo doubs": "NE",
          "hunter henry": "NE",
          "rhamondre stevenson": "NE",
          "christian gonzalez": "NE",
          "keion white": "NE",
          "andy borregales": "NE",
        },
        rostersByTeam: {
          SEA: [
            { name: "Sam Darnold" },
            { name: "Jaxon Smith-Njigba" },
            { name: "Cooper Kupp" },
          ],
          NE: [
            { name: "Drake Maye" },
            { name: "A.J. Brown" },
            { name: "Romeo Doubs" },
            { name: "Hunter Henry" },
            { name: "Rhamondre Stevenson" },
            { name: "Christian Gonzalez" },
            { name: "Keion White" },
            { name: "Andy Borregales" },
          ],
        },
      },
    },
  },

  sfLar: {
    games: [
      {
        awayAbbr: "SF",
        homeAbbr: "LAR",
        providerGameId: 9,
        eventId: "9",
        week: 1,
        spread: { favoriteAbbr: "LAR", displayLine: "LAR -1.5", favoritePoint: 1.5 },
        total: { line: 47.5 },
        moneyline: { homePrice: -125, awayPrice: 105 },
      },
    ],
    propLines: [
      row("SF @ LAR", "Matthew Stafford", "LAR", "pass_yds", 263.5, { eventId: "9" }),
      row("SF @ LAR", "Matthew Stafford", "LAR", "pass_yds", 262.5, { eventId: "9", book: "fanduel" }),
      row("SF @ LAR", "Matthew Stafford", "LAR", "pass_tds", 1.5, { eventId: "9" }),
      row("SF @ LAR", "Brock Purdy", "SF", "pass_yds", 245.5, { eventId: "9" }),
      row("SF @ LAR", "Brock Purdy", "SF", "pass_tds", 1.5, { eventId: "9" }),
      row("SF @ LAR", "George Kittle", "SF", "rec_yds", 48.5, { eventId: "9" }),
      row("SF @ LAR", "George Kittle", "SF", "receptions", 3.5, { eventId: "9" }),
      row("SF @ LAR", "George Kittle", "SF", "anytime_td", 0.5, { eventId: "9", marketType: "milestone" }),
      row("SF @ LAR", "Christian McCaffrey", "SF", "rush_yds", 78.5, { eventId: "9" }),
      row("SF @ LAR", "Christian McCaffrey", "SF", "rec_yds", 32.5, { eventId: "9" }),
      row("SF @ LAR", "Christian McCaffrey", "SF", "anytime_td", 0.5, { eventId: "9", marketType: "milestone" }),
      row("SF @ LAR", "Kyren Williams", "LAR", "rush_yds", 72.5, { eventId: "9" }),
      row("SF @ LAR", "Kyren Williams", "LAR", "anytime_td", 0.5, { eventId: "9", marketType: "milestone" }),
      row("SF @ LAR", "Puka Nacua", "LAR", "rec_yds", 66.5, { eventId: "9" }),
      row("SF @ LAR", "Puka Nacua", "LAR", "receptions", 5.5, { eventId: "9" }),
      row("SF @ LAR", "Deebo Samuel Sr.", "SF", "rec_yds", 38.5, { eventId: "9" }),
      // Unstamped Kyren row — vendor dropped the team.
      { ...row("SF @ LAR", "Kyren Williams", "LAR", "rush_yds", 71.5, { eventId: "9" }), game: undefined, team: null },
    ],
    briefcase: {
      grade: "green",
      week: 1,
      season: 2026,
      propMatch: { matched: 17 },
      league: {
        playerTeamByName: {
          "matthew stafford": "LAR",
          "kyren williams": "LAR",
          "puka nacua": "LAR",
          "brock purdy": "SF",
          "george kittle": "SF",
          "christian mccaffrey": "SF",
          "deebo samuel sr": "SF",
        },
        rostersByTeam: {
          LAR: [{ name: "Matthew Stafford" }, { name: "Kyren Williams" }, { name: "Puka Nacua" }],
          SF: [
            { name: "Brock Purdy" },
            { name: "George Kittle" },
            { name: "Christian McCaffrey" },
            { name: "Deebo Samuel Sr." },
          ],
        },
      },
    },
  },

  kcBuf: {
    games: [
      {
        awayAbbr: "KC",
        homeAbbr: "BUF",
        providerGameId: 5,
        eventId: "5",
        week: 1,
        spread: { favoriteAbbr: "BUF", displayLine: "BUF -2.5", favoritePoint: 2.5 },
        total: { line: 48.5 },
        moneyline: { homePrice: -140, awayPrice: 118 },
      },
    ],
    propLines: [
      row("KC @ BUF", "Patrick Mahomes", "KC", "pass_yds", 271.5, { eventId: "5" }),
      row("KC @ BUF", "Patrick Mahomes", "KC", "pass_tds", 1.5, { eventId: "5" }),
      row("KC @ BUF", "Travis Kelce", "KC", "rec_yds", 52.5, { eventId: "5" }),
      row("KC @ BUF", "Travis Kelce", "KC", "receptions", 4.5, { eventId: "5" }),
      row("KC @ BUF", "Kenneth Walker III", "KC", "rush_yds", 61.5, { eventId: "5" }),
      row("KC @ BUF", "Josh Allen", "BUF", "pass_yds", 244.5, { eventId: "5" }),
      row("KC @ BUF", "Josh Allen", "BUF", "rush_yds", 39.5, { eventId: "5" }),
      row("KC @ BUF", "James Cook III", "BUF", "rush_yds", 68.5, { eventId: "5" }),
      row("KC @ BUF", "James Cook III", "BUF", "anytime_td", 0.5, { eventId: "5", marketType: "milestone" }),
    ],
    briefcase: {
      grade: "green",
      week: 1,
      season: 2026,
      propMatch: { matched: 9 },
      league: {
        playerTeamByName: {
          "patrick mahomes": "KC",
          "travis kelce": "KC",
          "kenneth walker iii": "KC",
          "josh allen": "BUF",
          "james cook iii": "BUF",
        },
        rostersByTeam: {
          KC: [{ name: "Patrick Mahomes" }, { name: "Travis Kelce" }, { name: "Kenneth Walker III" }],
          BUF: [{ name: "Josh Allen" }, { name: "James Cook III" }],
        },
      },
    },
  },

  // Board posted for the game, but the prop pocket came back empty (thin GOAT feed).
  emptyProps: {
    games: [
      {
        awayAbbr: "NE",
        homeAbbr: "SEA",
        providerGameId: 1,
        eventId: "1",
        week: 1,
        spread: { favoriteAbbr: "SEA", displayLine: "SEA -3.5", favoritePoint: 3.5 },
        total: { line: 42.5 },
      },
    ],
    propLines: [],
    briefcase: {
      grade: "yellow",
      week: 1,
      season: 2026,
      propMatch: { matched: 0 },
      league: {
        playerTeamByName: { "drake maye": "NE", "sam darnold": "SEA" },
        rostersByTeam: { NE: [{ name: "Drake Maye" }], SEA: [{ name: "Sam Darnold" }] },
      },
    },
  },
};

/** A plausible-but-thin model answer: refuses and asks the user for numbers. */
const THIN_ASKS_FOR_LINES = {
  call: "PASS",
  callType: "prop",
  confidence: "Speculative",
  lean: "Lean: Pass. I need the numbers first.",
  whyNow: "Can't help without the actual prop lines in front of me — what are you seeing?",
  edge: "Tell me the posted numbers and I'll give you a real take.",
  analysis: {
    matchupAnalysis: "No lines in front of me for this matchup right now.",
    injuryContext: "Check inactives before you bet it.",
    marketContext: "No posted numbers available in this answer.",
    lineMovement: "No movement to cite.",
    statisticalEdge: "Season priors only.",
  },
  caveats: ["No live numbers cited."],
};

/** A model answer that cites a number nobody posted. */
const INVENTED_NUMBER = {
  call: "OVER 99.5",
  callType: "prop",
  confidence: "High",
  lean: "Lean: Over 99.5. Volume play in a shootout.",
  whyNow: "I'd hammer the over 99.5 here — the number is too low for this usage.",
  edge: "I'd take the over 99.5.",
  analysis: {
    matchupAnalysis: "Projected usage clears 99.5 comfortably in this script.",
    injuryContext: "Check inactives before you bet it.",
    marketContext: "Books are slow to adjust to this role.",
    lineMovement: "Line opened lower and steamed up.",
    statisticalEdge: "Career rates support the over.",
  },
  caveats: ["Opener variance."],
};

const FORBID_ASK_FOR_LINES = [
  { label: "asked_user_for_lines", re: "can'?t help without|tell me what the books|what numbers are you seeing|need the (?:actual )?(?:prop )?lines" },
  { label: "no_live_row", re: "don'?t have a live row" },
];

/** @type {NflGoldenEvalCase[]} */
export const NFL_GOLDEN_EVAL_CASES = Object.freeze([
  // ---------- Game lines ----------
  {
    id: "line-spread-abbr",
    question: "NE @ SEA spread — is the dog live or do I pass?",
    board: "neSea",
    detected: "spread",
    scope: ["NE", "SEA"],
    modelFixture: INVENTED_NUMBER,
    forbidCodes: [],
    why: "Posted spread must anchor the answer; invented prop number must not survive.",
  },
  {
    id: "line-spread-nicknames",
    question: "do the patriots cover against the seahawks tonight?",
    board: "neSea",
    scope: ["NE", "SEA"],
    why: "Two nicknames must resolve both clubs.",
  },
  {
    id: "line-total",
    question: "NE @ SEA over 42.5 — thoughts on the total?",
    board: "neSea",
    detected: "total",
    scope: ["NE", "SEA"],
  },
  {
    id: "line-moneyline",
    question: "seahawks moneyline worth it tonight?",
    board: "neSea",
    detected: "moneyline",
    scope: ["SEA"],
  },
  {
    id: "line-total-kc-buf",
    question: "KC @ BUF total over 48.5?",
    board: "kcBuf",
    detected: "total",
    scope: ["KC", "BUF"],
  },

  // ---------- Single named prop, number stated ----------
  {
    id: "prop-pass-yds-stated",
    question: "Darnold under 249.5 passing yards tonight?",
    board: "neSea",
    detected: "pass_yds",
    scope: ["SEA"],
    evidence: ["Darnold"],
  },
  {
    id: "prop-pass-tds-stated",
    question: "Maye over 1.5 passing TDs (NE @ SEA) — fade the over?",
    board: "neSea",
    detected: "pass_tds",
    scope: ["NE", "SEA"],
    evidence: ["Maye"],
  },
  {
    id: "prop-rec-yds-stated",
    question: "aj brown over 34.5 receiving yards?",
    board: "neSea",
    detected: "rec_yds",
    scope: ["NE"],
    evidence: ["Brown"],
    why: "Lowercase name; Brown is a Patriot on the snapshot, not an Eagle.",
  },
  {
    id: "prop-rush-yds-stated",
    question: "Stevenson over 54.5 rushing yards tonight?",
    board: "neSea",
    detected: "rush_yds",
    scope: ["NE"],
    forbidScope: ["CHI"],
    evidence: ["Stevenson"],
    why: "Rush yards disambiguates Rhamondre (NE) over Tyrique (CHI).",
  },
  {
    id: "prop-receptions-stated",
    question: "Smith-Njigba over 5.5 receptions?",
    board: "neSea",
    detected: "receptions",
    scope: ["SEA"],
    evidence: ["Smith-Njigba"],
  },
  {
    id: "prop-alt-ladder-not-ticket",
    question: "Darnold passing yards — what's the play?",
    board: "neSea",
    detected: "pass_yds",
    scope: ["SEA"],
    evidence: ["Darnold"],
    modelFixture: {
      ...INVENTED_NUMBER,
      call: "UNDER 460.5",
      lean: "Lean: Under 460.5. Nobody throws for that.",
      whyNow: "I'd take the under 460.5 — free money.",
      edge: "I'd take the under 460.5.",
    },
    why: "460.5 is a real alt row, so the guard cannot flag it; the board must still carry the main number.",
  },

  // ---------- Named prop, no number ----------
  {
    id: "prop-named-no-number",
    question: "any good props for kittle and mccaffrey tonight?",
    board: "sfLar",
    detected: "props_board",
    scope: ["SF"],
    evidence: ["Kittle", "McCaffrey"],
    grounded: ["Kittle", "McCaffrey"],
    modelFixture: THIN_ASKS_FOR_LINES,
    forbidText: FORBID_ASK_FOR_LINES,
    expectCodes: ["props_board_force_recover"],
    why: "The live production miss — named skill players, no team, no numbers.",
  },
  {
    id: "prop-named-no-number-typo",
    question: "any good props for kittle, kyren, kittle? mccaffrey?",
    board: "sfLar",
    scope: ["SF", "LAR"],
    evidence: ["Kittle", "Williams", "McCaffrey"],
    grounded: ["Kittle", "Williams", "McCaffrey"],
    modelFixture: THIN_ASKS_FOR_LINES,
    forbidText: [
      ...FORBID_ASK_FOR_LINES,
      { label: "wrong_kyren", re: "Henderson" },
    ],
    why: "Duplicate/typo'd names; Kyren is Williams (LAR), never Henderson.",
  },
  {
    id: "prop-named-single-te",
    question: "kelce props tonight?",
    board: "kcBuf",
    scope: ["KC"],
    evidence: ["Kelce"],
    grounded: ["Kelce"],
    modelFixture: THIN_ASKS_FOR_LINES,
    forbidText: FORBID_ASK_FOR_LINES,
  },
  {
    id: "prop-named-two-teams",
    question: "props for doubs and smith-njigba?",
    board: "neSea",
    scope: ["NE", "SEA"],
    evidence: ["Doubs", "Smith-Njigba"],
    grounded: ["Doubs", "Smith-Njigba"],
    modelFixture: THIN_ASKS_FOR_LINES,
    forbidText: FORBID_ASK_FOR_LINES,
  },

  // ---------- Props board ----------
  {
    id: "board-vs-matchup",
    question: "best player props for the rams vs 49ers game tonight?",
    board: "sfLar",
    detected: "props_board",
    scope: ["SF", "LAR"],
    evidence: ["Kittle", "McCaffrey", "Williams", "Nacua"],
    modelFixture: THIN_ASKS_FOR_LINES,
    expectCodes: ["props_board_force_recover"],
    forbidText: FORBID_ASK_FOR_LINES,
    why: "Both clubs must resolve from one 'rams vs 49ers' phrase.",
  },
  {
    id: "board-abbr-matchup",
    question: "best player props NE @ SEA?",
    board: "neSea",
    detected: "props_board",
    scope: ["NE", "SEA"],
    evidence: ["Maye", "Brown", "Smith-Njigba"],
    modelFixture: THIN_ASKS_FOR_LINES,
    expectCodes: ["props_board_force_recover"],
    forbidText: FORBID_ASK_FOR_LINES,
  },
  {
    id: "board-best-bets",
    question: "what are the best bets for the seahawks and patriots game?",
    board: "neSea",
    detected: "props_board",
    scope: ["NE", "SEA"],
    modelFixture: THIN_ASKS_FOR_LINES,
    forbidText: FORBID_ASK_FOR_LINES,
  },
  {
    id: "board-typos",
    question: "best playre propes for seahaks vs patroits?",
    board: "neSea",
    detected: "props_board",
    scope: ["NE", "SEA"],
    modelFixture: THIN_ASKS_FOR_LINES,
    forbidText: FORBID_ASK_FOR_LINES,
    why: "Typo tolerance must survive normalization.",
  },
  {
    id: "board-no-novelty-headline",
    question: "best player props for patriots vs seahawks tonight?",
    board: "neSea",
    scope: ["NE", "SEA"],
    modelFixture: THIN_ASKS_FOR_LINES,
    forbidText: [
      ...FORBID_ASK_FOR_LINES,
      { label: "kicking_headline", re: "Borregales|kicking points" },
      { label: "period_headline", re: "1H|first half" },
    ],
    why: "Kicker and 1H rows exist on the board but must not headline.",
  },
  {
    id: "board-invented-number-repaired",
    question: "best player props for patriots vs seahawks?",
    board: "neSea",
    scope: ["NE", "SEA"],
    modelFixture: INVENTED_NUMBER,
    expectCodes: ["props_board_force_recover"],
    forbidText: [{ label: "invented_995", re: "99\\.5" }],
    why: "99.5 is on nobody's board; recovery must overwrite it.",
  },

  // ---------- Ticket review ----------
  {
    id: "ticket-five-leg-lowercase",
    question:
      "for tonights game, i bet: seahawks win, aj brown over 34.5, darnold under 249.5, doubs over 14.5, and maye under 239.5. thoughts?",
    board: "neSea",
    detected: "ticket_review",
    scope: ["NE", "SEA"],
    evidence: ["Brown", "Darnold", "Doubs", "Maye"],
    grounded: ["Brown", "Darnold", "Doubs", "Maye"],
    modelFixture: THIN_ASKS_FOR_LINES,
    expectCodes: ["ticket_review_recover"],
    forbidCodes: ["props_board_force_recover"],
    forbidText: [
      ...FORBID_ASK_FOR_LINES,
      { label: "wrong_team_leak", re: "\\bPHI\\b|Eagles|\\bGB\\b|Packer" },
    ],
    why: "The original production slip — all four player legs must get live numbers.",
  },
  {
    id: "ticket-two-leg-abbr",
    question: "i took NE @ SEA under 42.5 and maye under 239.5 — thoughts?",
    board: "neSea",
    detected: "ticket_review",
    scope: ["NE", "SEA"],
    evidence: ["Maye"],
    grounded: ["Maye"],
    modelFixture: THIN_ASKS_FOR_LINES,
    expectCodes: ["ticket_review_recover"],
    forbidText: FORBID_ASK_FOR_LINES,
  },
  {
    id: "ticket-sf-lar",
    question: "my slip: rams win, kittle over 40.5, mccaffrey over 70.5, stafford under 275.5. thoughts?",
    board: "sfLar",
    detected: "ticket_review",
    scope: ["SF", "LAR"],
    evidence: ["Kittle", "McCaffrey", "Stafford"],
    grounded: ["Kittle", "McCaffrey", "Stafford"],
    modelFixture: THIN_ASKS_FOR_LINES,
    expectCodes: ["ticket_review_recover"],
    forbidText: FORBID_ASK_FOR_LINES,
  },
  {
    id: "ticket-no-nickname-anchor",
    question: "i bet kelce over 45.5 and mahomes over 250.5. thoughts?",
    board: "kcBuf",
    detected: "ticket_review",
    scope: ["KC"],
    evidence: ["Kelce", "Mahomes"],
    grounded: ["Kelce", "Mahomes"],
    modelFixture: THIN_ASKS_FOR_LINES,
    expectCodes: ["ticket_review_recover"],
    forbidText: FORBID_ASK_FOR_LINES,
    why: "Pure player-prop ticket with no team leg — scope must come from the names.",
  },
  {
    id: "ticket-no-maye-no-maye-copy",
    question: "i bet seahawks win and darnold under 249.5. thoughts?",
    board: "neSea",
    detected: "ticket_review",
    scope: ["SEA"],
    evidence: ["Darnold"],
    grounded: ["Darnold"],
    modelFixture: THIN_ASKS_FOR_LINES,
    forbidText: [
      ...FORBID_ASK_FOR_LINES,
      { label: "hardcoded_maye", re: "Maye" },
      { label: "hardcoded_sea_game", re: "one SEA game" },
    ],
    why: "No Maye on the slip means no Maye boilerplate.",
  },

  // ---------- Cross-game hygiene ----------
  {
    id: "hygiene-cross-game-brown",
    question: "aj brown receiving yards tonight vs seattle?",
    board: "neSea",
    scope: ["NE", "SEA"],
    evidence: ["Brown"],
    forbidText: [{ label: "phi_row_leak", re: "64\\.5" }],
    why: "A PHI-stamped Brown row exists on the slate and must not be quoted.",
  },
  {
    id: "hygiene-cross-game-doubs",
    question: "doubs receiving yards tonight?",
    board: "neSea",
    scope: ["NE"],
    evidence: ["Doubs"],
    forbidText: [{ label: "gb_row_leak", re: "35\\.5" }],
    why: "A GB-stamped Doubs row must not be quoted on an NE board.",
  },

  // ---------- Defense / secondary markets ----------
  {
    id: "market-sacks",
    question: "NE @ SEA sacks props — anything worth it?",
    board: "neSea",
    detected: "sacks",
    scope: ["NE", "SEA"],
    evidence: ["White"],
  },
  {
    id: "market-tackles",
    question: "Gonzalez over 5.5 tackles NE @ SEA?",
    board: "neSea",
    detected: "tackles",
    scope: ["NE", "SEA"],
    evidence: ["Gonzalez"],
  },
  {
    id: "market-anytime-td",
    question: "anytime TD for stevenson tonight?",
    board: "neSea",
    detected: "anytime_td",
    scope: ["NE"],
    forbidScope: ["CHI"],
    evidence: ["Stevenson"],
    why: "Anytime TD prefers skill RBs — Rhamondre NE, never Tyrique CHI.",
  },
  {
    id: "market-targets",
    question: "how many targets for aj brown tonight?",
    board: "neSea",
    detected: "targets",
    scope: ["NE"],
    evidence: ["Brown"],
  },
  {
    id: "market-ints",
    question: "Darnold interceptions thrown over 0.5?",
    board: "neSea",
    detected: "pass_ints",
    scope: ["SEA"],
    evidence: ["Darnold"],
  },
  {
    id: "market-completions",
    question: "Darnold passing completions over 20.5?",
    board: "neSea",
    scope: ["SEA"],
    evidence: ["Darnold"],
  },
  {
    id: "market-longest-completion",
    question: "Darnold longest completion over 42.5 tonight?",
    board: "neSea",
    scope: ["SEA"],
    evidence: ["Darnold"],
  },
  {
    id: "market-rush-rec-combo",
    question: "mccaffrey rushing yards and receiving yards tonight?",
    board: "sfLar",
    scope: ["SF"],
    forbidScope: ["WSH"],
    evidence: ["McCaffrey"],
    why: "Rush context picks Christian (SF) over Luke (WSH).",
  },

  // ---------- Thin / empty feed honesty ----------
  {
    id: "empty-board-no-invention",
    question: "best player props for patriots vs seahawks tonight?",
    board: "emptyProps",
    scope: ["NE", "SEA"],
    modelFixture: INVENTED_NUMBER,
    forbidText: [{ label: "invented_995", re: "99\\.5" }],
    why: "Empty prop pocket must never produce a priced player ticket.",
  },
  {
    id: "empty-board-stated-prop",
    question: "Maye over 1.5 passing TDs?",
    board: "emptyProps",
    scope: ["NE"],
    modelFixture: INVENTED_NUMBER,
    forbidText: [{ label: "invented_995", re: "99\\.5" }],
  },

  // ---------- Scope discipline ----------
  {
    id: "scope-three-team-prop-slip",
    question: "i bet: kelce over 45.5, nacua over 60.5, and brown over 34.5. thoughts?",
    board: "neSea",
    scope: [],
    evidence: ["Brown"],
    why:
      "Three clubs / unplaceable 'brown' → week board (empty scope). Name-filter " +
      "keeps Brown's live NE rows so the ambiguous leg still grades.",
  },
  {
    id: "scope-single-nickname",
    question: "best props for the chiefs tonight?",
    board: "kcBuf",
    scope: ["KC"],
    modelFixture: THIN_ASKS_FOR_LINES,
    forbidText: FORBID_ASK_FOR_LINES,
  },
  {
    id: "scope-niners-alias",
    question: "best player props for the niners game?",
    board: "sfLar",
    scope: ["SF"],
    modelFixture: THIN_ASKS_FOR_LINES,
    forbidText: FORBID_ASK_FOR_LINES,
  },
]);

/**
 * @param {string} [id]
 */
export function nflGoldenEvalCases(id = "") {
  const all = [...NFL_GOLDEN_EVAL_CASES];
  return id ? all.filter((row) => row.id === id) : all;
}
