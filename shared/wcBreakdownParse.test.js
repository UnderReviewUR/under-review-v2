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

test("parseWcBreakdownSections extracts labeled group-slate deep blocks", () => {
  const text = `Sim vs market: The market implies DR Congo is 50.0% to advance, but UR sims put it at 23.6% (-26.4pt).

Runner-up gap: Group J — ALG is 75.6% market vs 50.1% sim (-25.5pt).

Book line: +100 · DraftKings · Jun 13.

Group K is four teams: Portugal (Favorite), Colombia (Contender), Uzbekistan and DR Congo (Longshots).

Path: DR Congo needs a top-two finish in Group K — the path is not finishing last on points behind Portugal.

Wins-if: DR Congo finishes top two in Group K with points on the board before Portugal locks the table.

Dies-if: DR Congo drops points to a longshot in the opener or trails Portugal by three+ after two games.

WATCH FOR: If DR Congo advance odds drift wider than +100, pass.`;
  const { preamble, sections } = parseWcBreakdownSections(text);
  assert.equal(preamble, "");
  assert.ok(sections.length >= 7);
  assert.equal(sections.find((s) => s.key === "simVsMarket")?.label, "Sim vs market");
  assert.equal(sections.find((s) => s.key === "runnerUp")?.label, "Runner-up gap");
  assert.equal(sections.find((s) => s.key === "winsIf")?.label, "Wins if");
  assert.equal(sections.find((s) => s.key === "watchFor")?.label, "Watch for");
});

test("parseWcBreakdownSections extracts NBA scannable labels", () => {
  const text = `Sharp angle: Mitchell Under 28.5 is the clearest edge.
Context: Cleveland pushes pace when Garland sits.
The Play: Under 28.5 points at -115.
Watch for: Confirmed starting lineup 90 minutes before tip.`;
  const { sections } = parseWcBreakdownSections(text);
  assert.ok(sections.length >= 4);
  assert.equal(sections.find((s) => s.key === "sharpAngle")?.label, "Sharp angle");
  assert.equal(sections.find((s) => s.key === "thePlay")?.label, "The play");
});
