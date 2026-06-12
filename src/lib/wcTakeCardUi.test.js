import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcTakeStatGrid,
  pickWcThePlayLine,
  pickWcCardHeadline,
  pickWcFocusWhyLine,
  wcCardSectionText,
  compressWcCardSections,
  prepareWcCardFaceDisplay,
  wcLineSlotIsNumericDelta,
} from "./wcTakeCardUi.js";

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

test("prepareWcCardFaceDisplay keeps one numeric why on focus layout", () => {
  const face = prepareWcCardFaceDisplay({
    lean: "Lean over 3 at -135",
    call: "Lean over 3 at -135",
    why: "Over 3 at -135 (~57% implied) — nearest posted line to your ask.",
    watchFor: "Watch Korea's shape when they chase — volume spikes late.",
    breakdown: "Over 1 · -450 · juice\nOver 3 · -135 · worth paying ✓",
    focusLayout: true,
  });
  assert.match(face.sections.why, /-135/);
  assert.equal(face.sections.watchFor, "");
  assert.match(face.breakdownText, /Korea/);
});

test("wcLineSlotIsNumericDelta rejects path prose", () => {
  assert.equal(
    wcLineSlotIsNumericDelta(
      "Paraguay needs a top-two finish in Group D — the path is not finishing last on points behind Türkiye.",
    ),
    false,
  );
  assert.equal(wcLineSlotIsNumericDelta("Market ~42.1% · UR sim 58.3% · delta +16.2pt."), true);
});

test("buildWcTakeStatGrid group_slate hides path prose from line slot", () => {
  const grid = buildWcTakeStatGrid({
    callType: "group_slate",
    line: "Paraguay needs a top-two finish in Group D — the path is not finishing last on points behind Türkiye.",
    confidence: "Medium",
  });
  assert.equal(grid.slots.length, 1);
  assert.equal(grid.slots[0].label, "Confidence");
});

test("pickWcCardHeadline shortens misprice lean to actionable play", () => {
  const headline = pickWcCardHeadline({
    callType: "group_slate",
    lean: "Lean: Group D — USA advancement misprice (-36.0pt sim vs market).",
  });
  assert.equal(headline, "USA to advance in Group D");
});

test("pickWcFocusWhyLine compresses sim vs market to one line", () => {
  const line = pickWcFocusWhyLine(
    "The market prices USA to advance at 88.2% implied, but UR sims put the escape path at 51.9% (-36.3pt).",
  );
  assert.match(line, /Market 88\.2%/);
  assert.match(line, /UR sim 51\.9%/);
  assert.match(line, /-36\.3pt/);
});

test("prepareWcCardFaceDisplay focus mode hides watch for on card face", () => {
  const face = prepareWcCardFaceDisplay({
    lean: "Lean: USA to advance in Group D at -750",
    call: "Group D — USA advancement misprice",
    why: "The market prices USA to advance at 88.2% implied, but UR sims put the escape path at 51.9% (-36.3pt).",
    watchFor: "If United States advance odds drift wider than -750, pass.",
    focusLayout: true,
    callType: "group_slate",
  });
  assert.equal(face.sections.watchFor, "");
  assert.match(face.sections.why, /88\.2%/);
  assert.match(face.breakdownText, /drift wider than -750/);
});
