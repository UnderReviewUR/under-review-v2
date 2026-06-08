import assert from "node:assert/strict";
import test from "node:test";
import { buildWcTakeStatGrid, pickWcThePlayLine, wcCardSectionText } from "./wcTakeCardUi.js";

test("buildWcTakeStatGrid uses line slot instead of truncating headline", () => {
  const headline =
    "Bruno Fernandes recording 7 assists in a single World Cup tournament is structurally implausible — Portugal's group strength and likely knockout run don't support that volume.";
  const grid = buildWcTakeStatGrid({
    call: headline,
    line: "Sims show 44.85% to reach the quarterfinals and 8.39% to reach the final.",
    lean: "Pass — this prop is not worth pricing until confirmed lineups emerge.",
    confidence: "Speculative",
    callType: "player_prop",
  });
  assert.equal(grid.slots.length, 2);
  assert.equal(grid.slots[0].label, "Line");
  assert.match(grid.slots[0].value, /44\.85%/);
  assert.doesNotMatch(grid.slots[0].value, /structur$/);
});

test("buildWcTakeStatGrid omits duplicate headline when only play differs", () => {
  const headline = "Market has the name — France's path is what books underprice.";
  const grid = buildWcTakeStatGrid({
    call: headline,
    lean: "Pass at +600 — fair favorite.",
    confidence: "Speculative",
    callType: "single",
  });
  assert.ok(grid.slots.some((s) => s.label === "Play"));
  assert.ok(!grid.slots.some((s) => s.value.includes("structur")));
});

test("pickWcThePlayLine prefers lean when distinct from headline", () => {
  const headline = "Brazil value at +800";
  const play = pickWcThePlayLine({
    headline,
    lean: "Lean: Brazil outright +800 — group winner path is clean",
    call: headline,
  });
  assert.match(play, /Lean: Brazil/);
});

test("wcCardSectionText drops empty placeholders", () => {
  assert.equal(wcCardSectionText("—"), "");
  assert.equal(wcCardSectionText("Watch the left channel"), "Watch the left channel");
});
