import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcFixturePlayerParlayStructured,
  buildWcPlayerParlayPassStructured,
} from "./wcPlayerMarketResolve.js";
import {
  buildWcThreadParlayStructured,
  ensureWcParlayStructuredLean,
  isWcScorerTotalsSgpQuestion,
  resolveWcParlayPassLegCount,
  shouldBuildWcThreadParlay,
} from "./wcThreadParlayPrebuilt.js";

function mockProps() {
  return {
    eventId: "99",
    homeTeam: "EGY",
    awayTeam: "AUS",
    lastUpdated: Date.now(),
    markets: {
      anytime_scorer: [
        { name: "Mohamed Salah", americanOdds: "+181", nationAbbr: "EGY" },
        { name: "Mathew Leckie", americanOdds: "+450", nationAbbr: "AUS" },
      ],
      player_sot_ou: [
        { name: "Mohamed Salah", americanOdds: "-159", line: "0.5", side: "over", nationAbbr: "EGY" },
        { name: "Jackson Irvine", americanOdds: "+220", line: "0.5", side: "over", nationAbbr: "AUS" },
      ],
    },
  };
}

test("isWcScorerTotalsSgpQuestion detects scorer + total combo", () => {
  assert.equal(isWcScorerTotalsSgpQuestion("Parlay: Salah scorer + over 1.5 goals?"), true);
  assert.equal(isWcScorerTotalsSgpQuestion("4 player parlay for AUS vs EGY?"), false);
});

test("resolveWcParlayPassLegCount uses 2 for scorer + totals SGP", () => {
  assert.equal(resolveWcParlayPassLegCount("Parlay: Salah scorer + over 1.5 goals?"), 2);
  assert.equal(resolveWcParlayPassLegCount("4 player parlay for AUS vs EGY?"), 4);
});

test("shouldBuildWcThreadParlay routes scorer + totals without prior thread lean", () => {
  assert.equal(
    shouldBuildWcThreadParlay("Parlay: Salah scorer + over 1.5 goals?", [], "PARLAY"),
    true,
  );
});

test("buildWcThreadParlayStructured builds 2-leg SGP from posted props", () => {
  const kv = { wcEventId: "99", matchPlayerProps: mockProps() };
  const structured = buildWcThreadParlayStructured(
    "Parlay: Salah scorer + over 1.5 goals?",
    [],
    "verified",
    kv,
    { requiredEntities: ["EGY", "AUS"], wcEventId: "99" },
  );
  assert.ok(structured);
  assert.match(String(structured.call || ""), /2-leg SGP/i);
  assert.equal(structured.parlayLegs?.length, 2);
  assert.match(String(structured.parlayLegs?.[0]?.play || ""), /Salah/i);
});

test("buildWcFixturePlayerParlayStructured skips scorer + totals SGP asks", () => {
  const kv = { wcEventId: "99", matchPlayerProps: mockProps() };
  const structured = buildWcFixturePlayerParlayStructured(
    "Parlay: Salah scorer + over 1.5 goals?",
    "verified",
    kv,
    { requiredEntities: ["EGY", "AUS"] },
  );
  assert.equal(structured, null);
});

test("buildWcPlayerParlayPassStructured labels SGP pass as 2-leg", () => {
  const structured = buildWcPlayerParlayPassStructured("Parlay: Salah scorer + over 1.5 goals?");
  assert.match(String(structured.lean || ""), /2-leg/i);
  assert.doesNotMatch(String(structured.lean || ""), /4-leg/i);
});

test("ensureWcParlayStructuredLean rebuilds numbered lean from legs", () => {
  const repaired = ensureWcParlayStructuredLean({
    callType: "parlay",
    lean: "",
    parlayLegs: [
      { play: "Mohamed Salah over 0.5 shots on target", odds: "-159" },
      { play: "Jackson Irvine over 0.5 shots on target", odds: "+220" },
    ],
  });
  assert.match(String(repaired.lean || ""), /^1\./);
  assert.match(String(repaired.lean || ""), /Salah/);
});
