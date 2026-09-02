import assert from "node:assert/strict";
import test from "node:test";
import { validateStructuredURTakeResponse } from "../api/types/urTakeResponse.js";
import {
  applyNflAskGuard,
  buildNflPassStructuredTake,
  detectNflCallBodyConflict,
  detectNflInventedLine,
  detectNflInventedLineMove,
  detectNflSpreadInvert,
  detectNflVintageBlur,
  extractNflStatedPropLine,
  isNflConditionalSnapAsk,
  isNflPreseasonStarterAssumption,
  parseNflPostedSpreads,
} from "./nflAskGuard.js";

const tonight = [
  {
    awayAbbr: "TEN",
    homeAbbr: "SF",
    seasonType: "pre",
    week: 1,
    spread: { favoriteAbbr: "TEN", displayLine: "TEN -6", favoritePoint: 6 },
  },
  {
    awayAbbr: "GB",
    homeAbbr: "PIT",
    seasonType: "pre",
    week: 1,
    spread: { displayLine: "GB -2.5" },
  },
];

test("parseNflPostedSpreads reads displayLine favorite", () => {
  const rows = parseNflPostedSpreads(tonight);
  const ten = rows.find((r) => r.favoriteAbbr === "TEN");
  assert.equal(ten.dogAbbr, "SF");
  assert.equal(ten.points, 6);
});

test("TEN +6 against posted TEN -6 is an invert", () => {
  const hit = detectNflSpreadInvert("TEN +6", tonight);
  assert.equal(hit.invert, true);
  assert.equal(hit.posted, "TEN -6");
  assert.equal(hit.fadeCorrect, "SF +6");
});

test("SF +6 against posted TEN -6 is a legal fade", () => {
  assert.equal(detectNflSpreadInvert("SF +6", tonight), null);
});

test("TEN -6 matches the posted favorite", () => {
  assert.equal(detectNflSpreadInvert("THE PLAY: TEN -6", tonight), null);
});

test("conditional snap ask detects if-one-series", () => {
  assert.equal(
    isNflConditionalSnapAsk(
      "If Love only plays one series at Pittsburgh tonight, is the under 39.5 the only number?",
    ),
    true,
  );
  assert.equal(isNflConditionalSnapAsk("GB @ PIT under 39.5"), false);
});

test("preseason starter assumption copy", () => {
  assert.equal(isNflPreseasonStarterAssumption("Starters will play; bubble guys lack volume"), true);
  assert.equal(isNflPreseasonStarterAssumption("Starters likely sit or go one series"), false);
});

test("guard rewrites inverted favorite to PASS", () => {
  const { structured, codes } = applyNflAskGuard({
    question: "Titans -6 at San Francisco tonight — is that just the 49ers sitting everyone?",
    structured: { call: "TEN +6", lean: "Lean: TEN +6.", confidence: "Medium" },
    games: tonight,
  });
  assert.ok(codes.includes("spread_invert"));
  assert.equal(structured.call, "PASS");
  assert.match(String(structured.lean), /TEN -6/);
  assert.match(String(structured.lean), /SF \+6/);
});

test("guard marks one-series if as CONDITIONAL", () => {
  const games = tonight.map((g) =>
    g.homeAbbr === "PIT" ? { ...g, total: { line: 39.5 } } : g,
  );
  const { structured, codes } = applyNflAskGuard({
    question: "If Love only plays one series at Pittsburgh, is the under 39.5 the only number?",
    structured: { call: "UNDER 39.5", lean: "Lean: UNDER 39.5. Love's exit guts volume.", confidence: "Medium" },
    games,
  });
  assert.ok(codes.includes("conditional_as_fact"));
  assert.ok(!codes.includes("invented_line"));
  assert.equal(structured.call, "UNDER 39.5");
  assert.equal(structured.confidence, "Speculative");
  assert.match(String(structured.lean), /^CONDITIONAL/i);
});

test("guard PASSes bubble ATD that assumed starters play", () => {
  const { structured, codes } = applyNflAskGuard({
    question: "Any roster-bubble skill guy on tonight's six games you'd actually take for an anytime TD if the starters sit?",
    structured: {
      call: "WARREN ANYTIME TD",
      lean: "Lean: Pass. Starters will play; roster bubble guys lack volume.",
      confidence: "Speculative",
    },
    games: tonight,
  });
  assert.ok(codes.includes("preseason_starter_assumption"));
  assert.equal(structured.call, "PASS");
});

