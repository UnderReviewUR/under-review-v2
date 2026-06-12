import assert from "node:assert/strict";
import test from "node:test";
import { dedupeWcBreakdownParagraphs, parseWcBreakdownSections } from "./wcBreakdownParse.js";

test("dedupeWcBreakdownParagraphs removes repeated watch-for block", () => {
  const watch =
    "Watch for confirmed Canada starting XI before locking a scorer leg — lineup status still pending.";
  const out = dedupeWcBreakdownParagraphs(`Intro.\n\n${watch}\n\n${watch}`);
  assert.equal(out.split("Watch for").length - 1, 1);
});

test("parseWcBreakdownSections extracts wins-if dies-if watch-for", () => {
  const text = `Canada controls the ball but Bosnia sits deep.
Wins-if: Canada wins 1-0 or 2-0 with the game staying tight.
Dies-if: Bosnia scores first and Canada chases.
WATCH FOR: Confirmed Canada starting XI before locking props.`;
  const { preamble, sections } = parseWcBreakdownSections(text);
  assert.match(preamble, /Canada controls/i);
  assert.equal(sections.length, 3);
  assert.equal(sections[0].label, "Wins if");
  assert.match(sections[0].body, /1-0 or 2-0/);
  assert.equal(sections[1].label, "Dies if");
  assert.equal(sections[2].label, "Watch for");
});
