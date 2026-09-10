import assert from "node:assert/strict";
import test from "node:test";
import { validateStructuredURTakeResponse } from "../api/types/urTakeResponse.js";
import { detectNflAskMarket } from "./nflGoatExtractionContract.js";
import { applyNflAskGuard } from "./nflAskGuard.js";
import {
  isNflTicketReviewAsk,
  parseNflStatedTicketLegs,
  applyNflTicketReviewToStructured,
} from "./nflAskTicketReview.js";

const SLIP =
  "for tonights game, i bet: seahawks win, aj brown over 34.5, darnold under 249.5, doubs over 14.5, and maye under 239.5. thoughts?";

const games = [
  {
    awayAbbr: "NE",
    homeAbbr: "SEA",
    spread: { favoriteAbbr: "SEA", displayLine: "SEA -3.5", favoritePoint: 3.5 },
  },
];

const propLines = [
  { player: "Sam Darnold", propRaw: "pass_yds", prop: "passing yards", line: 228.5, game: "NE @ SEA", team: "SEA" },
  { player: "Drake Maye", propRaw: "pass_yds", prop: "passing yards", line: 231.5, game: "NE @ SEA", team: "NE" },
  { player: "A.J. Brown", propRaw: "rec_yds", prop: "receiving yards", line: 62.5, game: "NE @ SEA", team: "NE" },
  { player: "A.J. Brown", propRaw: "rec_yds", prop: "receiving yards", line: 64.5, game: "DAL @ PHI", team: "PHI" },
  { player: "Romeo Doubs", propRaw: "rec_yds", prop: "receiving yards", line: 35.5, game: "GB @ DET", team: "GB" },
  { player: "Romeo Doubs", propRaw: "rec_yds", prop: "receiving yards", line: 28.5, game: "NE @ SEA", team: "NE" },
];

const briefcase = {
  league: {
    playerTeamByName: { "aj brown": "NE", "drake maye": "NE", "sam darnold": "SEA", "romeo doubs": "NE" },
    rostersByTeam: {
      NE: [{ name: "A.J. Brown" }, { name: "Drake Maye" }, { name: "Romeo Doubs" }],
      SEA: [{ name: "Sam Darnold" }],
    },
  },
};

test("ticket review parses the five-leg slip", () => {
  const legs = parseNflStatedTicketLegs(SLIP);
  assert.ok(legs.some((l) => l.kind === "win"));
  assert.equal(legs.filter((l) => l.kind === "ou").length, 4);
  assert.equal(isNflTicketReviewAsk(SLIP), true);
  assert.equal(detectNflAskMarket(SLIP).marketId, "ticket_review");
});

test("ticket review guard does not collapse to a Darnold props-board recover", () => {
  const { structured, codes } = applyNflAskGuard({
    question: SLIP,
    structured: {
      call: "UNDER 235.5",
      lean: "Lean: Under 235.5. Darnold — high number in an opener.",
      confidence: "Speculative",
      whyNow: "I'd take Darnold under 235.5.",
      edge: "I'd take the under. Don't stack it.",
      callType: "prop",
    },
    games,
    propLines,
    briefcase: {
      grade: "green",
      detected: { marketId: "props_board", propTypeHints: ["passing_yards"] },
      propMatch: { matched: 12 },
      league: briefcase.league,
    },
  });
  assert.ok(codes.includes("ticket_review_recover"));
  assert.ok(!codes.includes("props_board_force_recover"));
  assert.doesNotMatch(String(structured.lean), /Ambiguous player/i);
  assert.doesNotMatch(String(structured.whyNow), /Under 235\.5/);
  assert.match(String(structured.whyNow), /Darnold/i);
  assert.match(String(structured.whyNow), /249\.5/);
  assert.match(String(structured.whyNow), /Maye/i);
  assert.match(String(structured.whyNow), /239\.5/);
  assert.match(String(structured.whyNow), /Brown/i);
  assert.doesNotMatch(String(structured.whyNow), /PHI|Eagles|not Patriots/i);
  assert.match(String(structured.whyNow), /Doubs/i);
  assert.doesNotMatch(String(structured.whyNow), /\bGB\b|Packer/i);
  const v = validateStructuredURTakeResponse(structured);
  assert.equal(v.valid, true, v.errors && v.errors.join("; "));
});