test("PASS template validates against structured schema", () => {
  const take = buildNflPassStructuredTake("structured_parse_failed");
  const v = validateStructuredURTakeResponse(take);
  assert.equal(v.valid, true, v.errors && v.errors.join("; "));
});

test("red suitcase on a prop ask forces PASS", () => {
  const { structured, codes } = applyNflAskGuard({
    question: "Cook rushing yards over 72.5 tonight?",
    structured: {
      call: "OVER 72.5",
      lean: "Lean: Over. Cook eats this box.",
      confidence: "High",
    },
    games: tonight,
    briefcase: {
      grade: "red",
      detected: { marketId: "rush_yds", propTypeHints: ["rushing_yards"] },
      propMatch: { matched: 0 },
    },
  });
  assert.ok(codes.includes("no_live_prop") || codes.includes("suitcase_red"));
  assert.equal(structured.call, "PASS");
  assert.equal(structured.confidence, "Speculative");
});

test("forcePass rewrites even when model already said PASS", () => {
  const q =
    "I'm looking at Maye 1.5 passing TDs (NE @ SEA). Should I fade the over, take the under, or pass?";
  const { structured, codes } = applyNflAskGuard({
    question: q,
    structured: {
      call: "PASS",
      lean: "Lean: Pass. Take did not parse cleanly. No invented number.",
      confidence: "Speculative",
      whyNow: "broken",
      edge: "short",
    },
    games: tonight,
    briefcase: {
      grade: "red",
      detected: { marketId: "pass_tds", propTypeHints: ["passing_tds", "pass_tds"], label: "Passing touchdowns" },
      propMatch: { matched: 0 },
    },
  });
  assert.ok(codes.includes("no_live_prop"));
  assert.equal(structured.call, "PASS");
  assert.match(String(structured.lean), /No live .+ row on the board/i);
  assert.ok(!/did not parse cleanly/i.test(String(structured.lean)));
  const take = buildNflPassStructuredTake("no_live_prop", { question: q });
  const v = validateStructuredURTakeResponse(take);
  assert.equal(v.valid, true, v.errors && v.errors.join("; "));
  assert.equal(extractNflStatedPropLine(q), 1.5);
});

test("red suitcase on a posted spread does not force PASS when odds are present", () => {
  const { structured, codes } = applyNflAskGuard({
    question: "DET @ CIN — CIN -6.5. Side or pass?",
    structured: {
      call: "CIN -6.5",
      lean: "Lean: CIN -6.5. Depth should hold in preseason.",
      confidence: "Medium",
    },
    games: [
      {
        awayAbbr: "DET",
        homeAbbr: "CIN",
        seasonType: "pre",
        spread: { favoriteAbbr: "CIN", displayLine: "CIN -6.5", favoritePoint: 6.5 },
      },
    ],
    briefcase: {
      grade: "red",
      detected: { marketId: "spread", propTypeHints: [] },
      propMatch: { matched: 0 },
      missingNeeded: [],
      alwaysMissing: ["slate.playerProps", "league.rosters"],
    },
  });
  assert.ok(!codes.includes("suitcase_red"));
  assert.ok(!codes.includes("no_live_prop"));
  assert.equal(structured.call, "CIN -6.5");
});

test("yellow missing-injury with a live prop does not force PASS", () => {
  const { structured, codes } = applyNflAskGuard({
    question: "Cook rushing yards over 72.5?",
    structured: {
      call: "OVER 72.5",
      lean: "Lean: Over 72.5. Usage holds.",
      confidence: "High",
    },
    games: tonight,
    propLines: [{ player: "James Cook", propRaw: "rushing_yards", line: 72.5 }],
    briefcase: {
      grade: "yellow",
      detected: { marketId: "rush_yds", propTypeHints: ["rushing_yards"] },
      propMatch: { matched: 1 },
    },
  });
  assert.ok(!codes.includes("suitcase_red"));
  assert.ok(!codes.includes("no_live_prop"));
  assert.equal(structured.call, "OVER 72.5");
  assert.equal(structured.confidence, "Medium");
});

