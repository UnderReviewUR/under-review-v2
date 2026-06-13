import assert from "node:assert/strict";
import test from "node:test";
import {
  groupWcBreakdownSectionsIntoBlocks,
  parseWcBreakdownSections,
} from "./wcBreakdownParse.js";

test("parseWcBreakdownSections keeps each slate match as its own block", () => {
  const deep = `Today's World Cup slate (2026-06-13) — 2 matches

Match: Qatar vs Switzerland (Group B)

Kickoff: Fri 6:00 PM ET

Book: Qatar +1300 · Draw +600 · Switzerland -475

UR sim: Qatar 7% · Draw 14% · Switzerland 79%

Pick: Switzerland to win (-475 ML · UR sim 79% win)

Match: Brazil vs Morocco (Group C)

Kickoff: Fri 9:00 PM ET

Book: Brazil -150 · Draw +275 · Morocco +450

UR sim: Brazil 57% · Draw 26% · Morocco 17%

Pick: Brazil to win (-150 ML · UR sim 57% win)`;

  const { sections } = parseWcBreakdownSections(deep);
  const matchSections = sections.filter((s) => s.key === "match");
  assert.equal(matchSections.length, 2);
  assert.match(matchSections[0].body, /Qatar vs Switzerland/);
  assert.match(matchSections[1].body, /Brazil vs Morocco/);
  assert.doesNotMatch(matchSections[0].body, /Brazil vs Morocco/);

  const blocks = groupWcBreakdownSectionsIntoBlocks(sections);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].length, 5);
  assert.equal(blocks[1][0].key, "match");
});
