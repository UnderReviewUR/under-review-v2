import assert from "node:assert/strict";
import test from "node:test";
import { buildWcTakeStatGrid, pickWcThePlayLine, wcCardSectionText, compressWcCardSections } from "./wcTakeCardUi.js";

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

test("pickWcThePlayLine hides duplicate play for advancement when line slot set", () => {
  const line =
    "Pass at current odds; the group path is tight and knockout advancement requires both escaping Group D.";
  assert.equal(
    pickWcThePlayLine({
      callType: "advancement",
      headline: "USA reaches Round of 16 in roughly 15% of sims",
      lean: line,
      call: line,
      lineSlot: line,
    }),
    "",
  );
});

test("buildWcTakeStatGrid advancement uses structured line", () => {
  const grid = buildWcTakeStatGrid({
    callType: "advancement",
    call: "USA R16 reach mispriced",
    line: "Pass at -130 — sim 15% vs market 57%.",
    confidence: "Medium",
  });
  assert.equal(grid.slots[0].value, "Pass at -130 — sim 15% vs market 57%.");
});

test("compressWcCardSections drops why when it repeats line slot", () => {
  const line =
    "Colombia needs a top-two finish in Group K — the path is not finishing last on points behind Portugal.";
  const why =
    "Group K is four teams: Portugal (Favorite), Colombia (Contender), Uzbekistan and DR Congo (Longshots). " +
    line;
  const out = compressWcCardSections({
    callType: "group_slate",
    headline: "Colombia in Group K — best group-stage value (to advance)",
    lineSlot: line,
    why,
    watchFor: "Watch the Portugal vs Colombia opener — a point or better for Colombia should tighten advance prices.",
    thePlay: "",
  });
  assert.match(out.why, /Group K is four teams/);
  assert.doesNotMatch(out.why, /top-two finish/);
  assert.ok(out.watchFor);
});

test("wcCardSectionText drops empty placeholders", () => {
  assert.equal(wcCardSectionText("—"), "");
  assert.equal(wcCardSectionText("Watch the left channel"), "Watch the left channel");
});