test("invented prop number with empty board becomes PASS", () => {
  const hit = detectNflInventedLine([88.5], []);
  assert.equal(hit.invented, true);
  const { structured, codes } = applyNflAskGuard({
    question: "Best WR prop tonight?",
    structured: {
      call: "OVER 88.5",
      lean: "Lean: Over 88.5. Smash it.",
      confidence: "Medium",
    },
    games: [],
    propLines: [],
    briefcase: {
      grade: "green",
      detected: { marketId: "general", propTypeHints: [] },
      propMatch: { matched: 0 },
    },
  });
  assert.ok(codes.includes("invented_line"));
  assert.equal(structured.call, "PASS");
});

test("call OVER vs body UNDER is a conflict", () => {
  assert.equal(
    detectNflCallBodyConflict("OVER 72.5", "Take the under. Under is the play because script dies.").conflict,
    "over_vs_under",
  );
  const { structured, codes } = applyNflAskGuard({
    question: "Cook over 72.5 rushing?",
    structured: {
      call: "OVER 72.5",
      lean: "Lean: Over 72.5.",
      edge: "Take the under is the play because the box is stacked.",
      confidence: "Medium",
      analysis: {
        matchupAnalysis: "Under is the play against this front.",
        statisticalEdge: "Fade the over if early deficit.",
      },
    },
    games: tonight,
    propLines: [{ player: "James Cook", propRaw: "rushing_yards", line: 72.5 }],
    briefcase: {
      grade: "green",
      detected: { marketId: "rush_yds", propTypeHints: ["rushing_yards"] },
      propMatch: { matched: 1 },
    },
  });
  assert.ok(codes.includes("call_body_conflict"));
  assert.equal(structured.call, "PASS");
});

test("anytime TD clamps High down to Speculative", () => {
  const { structured } = applyNflAskGuard({
    question: "Cook anytime TD tonight?",
    structured: {
      call: "COOK ATD",
      lean: "Lean: Soft lean only. Touchdowns are lumpy.",
      confidence: "High",
    },
    games: tonight,
    propLines: [{ player: "James Cook", propRaw: "anytime_td", line: 0.5 }],
    briefcase: {
      grade: "green",
      detected: { marketId: "anytime_td", propTypeHints: ["anytime_td"] },
      propMatch: { matched: 1 },
    },
  });
  assert.equal(structured.confidence, "Speculative");
  assert.equal(structured.call, "COOK ATD");
});

test("line stable with no opener is stripped, not a ticket", () => {
  assert.equal(detectNflInventedLineMove("Line stable; no recent sharp movement.", false), true);
  assert.equal(detectNflInventedLineMove("Line stable; no recent sharp movement.", true), false);
  const { structured, codes } = applyNflAskGuard({
    question: "DEN @ ATL — ATL -1.5. Side or pass?",
    structured: {
      call: "ATL -1.5",
      lean: "Lean: ATL -1.5. Line stable; no recent sharp movement.",
      confidence: "Medium",
      analysis: { lineMovement: "Line stable; no recent sharp movement." },
    },
    games: [
      {
        awayAbbr: "DEN",
        homeAbbr: "ATL",
        seasonType: "pre",
        spread: { favoriteAbbr: "ATL", displayLine: "ATL -1.5", favoritePoint: 1.5 },
      },
    ],
    briefcase: {
      grade: "yellow",
      detected: { marketId: "spread", propTypeHints: [] },
      propMatch: { matched: 0 },
      missingNeeded: [],
    },
  });
  assert.ok(codes.includes("invented_line_move"));
  assert.equal(structured.call, "ATL -1.5");
  assert.doesNotMatch(String(structured.lean), /line stable/i);
  assert.match(String(structured.analysis.lineMovement), /No opener/);
});

test("unattributed yds/g is vintage when not current season", () => {
  assert.equal(detectNflVintageBlur("Goff has elite volume (268.5 yds/g)", false), true);
  assert.equal(detectNflVintageBlur("Goff 268.5 yds/g on 2024 tape", false), false);
  assert.equal(detectNflVintageBlur("Goff has elite volume (268.5 yds/g)", true), false);
  const { structured, codes } = applyNflAskGuard({
    question: "DET @ CIN — Goff passing?",
    structured: {
      call: "PASS",
      lean: "Lean: Pass. Goff has elite volume (268.5 yds/g).",
      confidence: "Medium",
      analysis: { statisticalEdge: "Goff 268.5 yds/g travels." },
    },
    games: tonight,
    isCurrentSeason: false,
  });
  assert.ok(codes.includes("vintage_blur"));
  assert.equal(structured.confidence, "Speculative");
  assert.match(String(structured.analysis.statisticalEdge), /prior/);
});
