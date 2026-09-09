/**
 * Catch weird tonight-board tickets: alts, 1H, mixed markets, routing, copy.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { applyNflAskGuard } from "./nflAskGuard.js";
import { looksLikeNflPropsBoardAsk } from "./nflAskNormalize.js";
import {
  inferNflPropTicketSide,
  isNflPeriodPropRow,
  nflPropMarketKey,
  pickNflPropsBoardTickets,
  preferHighPrintPrimary,
} from "./nflAskPropTrim.js";
import {
  hasNflAskLexicon,
  inferSportFromQuestionText,
  resolveSportHint,
} from "./urTakeSportRouting.js";
import { detectSportFromQuestion } from "../src/lib/detectSportFromQuestion.js";

function line(partial) {
  return {
    game: "NE @ SEA",
    overOdds: -110,
    underOdds: -110,
    eventId: "1",
    ...partial,
  };
}

const MESSY_TONIGHT = [
  line({ player: "Drake Maye", team: "NE", prop: "passing yards", propRaw: "passing_yards", line: 231.5 }),
  line({ player: "Drake Maye", team: "NE", prop: "passing yards", propRaw: "passing_yards", line: 232.5 }),
  line({ player: "Drake Maye", team: "NE", prop: "passing yards", propRaw: "passing_yards", line: 261.5 }),
  line({ player: "Drake Maye", team: "NE", prop: "passing yards", propRaw: "passing_yards", line: 460.5 }),
  line({ player: "Drake Maye", team: "NE", prop: "rushing yards", propRaw: "rushing_yards", line: 47.5 }),
  line({ player: "Drake Maye", team: "NE", prop: "passing + rushing yards", propRaw: "passing_rushing_yards", line: 109.5 }),
  line({ player: "Drake Maye", team: "NE", prop: "completions", propRaw: "passing_completions", line: 22.5 }),
  line({ player: "Rhamondre Stevenson", team: "NE", prop: "rushing yards 1h", propRaw: "rushing_yards_1h", line: 27.5 }),
  line({ player: "Rhamondre Stevenson", team: "NE", prop: "rushing yards", propRaw: "rushing_yards", line: 56.5 }),
  line({ player: "Jadarian Price", team: "NE", prop: "longest rush", propRaw: "rushing_longest", line: 13.5 }),
  line({ player: "George Holani", team: "SEA", prop: "rushing receiving yards", propRaw: "rushing_receiving_yards", line: 34.5 }),
  line({ player: "Sam Darnold", team: "SEA", prop: "passing tds", propRaw: "passing_tds", line: 1.5 }),
  line({ player: "Sam Darnold", team: "MIN", prop: "passing tds", propRaw: "passing_tds", line: 2.5 }),
  line({ player: "A.J. Brown", team: "PHI", prop: "receiving yards", propRaw: "receiving_yards", line: 62.5 }),
];

const ROSTER = {
  week: 1,
  grade: "green",
  detected: { marketId: "props_board", propTypeHints: [] },
  propMatch: { matched: MESSY_TONIGHT.length },
  league: {
    rostersByTeam: {
      NE: [
        { name: "Drake Maye" },
        { name: "Rhamondre Stevenson" },
        { name: "Jadarian Price" },
      ],
      SEA: [{ name: "Sam Darnold" }, { name: "George Holani" }],
    },
  },
};

const GAMES = [{ awayAbbr: "NE", homeAbbr: "SEA", providerGameId: 1, week: 1 }];

function recoverTonight() {
  return applyNflAskGuard({
    question: "player props for the game tonight?",
    structured: {
      call: "MAYE UNDER 460.5",
      lean: "Lean: Under 460.5. Maye — high number in an opener.",
      confidence: "High",
      whyNow: "I'd take Maye under 460.5. Other books 47.5/109.5.",
    },
    isCurrentSeason: true,
    games: GAMES,
    propLines: MESSY_TONIGHT,
    briefcase: ROSTER,
  });
}

test("market keys keep pass yards, rush, combo, longest, and 1H apart", () => {
  assert.equal(nflPropMarketKey(MESSY_TONIGHT[2]), "pass_yds");
  assert.equal(nflPropMarketKey(MESSY_TONIGHT[4]), "rush_yds");
  assert.equal(nflPropMarketKey(MESSY_TONIGHT[5]), "pass_rush_yds");
  assert.equal(nflPropMarketKey(MESSY_TONIGHT[9]), "rush_long");
  assert.match(nflPropMarketKey(MESSY_TONIGHT[7]), /period/);
  assert.equal(isNflPeriodPropRow(MESSY_TONIGHT[7]), true);
  assert.equal(isNflPeriodPropRow(MESSY_TONIGHT[8]), false);
});

test("tonight board: no 460.5, no 1H, no PHI Brown, unique players", () => {
  const tickets = pickNflPropsBoardTickets(MESSY_TONIGHT, {
    scope: ["NE", "SEA"],
    eventIds: ["1"],
    rosterNames: [
      "Drake Maye",
      "Rhamondre Stevenson",
      "Jadarian Price",
      "Sam Darnold",
      "George Holani",
    ],
    question: "player props for the game tonight?",
    maxTickets: 5,
  });
  assert.ok(tickets.length >= 2);
  assert.equal(tickets[0].line, 261.5);
  assert.equal(nflPropMarketKey(tickets[0]), "pass_yds");
  const names = tickets.map((t) => String(t.player));
  assert.equal(new Set(names.map((n) => n.toLowerCase())).size, names.length);
  for (const t of tickets) {
    assert.equal(isNflPeriodPropRow(t), false);
    assert.notEqual(Number(t.line), 460.5);
    assert.doesNotMatch(String(t.prop), /1h|first half/i);
    assert.doesNotMatch(String(t.player), /A\.?J\.?\s+Brown/i);
  }
  const stevenson = tickets.find((t) => /stevenson/i.test(String(t.player)));
  if (stevenson) {
    assert.equal(stevenson.line, 56.5);
  }
});

test("guard recover does not mix rush/combo/alts into the Maye pass-yards why", () => {
  const { structured, codes } = recoverTonight();
  const blob = `${structured.call} ${structured.lean} ${structured.whyNow}`;
  assert.ok(codes.includes("props_board_force_recover") || codes.includes("props_board_recover"));
  assert.match(String(structured.call), /UNDER 261\.5/i);
  assert.match(blob, /231\.5|232\.5/);
  assert.doesNotMatch(blob, /460\.5/);
  assert.doesNotMatch(String(structured.whyNow), /other books[^\n]*(47\.5|109\.5|22\.5|13\.5|27\.5)/i);
  assert.doesNotMatch(blob, /DraftKings|FanDuel|GOAT|BDL/i);
  assert.doesNotMatch(String(structured.whyNow), /1h|first half/i);
  assert.doesNotMatch(String(structured.lean), /Those counting stats are a prior/i);
  assert.ok(!codes.includes("vintage_blur"));
});

test("peer lines for Maye pass yards ignore 47.5 / 109.5 / 460.5", () => {
  const primary = preferHighPrintPrimary([MESSY_TONIGHT[0]], MESSY_TONIGHT)[0];
  assert.equal(primary.line, 261.5);
  const ticket = inferNflPropTicketSide(primary, MESSY_TONIGHT, { openerWeek: true });
  assert.equal(ticket.side, "Under");
  assert.doesNotMatch(ticket.why, /47\.5|109\.5|460\.5|22\.5/);
});

test("home tonight-props routes NFL; Lakers stay NBA", () => {
  const q = "player props for the game tonight?";
  assert.equal(looksLikeNflPropsBoardAsk(q), true);
  assert.equal(hasNflAskLexicon(q), true);
  assert.equal(inferSportFromQuestionText(q), "nfl");
  assert.equal(detectSportFromQuestion(q, "home"), "nfl");
  assert.equal(resolveSportHint({ incomingSportHint: "generic", question: q }), "nfl");
  assert.equal(detectSportFromQuestion("Best Lakers player prop tonight?", "home"), "nba");
  assert.equal(detectSportFromQuestion("what's the weather today?", "home"), "generic");
});

test("tonight board skips kicker XP, 0.5 rush, and tackles", () => {
  const props = [
    line({ player: "Drake Maye", team: "NE", prop: "passing yards", propRaw: "passing_yards", line: 261.5 }),
    line({ player: "AJ Barner", team: "SEA", prop: "rush yards", propRaw: "rush_yds", line: 0.5 }),
    line({ player: "Andy Borregales", team: "NE", prop: "extra points made", propRaw: "extra_points_made", line: 1.5 }),
    line({ player: "Christian Gonzalez", team: "NE", prop: "tackles assists", propRaw: "tackles_assists", line: 4.5 }),
    line({ player: "Sam Darnold", team: "SEA", prop: "passing tds", propRaw: "passing_tds", line: 1.5 }),
    line({ player: "Rhamondre Stevenson", team: "NE", prop: "rushing yards", propRaw: "rushing_yards", line: 56.5 }),
  ];
  const out = pickNflPropsBoardTickets(props, {
    scope: ["NE", "SEA"],
    eventIds: ["1"],
    rosterNames: props.map((p) => p.player),
    question: "player props for the game tonight?",
    maxTickets: 5,
  });
  const blob = out.map((t) => `${t.player} ${t.prop} ${t.line}`).join(" | ");
  assert.match(blob, /Maye/i);
  assert.doesNotMatch(blob, /Barner|Borregales|Gonzalez|0\.5|extra points|tackles/i);
});
