import assert from "node:assert/strict";
import test from "node:test";
import {
  formatWcMatchGroupLetter,
  resolveWcMatchGroupLetter,
} from "./wcMatchFieldDisplay.js";

test("formatWcMatchGroupLetter — bracket-wrapped letter", () => {
  assert.equal(formatWcMatchGroupLetter("[A]"), "A");
  assert.equal(formatWcMatchGroupLetter('["A"]'), "A");
  assert.equal(formatWcMatchGroupLetter("Group A"), "A");
});

test("formatWcMatchGroupLetter — rejects stray bracket", () => {
  assert.equal(formatWcMatchGroupLetter("["), "");
  assert.equal(formatWcMatchGroupLetter("[object Object]"), "");
});

test("resolveWcMatchGroupLetter — falls back to team roster", () => {
  const letter = resolveWcMatchGroupLetter(
    { group: "[", homeTeam: "KOR", awayTeam: "CZE" },
    [
      { abbreviation: "KOR", group: "A" },
      { abbreviation: "CZE", group: "F" },
    ],
  );
  assert.equal(letter, "A");
});