test("applyNflTicketReviewToStructured prefers rec yards for Brown 34.5", () => {
  const structured = {
    call: "PASS",
    lean: "Lean: Pass.",
    confidence: "Medium",
  };
  applyNflTicketReviewToStructured(structured, SLIP, games, propLines, briefcase);
  assert.match(String(structured.whyNow), /62\.5/);
  assert.match(String(structured.whyNow), /Maye/i);
  assert.match(String(structured.whyNow), /239\.5/);
  assert.match(String(structured.whyNow), /Doubs/i);
  assert.doesNotMatch(String(structured.whyNow), /don't have a live row/i);
  assert.doesNotMatch(String(structured.whyNow), /Ambiguous|PHI|Eagles/);
});

test("ticket review grades unstamped Maye/Brown/Doubs rows", () => {
  const structured = { call: "PASS", lean: "Lean: Pass.", confidence: "Medium" };
  applyNflTicketReviewToStructured(
    structured,
    SLIP,
    games,
    [
      { player: "Sam Darnold", propRaw: "pass_yds", prop: "passing yards", line: 230.5 },
      { player: "Drake Maye", propRaw: "pass_yds", prop: "passing yards", line: 231.5 },
      { player: "AJ Brown", propRaw: "rec_yds", prop: "receiving yards", line: 61.5 },
      { player: "Romeo Doubs", propRaw: "rec_yds", prop: "receiving yards", line: 27.5 },
    ],
    briefcase,
  );
  assert.match(String(structured.whyNow), /231\.5/);
  assert.match(String(structured.whyNow), /61\.5/);
  assert.match(String(structured.whyNow), /27\.5/);
  assert.doesNotMatch(String(structured.whyNow), /don't have a live row/i);
});

test("SEA-only question still keeps NE props through resolve → scrub → trim → guard", async () => {
  const { resolveNflScopeTeamAbbrevSet } = await import("../api/_nflContext.js");
  const { scrubNflMatchupPropLines, buildNflStaticPlayerTeamIndex } = await import(
    "../api/_nflMatchupPropHygiene.js"
  );
  const { trimNflPlayerPropsForAsk } = await import("./nflAskPropTrim.js");
  const scope = resolveNflScopeTeamAbbrevSet(SLIP, null);
  const teamIndex = buildNflStaticPlayerTeamIndex();
  const scrubbed = scrubNflMatchupPropLines(propLines, {
    scope,
    playerTeamByName: teamIndex,
  });
  const trimmed = trimNflPlayerPropsForAsk(scrubbed, {
    scope,
    question: SLIP,
    maxRows: 24,
    playerTeamByName: teamIndex,
    rosterNames: ["Drake Maye", "A.J. Brown", "Romeo Doubs", "Sam Darnold"],
  });
  const names = trimmed.map((p) => p.player);
  assert.ok(names.includes("Drake Maye"), names.join(","));
  assert.ok(names.includes("A.J. Brown"), names.join(","));
  assert.ok(names.includes("Romeo Doubs"), names.join(","));
  const { structured, codes } = applyNflAskGuard({
    question: SLIP,
    structured: { call: "PASS", lean: "Lean: Pass.", confidence: "Medium" },
    games,
    propLines: trimmed,
    briefcase: { grade: "green", detected: { marketId: "ticket_review" }, league: briefcase.league },
  });
  assert.ok(codes.includes("ticket_review_recover"));
  assert.ok(!codes.includes("props_board_force_recover"));
  assert.doesNotMatch(String(structured.whyNow), /don't have a live row/i);
  assert.match(String(structured.whyNow), /62\.5|28\.5|231\.5/);
});

test("Seahawks ML does not invent a Maye fight without a Maye under", () => {
  const structured = { call: "PASS", lean: "Lean: Pass.", confidence: "Medium" };
  applyNflTicketReviewToStructured(
    structured,
    "i bet seahawks win and darnold under 249.5. thoughts?",
    games,
    [{ player: "Sam Darnold", propRaw: "pass_yds", prop: "passing yards", line: 230.5, team: "SEA" }],
    briefcase,
  );
  assert.doesNotMatch(String(structured.whyNow), /Maye/i);
  assert.doesNotMatch(String(structured.edge), /SEA game/i);
});

