import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDisplayTakeawayCall,
  extractOverUnderMarket,
  extractPlayerBeforeOverUnder,
  isBadFragmentHead,
} from "./urTakeFinalTakeawayCall.js";

test("isBadFragmentHead flags margin-style stat fragments without Over/Under", () => {
  assert.equal(isBadFragmentHead("5 points"), true);
  assert.equal(isBadFragmentHead("8 assists"), true);
  assert.equal(isBadFragmentHead("Mitchell over 24.5 points"), false);
  assert.equal(isBadFragmentHead("Lean Celtics ML"), false);
});

test("buildDisplayTakeawayCall leaves a proper headline unchanged", () => {
  const call =
    "Mitchell over 24.5 points is the angle — Cleveland’s offense should run through him late, and Detroit’s perimeter defense is vulnerable.";
  assert.equal(buildDisplayTakeawayCall(call, "EDGE TEXT", "prop", "NBA"), call);
});

test("buildDisplayTakeawayCall rebuilds margin fragment using edge player + market", () => {
  const call = `5 points \u2014 Cleveland's offense should run through Mitchell late.`;
  const edge =
    "Donovan Mitchell over 26.5 points has a clean path: Detroit bleeds perimeter production when they switch everything late.";
  const out = buildDisplayTakeawayCall(call, edge, "prop", "NBA");
  assert.match(out, /^Mitchell over 26\.5 points is the angle —/);
  assert.ok(out.includes("Cleveland"));
});

test("buildDisplayTakeawayCall uses player + generic points-over when line missing", () => {
  const call = `7 pts \u2014 pace should stay high enough for extra possessions.`;
  const edge =
    "Donovan Mitchell should see heavy usage in a tight game; Cleveland trusts him to create late.";
  const out = buildDisplayTakeawayCall(call, edge, "prop", "NBA");
  assert.match(out, /^Mitchell points over is the call —/);
});

test("buildDisplayTakeawayCall skips parlay calls", () => {
  const call = "2-leg SGP — correlation risk on the same game script.";
  assert.equal(buildDisplayTakeawayCall(call, "", "parlay", "NBA"), call);
});

test("extractOverUnderMarket parses optional stat word", () => {
  const m = extractOverUnderMarket("We like Cade Cunningham over 8.5 assists in pace-up spots.");
  assert.deepEqual(m, { side: "over", line: "8.5", stat: "assists" });
});

test("extractPlayerBeforeOverUnder grabs name before Over/Under", () => {
  const p = extractPlayerBeforeOverUnder("Something something Cade Cunningham over 8.5 assists");
  assert.equal(p, "Cade Cunningham");
});
