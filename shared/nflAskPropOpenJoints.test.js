import assert from "node:assert/strict";
import test from "node:test";
import {
  nflOpenJointLift,
  detectNflSamePlayerJointConflicts,
  nflMarketToOpenPropType,
} from "./nflAskPropOpenJoints.js";
import { detectNflBoardScriptConflicts } from "./nflAskPropBoardElite.js";

test("rec yards × receptions has strong over lift", () => {
  const lift = nflOpenJointLift("receiving_yards", "receptions");
  assert.ok(lift);
  assert.ok(lift.liftOver >= 1.5);
});

test("nflMarketToOpenPropType maps Ask keys", () => {
  assert.equal(nflMarketToOpenPropType("rec_yds"), "receiving_yards");
  assert.equal(nflMarketToOpenPropType("rush_yds"), "rushing_yards");
});

test("same-player rec+receptions Overs flag joint conflict", () => {
  const notes = detectNflSamePlayerJointConflicts(
    [
      { row: { player: "CeeDee Lamb", propRaw: "receiving_yards" }, side: "Over", market: "rec_yds" },
      { row: { player: "CeeDee Lamb", propRaw: "receptions" }, side: "Over", market: "receptions" },
    ],
    (row) => String(row.propRaw || ""),
  );
  assert.equal(notes.length, 1);
  assert.match(notes[0], /lift/i);
});

test("detectNflBoardScriptConflicts includes joint notes", () => {
  const notes = detectNflBoardScriptConflicts([
    { row: { player: "Bijan Robinson", team: "ATL", propRaw: "rushing_yards" }, side: "Over", market: "rush_yds" },
    {
      row: { player: "Bijan Robinson", team: "ATL", propRaw: "rushing_attempts" },
      side: "Over",
      market: "rushing_attempts",
    },
  ]);
  assert.ok(notes.some((n) => /lift/i.test(n) || /move together/i.test(n)));
});
