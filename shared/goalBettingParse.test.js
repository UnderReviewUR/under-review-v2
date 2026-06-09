import assert from "node:assert/strict";
import test from "node:test";
import { getGoalBettingPage } from "./goalBettingRegistry.js";
import {
  parseGoalBettingPage,
  parseGoalLabeledFutures,
  parseGoalMarkdownTables,
} from "./goalBettingParse.js";

const GOLDEN_BALL_SNIPPET = `
| Player | National Team | Position | Odds | Key Note |
| --- | --- | --- | --- | --- |
| Harry Kane | England | Forward | +700 | Ballon d'Or favorite |
| Lamine Yamal | Spain | Winger | +800 | Teen sensation |
`;

const WINNER_SNIPPET = `
| Team | Confederation | Odds | Notes |
| --- | --- | --- | --- |
| Spain | Europe | +450 | Tournament favorites |
| France | Europe | +450 | Elite depth |
`;

const USMNT_SNIPPET = `
World Cup Winner Odds

+4000

To Make the Quarterfinals

+240

To Top Group D

+130
`;

test("parseGoalMarkdownTables — player odds table", () => {
  const rows = parseGoalMarkdownTables(GOLDEN_BALL_SNIPPET, {
    nameColumnNames: ["player"],
    oddsColumnNames: ["odds"],
  });
  assert.ok(rows.length >= 2);
  assert.equal(rows[0].label, "Harry Kane");
  assert.equal(rows[0].odds, "+700");
});

test("parseGoalMarkdownTables — team winner table", () => {
  const rows = parseGoalMarkdownTables(WINNER_SNIPPET, {
    nameColumnNames: ["team"],
    oddsColumnNames: ["odds"],
  });
  assert.equal(rows[0].label, "Spain");
  assert.equal(rows[0].odds, "+450");
});

test("parseGoalLabeledFutures — USMNT advancement ladder", () => {
  const rows = parseGoalLabeledFutures(USMNT_SNIPPET);
  assert.ok(rows.some((r) => r.label.includes("World Cup Winner")));
  assert.ok(rows.some((r) => r.odds === "+4000"));
});

test("parseGoalBettingPage — golden_ball market config", () => {
  const page = getGoalBettingPage("golden_ball");
  assert.ok(page);
  const parsed = parseGoalBettingPage(GOLDEN_BALL_SNIPPET, page);
  assert.equal(parsed.ok, true);
  assert.ok(parsed.rows.length >= 2);
});
