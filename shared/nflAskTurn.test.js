import assert from "node:assert/strict";
import test from "node:test";
import { nflAskNamedPlayerHits } from "./nflAskScope.js";
import {
  buildNflFollowUpHoldTake,
  classifyNflAskFollowUp,
} from "./nflAskTurn.js";

const prior = {
  role: "assistant",
  sport: "nfl",
  structured: {
    sport: "NFL",
    call: "WILLIAMS UNDER 45.5",
    callType: "prop",
    confidence: "Speculative",
    lean: "Lean: Williams under 45.5 rushing yards.",
    whyNow: "Board:\n1. Williams under 45.5 rushing yards",
    edge: "If your number is a lot lower, the under gets worse.",
    caveats: ["If your number is a lot lower, the under gets worse."],
  },
};

test("dak is a named hit when it is the only 3-letter first name", () => {
  const hits = nflAskNamedPlayerHits(
    "best player props for cowboys vs commanders? dak, pickens, javonte williams",
  );
  assert.ok(hits.tokens.includes("dak"));
  assert.ok(hits.teams.has("DAL"));
});

test("what kills this edge stays on the prior ticket", () => {
  assert.equal(classifyNflAskFollowUp("What kills this edge?", [prior]), "explain_kill");
  const take = buildNflFollowUpHoldTake("What kills this edge?", [prior]);
  assert.match(String(take.lean), /Williams under 45\.5/i);
  assert.match(String(take.whyNow), /Kills it:/i);
  assert.match(String(take.whyNow), /lot lower/i);
  assert.doesNotMatch(String(take.call), /PASS/i);
});

test("parlay chip does not invent a new primary", () => {
  const take = buildNflFollowUpHoldTake("Build a parlay around this.", [prior]);
  assert.match(String(take.lean), /pass on the parlay/i);
  assert.match(String(take.whyNow), /Williams under 45\.5/i);
});

test("under instead flips an over onto the same number", () => {
  const overPrior = {
    ...prior,
    structured: {
      ...prior.structured,
      call: "WILLIAMS OVER 45.5",
      lean: "Lean: Williams over 45.5 rushing yards.",
    },
  };
  assert.equal(classifyNflAskFollowUp("under instead", [overPrior]), "flip_side");
  const take = buildNflFollowUpHoldTake("under instead", [overPrior]);
  assert.match(String(take.lean), /Williams under 45\.5/i);
  assert.match(String(take.call), /UNDER 45\.5/);
});

test("what about dak continues the prop thread", () => {
  assert.equal(classifyNflAskFollowUp("what about dak?", [prior]), "continue_player");
});

test("a few more stays a refresh", () => {
  assert.equal(classifyNflAskFollowUp("a few more", [prior]), "refresh");
});

test("odd follow-up stays on the prior ticket", () => {
  assert.equal(classifyNflAskFollowUp("you sure about that?", [prior]), "hold_context");
  const take = buildNflFollowUpHoldTake("you sure about that?", [prior]);
  assert.match(String(take.lean), /Williams under 45\.5/i);
  assert.match(String(take.whyNow), /Same ticket/i);
  assert.match(String(take.call), /UNDER 45\.5/);
});

test("a new player or a new number leaves the ticket", () => {
  assert.equal(classifyNflAskFollowUp("Mahomes tonight", [prior]), null);
  assert.equal(classifyNflAskFollowUp("Lamb over 62.5", [prior]), null);
  assert.equal(classifyNflAskFollowUp("chiefs tonight", [prior]), null);
});

test("an NBA under is not an NFL ticket", () => {
  const nba = {
    role: "assistant",
    sport: "nba",
    structured: {
      sport: "NBA",
      call: "UNDER 224.5",
      callType: "total",
      lean: "Lean: under 224.5.",
    },
  };
  assert.equal(classifyNflAskFollowUp("you sure about that?", [nba]), null);
  assert.equal(buildNflFollowUpHoldTake("you sure about that?", [nba]), null);
});

test("a new total still leaves the prop ticket", () => {
  assert.equal(
    classifyNflAskFollowUp("On CAR @ ATL, the total is 43.5. Over, under, or pass?", [prior]),
    null,
  );
});
